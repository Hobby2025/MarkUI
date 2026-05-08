import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Tile } from '@carbon/react/es/components/Tile/Tile.js';
import Header from '@carbon/react/es/components/UIShell/Header.js';
import HeaderName from '@carbon/react/es/components/UIShell/HeaderName.js';
import { Document, Download } from '@carbon/icons-react';
import { getVscodeApi } from './vscodeApi';
import { createMarkdownSectionRenderer } from './markdownRenderer';
import type { MarkdownRenderSection } from './markdownRenderer';
import { buildOutlineTree, createDocumentPage } from './documentPage';
import type { OutlineItem, OutlineNode } from './documentPage';

type PreviewMetadataItem = {
  key: string;
  label: string;
  value: string;
};

type PreviewDocument = {
  fileName: string;
  metadata: PreviewMetadata;
  text: string;
};

type PreviewMetadata = {
  items: PreviewMetadataItem[];
};

type ExtensionMessage =
  {
    type: 'document';
    payload: PreviewDocument;
  };

export function MarkdownPreviewApp(): ReactElement {
  const articleRef = useRef<HTMLElement | null>(null);
  const [document, setDocument] = useState<PreviewDocument>(() => {
    const savedState = getVscodeApi()?.getState();

    if (isPreviewDocument(savedState)) {
      return savedState;
    }

    return {
      fileName: 'Open a Markdown document',
      metadata: createEmptyMetadata(),
      text: ''
    };
  });

  const fileTitle = useMemo(() => getFileName(document.fileName), [document.fileName]);
  const renderMarkdownSections = useMemo(() => createMarkdownSectionRenderer(), []);
  const page = useMemo(() => createDocumentPage(document.text, fileTitle), [document.text, fileTitle]);
  const renderedMarkdownSections = useMemo(
    () => renderMarkdownSections(page.body),
    [page.body, renderMarkdownSections]
  );
  const hasDocument = document.text.trim().length > 0;
  const requestPrintableDocument = useCallback(() => {
    const documentPage = window.document.querySelector<HTMLElement>('.document-page');

    if (!documentPage || !hasDocument) {
      return;
    }

    const printRoot = documentPage.cloneNode(true) as HTMLElement;
    printRoot.querySelector('.floating-outline')?.remove();

    getVscodeApi()?.postMessage({
      type: 'requestPrint',
      payload: {
        fileName: document.fileName,
        html: `<main class="markui-document-shell">${printRoot.outerHTML}</main>`
      }
    });
  }, [document.fileName, hasDocument]);

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
        target.textContent = 'Copied';
        window.setTimeout(() => {
          target.textContent = 'Copy';
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
      <Header aria-label={`${fileTitle} preview`}>
        <HeaderName href="#markui-document" prefix={fileTitle}>
          Preview
        </HeaderName>
        <DocumentMetadata metadata={document.metadata} />
        <button
          aria-label="Print PDF"
          className="markui-pdf-button"
          disabled={!hasDocument}
          onClick={requestPrintableDocument}
          title="Print PDF"
          type="button"
        >
          <Download size={18} />
          <span>PDF 다운로드</span>
        </button>
      </Header>

      {hasDocument ? (
        <section
          className={`document-page${page.outline.length > 0 ? '' : ' document-page--plain'}`}
          id="markui-document"
          aria-label="Markdown document preview"
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
  const visibleItems = metadata.items.slice(0, 3);
  const hiddenItems = metadata.items.slice(3);

  if (metadata.items.length === 0) {
    return <div className="document-metadata document-metadata--empty" aria-hidden="true" />;
  }

  return (
    <dl className="document-metadata" aria-label="Document metadata">
      {visibleItems.map((item) => (
        <MetadataItem item={item} key={`${item.key}-${item.value}`} />
      ))}
      {hiddenItems.length > 0 ? (
        <div className="document-metadata-more">
          <dt>More</dt>
          <dd>
            <details>
              <summary aria-label={`Show ${hiddenItems.length} more metadata items`}>...</summary>
              <dl>
                {hiddenItems.map((item) => (
                  <MetadataItem item={item} key={`${item.key}-${item.value}`} />
                ))}
              </dl>
            </details>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function MetadataItem({ item }: { item: PreviewMetadataItem }): ReactElement {
  return (
    <div>
      <dt>{item.label}</dt>
      <dd title={item.value}>{item.value}</dd>
    </div>
  );
}

function EmptyState(): ReactElement {
  return (
    <Tile className="markui-empty-state">
      <Document size={44} />
      <h1>No Markdown document to preview.</h1>
      <p>Run MarkUI preview from a Markdown file.</p>
    </Tile>
  );
}

function FloatingOutline({ items }: { items: OutlineItem[] }): ReactElement {
  const outlineTree = buildOutlineTree(items);

  return (
    <nav className="floating-outline" aria-label="Document outline">
      <strong>Outline</strong>
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
    'items' in value &&
    Array.isArray(value.items) &&
    value.items.every(isPreviewMetadataItem)
  );
}

function isPreviewMetadataItem(value: unknown): value is PreviewMetadataItem {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'key' in value &&
    'label' in value &&
    'value' in value &&
    typeof value.key === 'string' &&
    typeof value.label === 'string' &&
    typeof value.value === 'string'
  );
}

function createEmptyMetadata(): PreviewMetadata {
  return {
    items: []
  };
}
