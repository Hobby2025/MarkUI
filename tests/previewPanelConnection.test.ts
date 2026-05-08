import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync('src/extension/markuiPreviewPanel.ts', 'utf8');
const webviewApp = readFileSync('src/webview/src/MarkdownPreviewApp.tsx', 'utf8');

assert.match(source, /sourceDocumentUri/, '패널은 열기 시점의 Markdown 문서 URI를 보관해야 합니다.');
assert.match(source, /static open\(extensionUri: vscode\.Uri, sourceDocumentUri\?: vscode\.Uri\)/, '편집기 제목 버튼에서 전달되는 문서 URI를 받아야 합니다.');
assert.match(source, /vscode\.workspace\.openTextDocument\(this\.sourceDocumentUri\)/, '활성 편집기가 없어도 전달받은 URI로 문서를 열어야 합니다.');
assert.match(source, /onDidReceiveMessage/, 'Webview 준비 메시지를 받아 문서를 다시 전송해야 합니다.');
assert.match(source, /message\.type === 'ready'/, 'Webview ready 메시지 계약이 있어야 합니다.');
assert.match(source, /message\.type === 'copyCode'/, '코드 복사 메시지 계약이 있어야 합니다.');
assert.match(source, /vscode\.env\.clipboard\.writeText/, '코드 복사는 VS Code 클립보드 API로 처리해야 합니다.');
assert.match(source, /getSourceDocument\(\)/, 'activeTextEditor 직접 의존 대신 소스 문서 조회를 사용해야 합니다.');
assert.match(source, /this\.panel\.title = getFileName\(document\.fileName\)/, '미리보기 패널 제목은 현재 Markdown 문서명으로 갱신해야 합니다.');
assert.match(source, /metadata/, 'Webview로 문서 메타데이터를 전달해야 합니다.');
assert.doesNotMatch(
  source,
  /onDidChangeActiveTextEditor\(\(\) => this\.updateDocument\(\)/,
  'Webview 포커스 이동만으로 빈 문서를 전송하는 이전 패턴이 없어야 합니다.'
);
assert.match(webviewApp, /postMessage\(\{ type: 'ready' \}\)/, 'React Webview는 준비 후 ready 메시지를 보내야 합니다.');
assert.match(webviewApp, /type: 'copyCode'/, 'React Webview는 코드 복사 메시지를 보내야 합니다.');
assert.match(webviewApp, /code-copy-button/, '코드블록 복사 버튼을 렌더링해야 합니다.');
assert.match(webviewApp, /DocumentMetadata/, '문서 헤더에 메타데이터를 렌더링해야 합니다.');
assert.match(webviewApp, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/, '목차 클릭은 대상 heading으로 직접 스크롤해야 합니다.');

console.log('문서-뷰어 연결 계약 점검 통과');
