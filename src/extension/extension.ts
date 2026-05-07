import * as vscode from 'vscode';
import { MarkuiPreviewPanel } from './markuiPreviewPanel';

export function activate(context: vscode.ExtensionContext): void {
  const openPreview = vscode.commands.registerCommand('markui.openPreview', () => {
    MarkuiPreviewPanel.open(context.extensionUri);
  });

  context.subscriptions.push(openPreview);
}

export function deactivate(): void {
  MarkuiPreviewPanel.disposeCurrent();
}
