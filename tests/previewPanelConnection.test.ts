import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync('src/extension/markuiPreviewPanel.ts', 'utf8');
const webviewApp = readFileSync('src/webview/src/MarkdownPreviewApp.tsx', 'utf8');
const styles = readFileSync('src/webview/src/styles.css', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

assert.doesNotMatch(packageJson, /"markui\.colors\./, 'MarkUI must follow the active VS Code color theme.');
assert.match(source, /sourceDocumentUri/, 'The panel must keep the source Markdown document URI.');
assert.match(source, /static open\(extensionUri: vscode\.Uri, sourceDocumentUri\?: vscode\.Uri\)/, 'The panel must accept a source document URI.');
assert.match(source, /vscode\.workspace\.openTextDocument\(this\.sourceDocumentUri\)/, 'The panel must open the source document by URI.');
assert.match(source, /onDidReceiveMessage/, 'The panel must receive Webview messages.');
assert.match(source, /message\.type === 'ready'/, 'The Webview ready message contract must exist.');
assert.match(source, /message\.type === 'copyCode'/, 'The copy code message contract must exist.');
assert.match(source, /vscode\.env\.clipboard\.writeText/, 'Code copy must use the VS Code clipboard API.');
assert.match(source, /getSourceDocument\(\)/, 'The panel must resolve the source document instead of depending only on activeTextEditor.');
assert.match(source, /this\.panel\.title = getFileName\(document\.fileName\)/, 'The panel title must follow the current Markdown file name.');
assert.match(source, /metadata/, 'The panel must send document metadata to the Webview.');
assert.doesNotMatch(source, /createPreviewTheme/, 'The extension must not create a separate MarkUI color theme.');
assert.doesNotMatch(source, /getConfiguration\('markui'\)/, 'The extension must not read MarkUI settings for color application.');
assert.doesNotMatch(
  source,
  /onDidChangeActiveTextEditor\(\(\) => this\.updateDocument\(\)/,
  'The old empty-document focus change pattern must not exist.'
);

assert.match(webviewApp, /postMessage\(\{ type: 'ready' \}\)/, 'The React Webview must send a ready message.');
assert.match(webviewApp, /type: 'copyCode'/, 'The React Webview must send copy code messages.');
assert.match(webviewApp, /code-copy-button/, 'The Webview must render code copy buttons.');
assert.match(webviewApp, /DocumentMetadata/, 'The Webview must render document metadata.');
assert.match(webviewApp, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/, 'Outline clicks must scroll to the target heading.');
assert.doesNotMatch(webviewApp, /applyPreviewTheme/, 'The Webview must not apply separate color settings with JS.');
assert.match(webviewApp, /aria-current=\{isActive \? 'location' : undefined\}/, 'The active outline item must expose the current location.');
assert.match(webviewApp, /outline-link--active/, 'The active outline item must have a dedicated class.');
assert.match(webviewApp, /IntersectionObserver/, 'Outline activity must be synchronized from scroll observation.');
assert.match(webviewApp, /window\.document\.getElementById\(item\.id\)/, 'Outline tracking must use real heading element positions.');
assert.match(webviewApp, /getHeadingTrackingLine/, 'Outline tracking must use a heading tracking line near the top of the viewport.');
assert.match(webviewApp, /isScrolledNearDocumentBottom/, 'Outline tracking must activate the last item at the document bottom.');
assert.match(webviewApp, /outline\.scrollTop/, 'The active outline item must scroll only within the outline panel.');
assert.match(webviewApp, /markui-top-button/, 'The Webview must render the TOP button.');
assert.match(webviewApp, /window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\)/, 'The TOP button must scroll to the document top.');

assert.match(styles, /--vscode-editor-background/, 'The Webview background must follow the VS Code editor theme color.');
assert.match(styles, /--vscode-editor-foreground/, 'The Webview text must follow the VS Code editor foreground color.');
assert.match(styles, /--vscode-textLink-foreground/, 'The Webview accent must follow the VS Code link theme color.');
assert.match(styles, /--vscode-sideBar-background/, 'The document surround must follow the VS Code sidebar theme color.');
assert.match(styles, /\.markui-top-button[\s\S]*box-shadow/, 'The TOP button must have a floating button shadow.');
assert.match(styles, /\.markui-top-button[\s\S]*backdrop-filter/, 'The TOP button must use backdrop blur over the theme background.');
assert.match(styles, /\.cds--header \.document-metadata[\s\S]*height: 36px/, 'Header metadata must keep the same height as header action buttons.');
assert.match(styles, /\.cds--header \.document-metadata[\s\S]*align-items: center/, 'Header metadata must stay vertically centered when the more button is visible.');
assert.match(styles, /\.cds--header \.document-metadata-more[\s\S]*align-items: center/, 'Header metadata more control must align with visible metadata items.');

console.log('문서-뷰어 연결 계약 점검 통과');
