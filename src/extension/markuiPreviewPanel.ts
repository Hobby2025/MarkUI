import * as vscode from 'vscode';

type PreviewMessage = {
  type: 'document';
  payload: {
    fileName: string;
    text: string;
  };
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

  static open(extensionUri: vscode.Uri): void {
    if (MarkuiPreviewPanel.currentPanel) {
      MarkuiPreviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      MarkuiPreviewPanel.currentPanel.updateDocument();
      return;
    }

    const sourceDocument = vscode.window.activeTextEditor?.document.languageId === 'markdown'
      ? vscode.window.activeTextEditor.document
      : undefined;
    const panel = vscode.window.createWebviewPanel(
      'markuiPreview',
      '▣ MarkUI',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        enableFindWidget: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media', 'preview')]
      }
    );

    MarkuiPreviewPanel.currentPanel = new MarkuiPreviewPanel(panel, extensionUri, sourceDocument?.uri);
  }

  static disposeCurrent(): void {
    MarkuiPreviewPanel.currentPanel?.dispose();
    MarkuiPreviewPanel.currentPanel = undefined;
  }

  private updateDocument(): void {
    const document = this.getSourceDocument();

    if (!document) {
      void this.panel.webview.postMessage({
        type: 'document',
        payload: {
          fileName: 'Markdown 문서를 열어 주세요',
          text: ''
        }
      } satisfies PreviewMessage);
      return;
    }

    void this.panel.webview.postMessage({
      type: 'document',
      payload: {
        fileName: document.fileName,
        text: document.getText()
      }
    } satisfies PreviewMessage);
  }

  private getSourceDocument(): vscode.TextDocument | undefined {
    const activeDocument = vscode.window.activeTextEditor?.document;

    if (activeDocument?.languageId === 'markdown') {
      this.sourceDocumentUri = activeDocument.uri;
      return activeDocument;
    }

    if (!this.sourceDocumentUri) {
      return undefined;
    }

    return vscode.workspace.textDocuments.find((document) => {
      return document.languageId === 'markdown' && document.uri.toString() === this.sourceDocumentUri?.toString();
    });
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

function createNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';

  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return nonce;
}
