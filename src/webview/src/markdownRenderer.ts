import MarkdownIt from 'markdown-it';
import type Renderer from 'markdown-it/lib/renderer.mjs';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import hljs from 'highlight.js/lib/common';
import footnote from 'markdown-it-footnote';

export type MarkdownRenderSection = {
  key: string;
  html: string;
  headingId: string | null;
};

const maxCachedSections = 240;

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight: (source, language) => {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(source, { language }).value;
    }

    return escapeHtml(source);
  }
});

markdown.enable(['table', 'strikethrough']);
markdown.use(taskListPlugin);
markdown.use(footnote);
applyFootnoteContinuations(markdown);
applyHeadingIds(markdown);
applyLinkSecurity(markdown.renderer);
applyCodeCopyRenderer(markdown.renderer);

export function renderMarkdown(source: string): string {
  return markdown.render(source, {
    source
  });
}

export function createMarkdownSectionRenderer(): (source: string) => MarkdownRenderSection[] {
  const cache = new Map<string, MarkdownRenderSection>();

  return (source: string) => renderMarkdownSections(source, cache);
}

export function renderMarkdownSections(
  source: string,
  cache = new Map<string, MarkdownRenderSection>()
): MarkdownRenderSection[] {
  const env = {
    source
  };
  const tokens = markdown.parse(source, env);
  const tokenSections = splitTopLevelSections(tokens);

  return tokenSections.map((sectionTokens, index) => {
    const signature = createSectionSignature(sectionTokens, index);
    const cached = cache.get(signature);

    if (cached) {
      return cached;
    }

    const renderedSection: MarkdownRenderSection = {
      key: signature,
      html: markdown.renderer.render(sectionTokens, markdown.options, env),
      headingId: findSectionHeadingId(sectionTokens)
    };

    cache.set(signature, renderedSection);
    trimSectionCache(cache);
    return renderedSection;
  });
}

export function createHeadingId(text: string, fallbackIndex = 0): string {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || `section-${fallbackIndex + 1}`;
}

function taskListPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'markui_task_lists', (state: StateCore) => {
    const tokens = state.tokens;

    for (let index = 2; index < tokens.length; index += 1) {
      if (tokens[index].type !== 'inline') {
        continue;
      }

      const paragraphToken = tokens[index - 1];
      const listItemToken = tokens[index - 2];

      if (paragraphToken.type !== 'paragraph_open' || listItemToken.type !== 'list_item_open') {
        continue;
      }

      const inlineToken = tokens[index];
      const match = inlineToken.content.match(/^\[([ xX])\]\s+/);

      if (!match) {
        continue;
      }

      const checked = match[1].toLowerCase() === 'x';
      inlineToken.content = inlineToken.content.slice(match[0].length);
      removeTaskMarkerFromInlineChildren(inlineToken.children ?? [], match[0].length);

      const checkboxToken = new state.Token('html_inline', '', 0);
      checkboxToken.content = `<input class="task-list-item-checkbox" type="checkbox" disabled${checked ? ' checked' : ''}> `;
      inlineToken.children?.unshift(checkboxToken);

      attrJoinUnique(listItemToken, 'class', 'task-list-item');
      markParentList(tokens, index);
    }
  });
}

function removeTaskMarkerFromInlineChildren(children: Token[], markerLength: number): void {
  let remainingLength = markerLength;

  while (remainingLength > 0 && children.length > 0) {
    const firstChild = children[0];

    if (firstChild.type !== 'text') {
      children.shift();
      continue;
    }

    if (firstChild.content.length <= remainingLength) {
      remainingLength -= firstChild.content.length;
      children.shift();
      continue;
    }

    firstChild.content = firstChild.content.slice(remainingLength);
    remainingLength = 0;
  }
}

function markParentList(tokens: Token[], inlineIndex: number): void {
  for (let index = inlineIndex; index >= 0; index -= 1) {
    const token = tokens[index];

    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      attrJoinUnique(token, 'class', 'task-list');
      return;
    }
  }
}

function attrJoinUnique(token: Token, name: string, value: string): void {
  const values = new Set((token.attrGet(name) ?? '').split(/\s+/).filter(Boolean));
  values.add(value);
  token.attrSet(name, Array.from(values).join(' '));
}

function applyFootnoteContinuations(md: MarkdownIt): void {
  md.core.ruler.after('footnote_tail', 'markui_footnote_continuations', (state: StateCore) => {
    let footnoteDepth = 0;

    state.tokens.forEach((token) => {
      if (token.type === 'footnote_open') {
        footnoteDepth += 1;
        return;
      }

      if (token.type === 'footnote_close') {
        footnoteDepth = Math.max(0, footnoteDepth - 1);
        return;
      }

      if (footnoteDepth === 0 || token.type !== 'inline' || !token.children) {
        return;
      }

      token.children = wrapFootnoteSoftbreaks(token.children, state);
    });
  });
}

function wrapFootnoteSoftbreaks(children: Token[], state: StateCore): Token[] {
  const nextChildren: Token[] = [];
  let continuationOpen = false;

  children.forEach((child) => {
    if (child.type !== 'softbreak') {
      nextChildren.push(child);
      return;
    }

    if (continuationOpen) {
      nextChildren.push(createHtmlInlineToken(state, '</span>'));
    }

    nextChildren.push(createHtmlInlineToken(state, '<br><span class="footnote-continuation">'));
    continuationOpen = true;
  });

  if (continuationOpen) {
    nextChildren.push(createHtmlInlineToken(state, '</span>'));
  }

  return nextChildren;
}

function createHtmlInlineToken(state: StateCore, content: string): Token {
  const token = new state.Token('html_inline', '', 0);
  token.content = content;
  return token;
}

function applyLinkSecurity(renderer: Renderer): void {
  const defaultRender = renderer.rules.link_open ?? ((tokens, index, options, _env, self) => {
    return self.renderToken(tokens, index, options);
  });

  renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const href = token.attrGet('href') ?? '';

    token.attrSet('href', normalizeUrl(href));
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noreferrer noopener');

    return defaultRender(tokens, index, options, env, self);
  };
}

function applyHeadingIds(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'markui_heading_ids', (state: StateCore) => {
    state.tokens.forEach((token, index, tokens) => {
      if (token.type !== 'heading_open') {
        return;
      }

      const inlineToken = tokens[index + 1];
      const headingText = inlineToken?.content ?? '';

      token.attrSet('id', createHeadingId(headingText, index));
    });
  });
}

function applyCodeCopyRenderer(renderer: Renderer): void {
  renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/)[0];
    const highlighted = language && hljs.getLanguage(language)
      ? hljs.highlight(token.content, { language }).value
      : escapeHtml(token.content);
    const encodedSource = encodeURIComponent(token.content);

    return [
      '<div class="code-copy-wrap">',
      '<button class="code-copy-button" type="button" data-code="',
      encodedSource,
      '" aria-label="코드 블록 복사">복사</button>',
      '<pre><code',
      language ? ` class="language-${escapeHtml(language)}"` : '',
      '>',
      highlighted,
      '</code></pre>',
      '</div>'
    ].join('');
  };

  renderer.rules.code_block = (tokens, index, _options, env) => {
    const token = tokens[index];
    const copySource = getOriginalIndentedCode(token, env) ?? token.content;
    const encodedSource = encodeURIComponent(copySource);

    return [
      '<div class="code-copy-wrap indented-code-wrap">',
      '<button class="code-copy-button" type="button" data-code="',
      encodedSource,
      '" aria-label="코드 블록 복사">복사</button>',
      '<pre><code>',
      escapeHtml(token.content),
      '</code></pre>',
      '</div>'
    ].join('');
  };
}

function getOriginalIndentedCode(token: Token, env: unknown): string | undefined {
  if (!token.map || !env || typeof env !== 'object' || !('source' in env) || typeof env.source !== 'string') {
    return undefined;
  }

  const [startLine, endLine] = token.map;
  return env.source.split(/\r?\n/).slice(startLine, endLine).join('\n');
}

function normalizeUrl(value: string): string {
  if (/^(https?:|mailto:|#)/i.test(value)) {
    return value;
  }

  return '#';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function splitTopLevelSections(tokens: Token[]): Token[][] {
  const sections: Token[][] = [];
  let currentSection: Token[] = [];

  tokens.forEach((token) => {
    if (isTopLevelHeadingOpen(token) && currentSection.length > 0) {
      sections.push(currentSection);
      currentSection = [];
    }

    currentSection.push(token);
  });

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

function isTopLevelHeadingOpen(token: Token): boolean {
  return token.type === 'heading_open' && token.level === 0;
}

function createSectionSignature(tokens: Token[], index: number): string {
  const content = tokens
    .map((token) => [
      token.type,
      token.tag,
      token.nesting,
      token.level,
      token.markup,
      token.info,
      token.content,
      token.attrs?.map(([name, value]) => `${name}=${value}`).join('&') ?? ''
    ].join('\u001f'))
    .join('\u001e');

  return `${findSectionHeadingId(tokens) ?? `section-${index + 1}`}-${hashString(content)}`;
}

function findSectionHeadingId(tokens: Token[]): string | null {
  const headingToken = tokens.find(isTopLevelHeadingOpen);

  return headingToken?.attrGet('id') ?? null;
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function trimSectionCache(cache: Map<string, MarkdownRenderSection>): void {
  while (cache.size > maxCachedSections) {
    const oldestKey = cache.keys().next().value;

    if (!oldestKey) {
      return;
    }

    cache.delete(oldestKey);
  }
}
