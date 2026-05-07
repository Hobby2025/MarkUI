import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Tile } from '@carbon/react/es/components/Tile/Tile.js';
import Header from '@carbon/react/es/components/UIShell/Header.js';
import HeaderName from '@carbon/react/es/components/UIShell/HeaderName.js';
import { Document } from '@carbon/icons-react';
import { getVscodeApi } from './vscodeApi';
import { createHeadingId, renderMarkdown } from './markdownRenderer';
import 'highlight.js/styles/github-dark.css';

type PreviewDocument = {
  fileName: string;
  text: string;
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

export function MarkdownPreviewApp(): ReactElement {
  const articleRef = useRef<HTMLElement | null>(null);
  const [document, setDocument] = useState<PreviewDocument>(() => {
    const savedState = getVscodeApi()?.getState();

    if (isPreviewDocument(savedState)) {
      return savedState;
    }

    return {
      fileName: 'Markdown 문서를 열어 주세요',
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
  const page = useMemo(() => createDocumentPage(document.text, fileTitle), [document.text, fileTitle]);
  const renderedMarkdown = useMemo(() => renderMarkdown(page.body), [page.body]);
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
  }, [renderedMarkdown]);

  return (
    <main className="markui-document-shell">
      <Header aria-label="MarkUI">
        <HeaderName href="#markui-document" prefix="MarkUI">
          Document preview
        </HeaderName>
      </Header>

      {hasDocument ? (
        <section className="document-page" id="markui-document" aria-label="Markdown 문서 미리보기">
          <header className="document-title-band">
            <p>Markdown document</p>
            <h1>{page.title}</h1>
            {page.lead ? <div className="document-lead">{page.lead}</div> : null}
          </header>

          <Tile className="document-card">
            {page.outline.length > 0 ? <FloatingOutline items={page.outline} /> : null}
            <article className="markdown-document" dangerouslySetInnerHTML={{ __html: renderedMarkdown }} ref={articleRef} />
          </Tile>
        </section>
      ) : (
        <EmptyState />
      )}
    </main>
  );
}

function EmptyState(): ReactElement {
  return (
    <Tile className="markui-empty-state">
      <Document size={44} />
      <h1>미리볼 Markdown 문서가 없습니다.</h1>
      <p>Markdown 파일을 연 뒤 MarkUI 미리보기를 실행해 주세요.</p>
    </Tile>
  );
}

function FloatingOutline({ items }: { items: OutlineItem[] }): ReactElement {
  return (
    <nav className="floating-outline" aria-label="문서 목차">
      <strong>목차</strong>
      {items.map((item) => (
        <a
          href={`#${item.id}`}
          key={`${item.id}-${item.level}`}
          style={{ paddingLeft: `${Math.max(0, item.level - 2) * 10}px` }}
        >
          {item.text}
        </a>
      ))}
    </nav>
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
    'text' in value &&
    typeof value.fileName === 'string' &&
    typeof value.text === 'string'
  );
}
