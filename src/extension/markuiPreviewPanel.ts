import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as vscode from 'vscode';
import { parseMarkdownDocument } from './markdownDocument';
import type { MarkdownMetadataItem } from './markdownDocument';

type PreviewMessage = {
  type: 'document';
  payload: {
    fileName: string;
    metadata: PreviewMetadata;
    text: string;
  };
};

type PreviewMetadata = {
  items: MarkdownMetadataItem[];
};

type WebviewMessage =
  | {
      type: 'ready';
    }
  | {
      type: 'requestPrint';
      payload: {
        fileName: string;
        html: string;
      };
    }
  | {
      type: 'copyCode';
      payload: {
        text: string;
      };
    };

export class MarkuiPreviewPanel {
  private static currentPanel: MarkuiPreviewPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];
  private printServer: http.Server | undefined;
  private printServerCloseTimer: NodeJS.Timeout | undefined;
  private sourceDocumentUri: vscode.Uri | undefined;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    sourceDocumentUri: vscode.Uri | undefined
  ) {
    this.sourceDocumentUri = sourceDocumentUri;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.onDidChangeViewState(() => {
      if (this.panel.visible) {
        this.updateDocument();
      }
    }, null, this.disposables);
    this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
      if (message.type === 'ready') {
        this.updateDocument();
        return;
      }

      if (message.type === 'copyCode') {
        void vscode.env.clipboard.writeText(message.payload.text);
        return;
      }

      if (message.type === 'requestPrint') {
        void this.openPrintableDocument(message.payload.fileName, message.payload.html);
      }
    }, null, this.disposables);

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'markdown') {
        this.sourceDocumentUri = editor.document.uri;
        this.updateDocument();
      }
    }, null, this.disposables);
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (this.sourceDocumentUri && event.document.uri.toString() === this.sourceDocumentUri.toString()) {
        this.updateDocument();
      }
    }, null, this.disposables);
    this.panel.webview.html = this.createHtml();
    this.updateDocument();
  }

  static open(extensionUri: vscode.Uri, sourceDocumentUri?: vscode.Uri): void {
    const documentUri = sourceDocumentUri ?? getActiveMarkdownDocumentUri();

    if (MarkuiPreviewPanel.currentPanel) {
      if (documentUri) {
        MarkuiPreviewPanel.currentPanel.sourceDocumentUri = documentUri;
      }

      MarkuiPreviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      MarkuiPreviewPanel.currentPanel.updateDocument();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'markuiPreview',
      'Markdown Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        enableFindWidget: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media', 'preview')]
      }
    );

    MarkuiPreviewPanel.currentPanel = new MarkuiPreviewPanel(panel, extensionUri, documentUri);
  }

  static disposeCurrent(): void {
    MarkuiPreviewPanel.currentPanel?.dispose();
    MarkuiPreviewPanel.currentPanel = undefined;
  }

  private updateDocument(): void {
    void this.postDocument();
  }

  private async postDocument(): Promise<void> {
    const document = await this.getSourceDocument();

    if (!document) {
      this.panel.title = 'Markdown Preview';
      void this.panel.webview.postMessage({
        type: 'document',
        payload: {
          fileName: 'Open a Markdown document',
          metadata: createEmptyMetadata(),
          text: ''
        }
      } satisfies PreviewMessage);
      return;
    }

    this.panel.title = getFileName(document.fileName);
    void this.panel.webview.postMessage({
      type: 'document',
      payload: {
        fileName: document.fileName,
        metadata: await this.createMetadata(document),
        text: document.getText()
      }
    } satisfies PreviewMessage);
  }

  private async openPrintableDocument(fileName: string, bodyHtml: string): Promise<void> {
    try {
      await this.closePrintableServer();
      const css = await this.readPreviewCss();
      const html = createPrintableHtml(fileName, bodyHtml, css);
      const server = http.createServer((_request, response) => {
        response.writeHead(200, {
          'cache-control': 'no-store',
          'content-type': 'text/html; charset=utf-8'
        });
        response.end(html);
        this.schedulePrintableServerClose();
      });

      this.printServer = server;
      await new Promise<void>((resolve, reject) => {
        const handleError = (error: Error) => {
          reject(error);
        };

        server.once('error', handleError);
        server.listen(0, '127.0.0.1', () => {
          server.off('error', handleError);
          resolve();
        });
      });

      const address = server.address() as AddressInfo | null;

      if (!address) {
        throw new Error('인쇄 서버 주소를 확인할 수 없습니다.');
      }

      const opened = await vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:${address.port}/print`));

      if (!opened) {
        throw new Error('인쇄용 브라우저를 열 수 없습니다.');
      }

      this.schedulePrintableServerClose();
    } catch {
      await this.closePrintableServer();
      void vscode.window.showErrorMessage('PDF 인쇄용 브라우저를 열지 못했습니다.');
    }
  }

  private async readPreviewCss(): Promise<string> {
    const cssUri = vscode.Uri.joinPath(this.extensionUri, 'media', 'preview', 'assets', 'index.css');

    try {
      const bytes = await vscode.workspace.fs.readFile(cssUri);
      return new TextDecoder().decode(bytes);
    } catch {
      return '';
    }
  }

  private schedulePrintableServerClose(): void {
    if (this.printServerCloseTimer) {
      clearTimeout(this.printServerCloseTimer);
    }

    this.printServerCloseTimer = setTimeout(() => {
      void this.closePrintableServer();
    }, 30_000);
  }

  private async closePrintableServer(): Promise<void> {
    if (this.printServerCloseTimer) {
      clearTimeout(this.printServerCloseTimer);
      this.printServerCloseTimer = undefined;
    }

    const server = this.printServer;
    this.printServer = undefined;

    if (!server || !server.listening) {
      return;
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  private async getSourceDocument(): Promise<vscode.TextDocument | undefined> {
    if (this.sourceDocumentUri) {
      try {
        const openedDocument = this.findOpenedSourceDocument() ?? await vscode.workspace.openTextDocument(this.sourceDocumentUri);

        if (openedDocument.languageId === 'markdown') {
          return openedDocument;
        }
      } catch {
        return undefined;
      }
    }

    const activeDocument = vscode.window.activeTextEditor?.document;

    if (activeDocument?.languageId === 'markdown') {
      this.sourceDocumentUri = activeDocument.uri;
      return activeDocument;
    }

    return undefined;
  }

  private findOpenedSourceDocument(): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find((document) => {
      return document.uri.toString() === this.sourceDocumentUri?.toString();
    });
  }

  private async createMetadata(document: vscode.TextDocument): Promise<PreviewMetadata> {
    const stat = await this.getDocumentStat(document.uri);
    const items = [...parseMarkdownDocument(document.getText()).metadata];

    if (stat) {
      items.push({
        key: 'filecreated',
        label: 'File created',
        value: formatDate(stat.ctime)
      });
      items.push({
        key: 'fileupdated',
        label: 'File updated',
        value: formatDate(stat.mtime)
      });
    }

    return {
      items
    };
  }

  private async getDocumentStat(uri: vscode.Uri): Promise<vscode.FileStat | undefined> {
    try {
      return await vscode.workspace.fs.stat(uri);
    } catch {
      return undefined;
    }
  }

  private createHtml(): string {
    const webview = this.panel.webview;
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'preview', 'assets', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'preview', 'assets', 'index.css'));
    const nonce = createNonce();

    return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};"
    />
    <link rel="stylesheet" href="${styleUri}" />
    <title>MarkUI Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private dispose(): void {
    MarkuiPreviewPanel.currentPanel = undefined;
    void this.closePrintableServer();

    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }
}

function createPrintableHtml(fileName: string, bodyHtml: string, css: string): string {
  return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(getFileName(fileName))}</title>
    <style>${css}</style>
  </head>
  <body>
    ${bodyHtml}
    <script>
      window.addEventListener('load', () => window.setTimeout(() => window.print(), 150));
    </script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createEmptyMetadata(): PreviewMetadata {
  return {
    items: []
  };
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium'
  }).format(new Date(timestamp));
}

function getFileName(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/');
  return normalized.split('/').pop() || fileName;
}

function getActiveMarkdownDocumentUri(): vscode.Uri | undefined {
  const activeDocument = vscode.window.activeTextEditor?.document;
  return activeDocument?.languageId === 'markdown' ? activeDocument.uri : undefined;
}

function createNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';

  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return nonce;
}
