import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync('src/extension/markuiPreviewPanel.ts', 'utf8');
const webviewApp = readFileSync('src/webview/src/MarkdownPreviewApp.tsx', 'utf8');
const styles = readFileSync('src/webview/src/styles.css', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

assert.doesNotMatch(packageJson, /"markui\.colors\./, '색상은 MarkUI 설정이 아니라 VS Code 현재 테마를 따라야 합니다.');
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
assert.doesNotMatch(source, /createPreviewTheme/, '확장은 별도 MarkUI 색상 테마를 만들지 않아야 합니다.');
assert.doesNotMatch(source, /getConfiguration\('markui'\)/, '확장은 색상 적용을 위해 MarkUI 설정을 읽지 않아야 합니다.');
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
assert.doesNotMatch(webviewApp, /applyPreviewTheme/, 'Webview는 별도 색상 설정을 JS로 적용하지 않아야 합니다.');
assert.match(webviewApp, /aria-current=\{isActive \? 'location' : undefined\}/, '활성 목차 항목에는 현재 위치 표시가 있어야 합니다.');
assert.match(webviewApp, /outline-link--active/, '활성 목차 항목에는 전용 클래스가 있어야 합니다.');
assert.match(webviewApp, /IntersectionObserver/, '목차 활성 상태는 스크롤 위치 관찰 기반으로 동기화해야 합니다.');
assert.match(webviewApp, /outline\.scrollTop/, '활성 목차 항목은 문서가 아닌 목차 영역 안에서만 자동 스크롤되어야 합니다.');
assert.match(webviewApp, /markui-top-button/, '문서 최상단 이동 버튼을 렌더링해야 합니다.');
assert.match(webviewApp, /window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\)/, 'TOP 버튼은 문서 최상단으로 부드럽게 이동해야 합니다.');

assert.match(styles, /--vscode-editor-background/, 'Webview 배경은 VS Code 편집기 테마 색상을 따라야 합니다.');
assert.match(styles, /--vscode-editor-foreground/, 'Webview 글자색은 VS Code 편집기 전경색을 따라야 합니다.');
assert.match(styles, /--vscode-textLink-foreground/, 'Webview 강조색은 VS Code 링크 테마 색상을 따라야 합니다.');
assert.match(styles, /--vscode-sideBar-background/, '문서 주변 배경은 VS Code 사이드바 테마 색상을 따라야 합니다.');
assert.match(styles, /\.markui-top-button[\s\S]*box-shadow/, 'TOP 버튼은 떠 있는 버튼처럼 그림자를 가져야 합니다.');
assert.match(styles, /\.markui-top-button[\s\S]*backdrop-filter/, 'TOP 버튼은 테마 배경 위에서 자연스럽게 보이도록 배경 흐림을 사용해야 합니다.');

console.log('문서-뷰어 연결 계약 점검 통과');
