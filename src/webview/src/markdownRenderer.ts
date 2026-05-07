import MarkdownIt from 'markdown-it';
import type Renderer from 'markdown-it/lib/renderer.mjs';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import hljs from 'highlight.js/lib/common';
import footnote from 'markdown-it-footnote';

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
applyLinkSecurity(markdown.renderer);
applyHeadingIds(markdown.renderer);
applyCodeCopyRenderer(markdown.renderer);

export function renderMarkdown(source: string): string {
  return markdown.render(source);
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

function applyHeadingIds(renderer: Renderer): void {
  const defaultRender = renderer.rules.heading_open ?? ((tokens, index, options, _env, self) => {
    return self.renderToken(tokens, index, options);
  });

  renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const inlineToken = tokens[index + 1];
    const headingText = inlineToken?.content ?? '';

    tokens[index].attrSet('id', createHeadingId(headingText, index));

    return defaultRender(tokens, index, options, env, self);
  };
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
      '" aria-label="코드블록 복사">복사</button>',
      '<pre><code',
      language ? ` class="language-${escapeHtml(language)}"` : '',
      '>',
      highlighted,
      '</code></pre>',
      '</div>'
    ].join('');
  };

  renderer.rules.code_block = (tokens, index) => {
    const source = tokens[index].content;
    const encodedSource = encodeURIComponent(source);

    return [
      '<div class="code-copy-wrap">',
      '<button class="code-copy-button" type="button" data-code="',
      encodedSource,
      '" aria-label="코드블록 복사">복사</button>',
      '<pre><code>',
      escapeHtml(source),
      '</code></pre>',
      '</div>'
    ].join('');
  };
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
