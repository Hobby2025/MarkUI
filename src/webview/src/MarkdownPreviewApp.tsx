import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Tile } from '@carbon/react/es/components/Tile/Tile.js';
import Header from '@carbon/react/es/components/UIShell/Header.js';
import HeaderName from '@carbon/react/es/components/UIShell/HeaderName.js';
import { Document } from '@carbon/icons-react';
import { getVscodeApi } from './vscodeApi';
import { createHeadingId, createMarkdownSectionRenderer } from './markdownRenderer';
import type { MarkdownRenderSection } from './markdownRenderer';
import 'highlight.js/styles/github-dark.css';

type PreviewDocument = {
  fileName: string;
  metadata: PreviewMetadata;
  text: string;
};

type PreviewMetadata = {
  author: string;
  createdAt: string;
  updatedAt: string;
};

type ExtensionMessage =
  | {
      type: 'document';
      payload: PreviewDocument;
    };

type DocumentPage = {
  title: string;
  lead: string;
  body: string;
  outline: OutlineItem[];
};

type OutlineItem = {
  id: string;
  level: number;
  text: string;
};

type OutlineNode = OutlineItem & {
  children: OutlineNode[];
};

export function MarkdownPreviewApp(): ReactElement {
  const articleRef = useRef<HTMLElement | null>(null);
  const [document, setDocument] = useState<PreviewDocument>(() => {
    const savedState = getVscodeApi()?.getState();

    if (isPreviewDocument(savedState)) {
      return savedState;
    }

    return {
      fileName: 'Markdown 문서를 열어 주세요',
      metadata: createEmptyMetadata(),
      text: ''
    };
  });

  useEffect(() => {
    const vscodeApi = getVscodeApi();
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      if (event.data.type !== 'document') {
        return;
      }

      setDocument(event.data.payload);
      vscodeApi?.setState(event.data.payload);
    };

    window.addEventListener('message', handleMessage);
    vscodeApi?.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fileTitle = useMemo(() => getFileName(document.fileName), [document.fileName]);
  const renderMarkdownSections = useMemo(() => createMarkdownSectionRenderer(), []);
  const page = useMemo(() => createDocumentPage(document.text, fileTitle), [document.text, fileTitle]);
  const renderedMarkdownSections = useMemo(
    () => renderMarkdownSections(page.body),
    [page.body, renderMarkdownSections]
  );
  const hasDocument = document.text.trim().length > 0;

  useEffect(() => {
    const article = articleRef.current;

    if (!article) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement) || !target.classList.contains('code-copy-button')) {
        return;
      }

      const encodedCode = target.dataset.code;

      if (encodedCode) {
        getVscodeApi()?.postMessage({
          type: 'copyCode',
          payload: {
            text: decodeURIComponent(encodedCode)
          }
        });
        target.textContent = '복사됨';
        window.setTimeout(() => {
          target.textContent = '복사';
        }, 1200);
      }
    };

    article.addEventListener('click', handleClick);
    return () => article.removeEventListener('click', handleClick);
  }, [hasDocument]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest<HTMLAnchorElement>('.floating-outline a[href^="#"]');

      if (!link) {
        return;
      }

      const targetId = decodeURIComponent(link.hash.slice(1));
      const targetHeading = window.document.getElementById(targetId);

      if (!targetHeading) {
        return;
      }

      event.preventDefault();
      targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <main className="markui-document-shell">
      <Header aria-label={`${fileTitle} 미리보기`}>
        <HeaderName href="#markui-document" prefix={fileTitle}>
          미리보기
        </HeaderName>
        <DocumentMetadata metadata={document.metadata} />
      </Header>

      {hasDocument ? (
        <section
          className={`document-page${page.outline.length > 0 ? '' : ' document-page--plain'}`}
          id="markui-document"
          aria-label="Markdown 문서 미리보기"
        >
          {page.outline.length > 0 ? <FloatingOutline items={page.outline} /> : null}
          <div className="document-main">
            <header className="document-title-band">
              <p>Markdown document</p>
              <h1>{page.title}</h1>
              {page.lead ? <div className="document-lead">{page.lead}</div> : null}
            </header>

            <Tile className="document-card">
              <article className="markdown-document" ref={articleRef}>
                {renderedMarkdownSections.map((section) => (
                  <MarkdownSection key={section.key} section={section} />
                ))}
              </article>
            </Tile>
          </div>
        </section>
      ) : (
        <EmptyState />
      )}
    </main>
  );
}

const MarkdownSection = memo(function MarkdownSection({ section }: { section: MarkdownRenderSection }): ReactElement {
  return (
    <section
      className="markdown-render-section"
      data-heading-id={section.headingId ?? undefined}
      dangerouslySetInnerHTML={{ __html: section.html }}
    />
  );
});

function DocumentMetadata({ metadata }: { metadata: PreviewMetadata }): ReactElement {
  return (
    <dl className="document-metadata" aria-label="문서 메타데이터">
      <div>
        <dt>작성자</dt>
        <dd>{metadata.author}</dd>
      </div>
      <div>
        <dt>작성일</dt>
        <dd>{metadata.createdAt}</dd>
      </div>
      <div>
        <dt>수정일</dt>
        <dd>{metadata.updatedAt}</dd>
      </div>
    </dl>
  );
}

function EmptyState(): ReactElement {
  return (
    <Tile className="markui-empty-state">
      <Document size={44} />
      <h1>미리 볼 Markdown 문서가 없습니다.</h1>
      <p>Markdown 파일에서 MarkUI 미리보기를 실행해 주세요.</p>
    </Tile>
  );
}

function FloatingOutline({ items }: { items: OutlineItem[] }): ReactElement {
  const outlineTree = buildOutlineTree(items);

  return (
    <nav className="floating-outline" aria-label="문서 목차">
      <strong>목차</strong>
      <ol className="outline-tree">
        {outlineTree.map((item, index) => (
          <OutlineTreeItem
            isLast={index === outlineTree.length - 1}
            item={item}
            key={`${item.id}-${item.level}`}
          />
        ))}
      </ol>
    </nav>
  );
}

function OutlineTreeItem({ isLast, item }: { isLast: boolean; item: OutlineNode }): ReactElement {
  return (
    <li
      className={[
        'outline-tree-item',
        `outline-tree-item--level-${item.level}`,
        isLast ? 'outline-tree-item--last' : ''
      ].filter(Boolean).join(' ')}
    >
      <a href={`#${item.id}`} className={`outline-link outline-link--level-${item.level}`}>
        <span className="outline-link-text">{item.text}</span>
      </a>
      {item.children.length > 0 ? (
        <ol className="outline-tree outline-tree--nested">
          {item.children.map((child, index) => (
            <OutlineTreeItem
              isLast={index === item.children.length - 1}
              item={child}
              key={`${child.id}-${child.level}`}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function createDocumentPage(text: string, fileTitle: string): DocumentPage {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return {
      title: fileTitle,
      lead: '',
      body: '',
      outline: []
    };
  }

  const lines = normalizedText.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));
  const title = titleIndex >= 0 ? cleanMarkdownTitle(lines[titleIndex].replace(/^#\s+/, '')) : fileTitle;
  const contentLines = titleIndex >= 0
    ? [...lines.slice(0, titleIndex), ...lines.slice(titleIndex + 1)]
    : lines;
  const leadIndex = contentLines.findIndex(isPlainParagraph);
  const lead = leadIndex >= 0 ? cleanMarkdownTitle(contentLines[leadIndex]) : '';
  const bodyLines = leadIndex >= 0
    ? [...contentLines.slice(0, leadIndex), ...contentLines.slice(leadIndex + 1)]
    : contentLines;

  return {
    title,
    lead,
    body: bodyLines.join('\n').trim(),
    outline: extractOutline(bodyLines)
  };
}

function extractOutline(lines: string[]): OutlineItem[] {
  return lines
    .map((line, index) => {
      const heading = line.match(/^(#{2,4})\s+(.+)$/);

      if (!heading) {
        return undefined;
      }

      const text = cleanMarkdownTitle(heading[2]);

      return {
        id: createHeadingId(text, index),
        level: heading[1].length,
        text
      };
    })
    .filter((item): item is OutlineItem => Boolean(item));
}

function buildOutlineTree(items: OutlineItem[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  items.forEach((item) => {
    const node: OutlineNode = {
      ...item,
      children: []
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  });

  return roots;
}

function isPlainParagraph(line: string): boolean {
  const trimmed = line.trim();

  return Boolean(
    trimmed &&
    !trimmed.startsWith('#') &&
    !trimmed.startsWith('- ') &&
    !trimmed.startsWith('* ') &&
    !trimmed.startsWith('>') &&
    !trimmed.startsWith('|') &&
    !trimmed.startsWith('```')
  );
}

function cleanMarkdownTitle(value: string): string {
  return value.replace(/[#*_`~[\]()]/g, '').trim();
}

function getFileName(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/');
  return normalized.split('/').pop() || fileName;
}

function isPreviewDocument(value: unknown): value is PreviewDocument {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'fileName' in value &&
    'metadata' in value &&
    'text' in value &&
    typeof value.fileName === 'string' &&
    isPreviewMetadata(value.metadata) &&
    typeof value.text === 'string'
  );
}

function isPreviewMetadata(value: unknown): value is PreviewMetadata {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'author' in value &&
    'createdAt' in value &&
    'updatedAt' in value &&
    typeof value.author === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function createEmptyMetadata(): PreviewMetadata {
  return {
    author: '미지정',
    createdAt: '-',
    updatedAt: '-'
  };
}
