import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync('src/extension/markuiPreviewPanel.ts', 'utf8');
const webviewApp = readFileSync('src/webview/src/MarkdownPreviewApp.tsx', 'utf8');

assert.match(source, /sourceDocumentUri/, '패널은 열기 시점의 Markdown 문서 URI를 보관해야 합니다.');
assert.match(source, /onDidReceiveMessage/, 'Webview 준비 메시지를 받아 문서를 다시 전송해야 합니다.');
assert.match(source, /message\.type === 'ready'/, 'Webview ready 메시지 계약이 있어야 합니다.');
assert.match(source, /message\.type === 'copyCode'/, '코드 복사 메시지 계약이 있어야 합니다.');
assert.match(source, /vscode\.env\.clipboard\.writeText/, '코드 복사는 VS Code 클립보드 API로 처리해야 합니다.');
assert.match(source, /getSourceDocument\(\)/, 'activeTextEditor 직접 의존 대신 소스 문서 조회를 사용해야 합니다.');
assert.doesNotMatch(
  source,
  /onDidChangeActiveTextEditor\(\(\) => this\.updateDocument\(\)/,
  'Webview 포커스 이동만으로 빈 문서를 전송하는 이전 패턴이 없어야 합니다.'
);
assert.match(webviewApp, /postMessage\(\{ type: 'ready' \}\)/, 'React Webview는 준비 후 ready 메시지를 보내야 합니다.');
assert.match(webviewApp, /type: 'copyCode'/, 'React Webview는 코드 복사 메시지를 보내야 합니다.');
assert.match(webviewApp, /code-copy-button/, '코드블록 복사 버튼을 렌더링해야 합니다.');

console.log('문서-뷰어 연결 계약 점검 통과');
