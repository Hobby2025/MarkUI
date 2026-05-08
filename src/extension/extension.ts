import * as vscode from 'vscode';
import { MarkuiPreviewPanel } from './markuiPreviewPanel';

export function activate(context: vscode.ExtensionContext): void {
  const openPreview = vscode.commands.registerCommand('markui.openPreview', (resourceUri?: vscode.Uri) => {
    void MarkuiPreviewPanel.open(context.extensionUri, resourceUri);
  });

  context.subscriptions.push(openPreview);
}

export function deactivate(): void {
  MarkuiPreviewPanel.disposeCurrent();
}
