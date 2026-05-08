import * as vscode from 'vscode';

type PreviewMessage = {
  type: 'document';
  payload: {
    fileName: string;
    metadata: PreviewMetadata;
    text: string;
  };
};

type PreviewMetadata = {
  author: string;
  createdAt: string;
  updatedAt: string;
};

type WebviewMessage =
  | {
      type: 'ready';
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
      'Markdown 미리보기',
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
      this.panel.title = 'Markdown 미리보기';
      void this.panel.webview.postMessage({
        type: 'document',
        payload: {
          fileName: 'Markdown 문서를 열어 주세요',
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

  private async getSourceDocument(): Promise<vscode.TextDocument | undefined> {
    if (this.sourceDocumentUri) {
      try {
        const openedDocument = vscode.workspace.textDocuments.find((document) => {
          return document.uri.toString() === this.sourceDocumentUri?.toString();
        }) ?? await vscode.workspace.openTextDocument(this.sourceDocumentUri);

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

  private async createMetadata(document: vscode.TextDocument): Promise<PreviewMetadata> {
    const stat = await this.getDocumentStat(document.uri);
    const author = extractAuthor(document.getText());

    return {
      author: author || '미지정',
      createdAt: stat ? formatDate(stat.ctime) : '-',
      updatedAt: stat ? formatDate(stat.mtime) : '-'
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
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};"
    />
    <link rel="stylesheet" href="${styleUri}" />
    <title>MarkUI 미리보기</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private dispose(): void {
    MarkuiPreviewPanel.currentPanel = undefined;

    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }
}

function createEmptyMetadata(): PreviewMetadata {
  return {
    author: '미지정',
    createdAt: '-',
    updatedAt: '-'
  };
}

function extractAuthor(text: string): string {
  const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!frontMatter) {
    return '';
  }

  const authorLine = frontMatter[1].split(/\r?\n/).find((line) => {
    return /^(author|작성자)\s*:/i.test(line.trim());
  });

  if (!authorLine) {
    return '';
  }

  return authorLine.replace(/^(author|작성자)\s*:/i, '').replace(/^['"]|['"]$/g, '').trim();
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
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
