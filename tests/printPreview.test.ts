import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const packageJson = readFileSync('package.json', 'utf8');
const extensionSource = readFileSync('src/extension/extension.ts', 'utf8');
const panelSource = readFileSync('src/extension/markuiPreviewPanel.ts', 'utf8');
const webviewApp = readFileSync('src/webview/src/MarkdownPreviewApp.tsx', 'utf8');
const styles = readFileSync('src/webview/src/styles.css', 'utf8');

assert.doesNotMatch(packageJson, /markui\.printPreview/, 'IDE에는 별도 인쇄 명령을 등록하지 않아야 합니다.');
assert.doesNotMatch(extensionSource, /registerCommand\('markui\.printPreview'/, '확장은 별도 인쇄 명령을 등록하지 않아야 합니다.');

assert.match(panelSource, /type: 'requestPrint'/, 'Webview는 렌더링된 인쇄 HTML을 확장에 요청해야 합니다.');
assert.match(panelSource, /openPrintableDocument/, '확장은 인쇄용 HTML을 로컬 HTTP 서버로 열어야 합니다.');
assert.match(panelSource, /http\.createServer/, '확장은 인쇄용 임시 로컬 HTTP 서버를 생성해야 합니다.');
assert.match(panelSource, /server\.listen\(0, '127\.0\.0\.1'/, '인쇄 서버는 127.0.0.1에서 빈 포트를 자동 배정받아야 합니다.');
assert.match(panelSource, /vscode\.env\.openExternal\(vscode\.Uri\.parse\(`http:\/\/127\.0\.0\.1:\$\{address\.port\}\/print`\)\)/, '확장은 파일 URI가 아니라 HTTP URL을 브라우저로 열어야 합니다.');
assert.match(panelSource, /readPreviewCss/, '확장은 빌드된 MarkUI 미리보기 CSS를 읽어야 합니다.');
assert.match(panelSource, /media', 'preview', 'assets', 'index\.css'/, '인쇄 HTML은 실제 미리보기 CSS 파일을 사용해야 합니다.');
assert.match(panelSource, /<style>\$\{css\}<\/style>/, '인쇄 HTML은 별도 스타일 대신 실제 미리보기 CSS를 주입해야 합니다.');
assert.match(panelSource, /<title>\$\{escapeHtml\(getFileName\(fileName\)\)\}<\/title>/, '인쇄 HTML 제목은 원본 파일명이어야 합니다.');
assert.doesNotMatch(panelSource, /markui-print-shell/, '인쇄 HTML은 별도 인쇄 전용 쉘 스타일을 만들지 않아야 합니다.');
assert.doesNotMatch(panelSource, /\.markdown-document pre[\s\S]*white-space: pre-wrap/, '확장은 코드블록 인쇄 스타일을 별도로 덮어쓰지 않아야 합니다.');
assert.doesNotMatch(panelSource, /\.markdown-document table[\s\S]*border: 1px solid #8d8d8d/, '확장은 표 인쇄 스타일을 별도로 덮어쓰지 않아야 합니다.');
assert.match(panelSource, /schedulePrintableServerClose/, '인쇄 서버는 자동 종료 일정을 가져야 합니다.');
assert.match(panelSource, /30_000/, '인쇄 서버는 응답 후 일정 시간 뒤 자동 종료되어야 합니다.');
assert.match(panelSource, /closePrintableServer/, '새 인쇄 요청이나 패널 종료 때 기존 인쇄 서버를 닫아야 합니다.');
assert.doesNotMatch(panelSource, /vscode\.workspace\.fs\.writeFile/, '인쇄 흐름은 임시 HTML 파일 쓰기에 의존하지 않아야 합니다.');

assert.match(webviewApp, /type: 'requestPrint'/, 'React Webview는 PDF 버튼 클릭 시 인쇄 HTML을 확장에 보내야 합니다.');
assert.match(webviewApp, /querySelector<HTMLElement>\('\.document-page'\)/, 'React Webview는 실제 문서 페이지 DOM을 복제해야 합니다.');
assert.match(webviewApp, /printRoot\.querySelector\('\.floating-outline'\)\?\.remove\(\)/, '인쇄 HTML은 목차만 제거해야 합니다.');
assert.doesNotMatch(webviewApp, /printRoot\.classList\.add\('document-page--plain'\)/, '인쇄 HTML은 목차 제거 후 레이아웃을 별도로 전환하지 않아야 합니다.');
assert.doesNotMatch(webviewApp, /details\.open = true/, '인쇄 HTML은 접힌 details 상태를 강제로 변경하지 않아야 합니다.');
assert.doesNotMatch(webviewApp, /querySelectorAll\('\.code-copy-button'\)[\s\S]*remove\(\)/, '인쇄 HTML은 목차 외의 화면 요소를 직접 제거하지 않아야 합니다.');
assert.match(webviewApp, /html: `<main class="markui-document-shell">\$\{printRoot\.outerHTML\}<\/main>`/, '인쇄 HTML은 미리보기와 같은 문서 쉘을 사용해야 합니다.');
assert.doesNotMatch(webviewApp, /function createPrintableHtml/, 'React Webview는 별도 인쇄 CSS를 만들지 않아야 합니다.');
assert.doesNotMatch(webviewApp, /onClick=\{\(\) => window\.print\(\)\}/, 'PDF 버튼은 Webview 안에서 직접 window.print()만 호출하면 안 됩니다.');
assert.match(webviewApp, /className="markui-pdf-button"/, 'React Webview는 메타데이터 오른쪽에 PDF 버튼을 렌더링해야 합니다.');
assert.match(webviewApp, /disabled=\{!hasDocument\}/, 'PDF 버튼은 인쇄할 문서가 없을 때 비활성화되어야 합니다.');
assert.match(webviewApp, /<span>PDF 다운로드<\/span>/, 'PDF 버튼에는 PDF 다운로드 문구가 있어야 합니다.');
assert.match(webviewApp, /<Download size=\{18\} \/>/, 'PDF 버튼은 다운로드 아이콘을 표시해야 합니다.');
assert.match(webviewApp, /aria-label="Print PDF"/, 'PDF 버튼은 접근성 라벨을 제공해야 합니다.');

assert.match(styles, /@import "highlight\.js\/styles\/github-dark\.css";/, 'Highlight.js CSS는 CSS 파일에서 가져와야 합니다.');
assert.match(styles, /print-color-adjust: exact/, '인쇄 시 브라우저가 배경색과 연한 색상을 임의로 생략하지 않도록 지시해야 합니다.');
assert.match(styles, /-webkit-print-color-adjust: exact/, 'Chromium 계열 인쇄에서도 배경색과 코드블럭 색상을 보존해야 합니다.');
assert.match(styles, /@media print[\s\S]*\.floating-outline[\s\S]*display: none !important/, '인쇄 시 목차는 숨겨야 합니다.');
assert.match(styles, /@media print[\s\S]*\.markui-top-button[\s\S]*display: none !important/, '인쇄 시 TOP 버튼은 숨겨야 합니다.');
assert.match(styles, /@media print[\s\S]*\.markdown-document thead[\s\S]*display: table-header-group/, '인쇄 시 표 헤더 구조를 유지해야 합니다.');
assert.match(styles, /@media print[\s\S]*\.markdown-document tr[\s\S]*break-inside: avoid/, '인쇄 시 표 행이 어색하게 분리되지 않아야 합니다.');
assert.doesNotMatch(styles, /@media print[\s\S]*\.document-card\.cds--tile[\s\S]*border: 0/, '인쇄 스타일은 문서 카드 스타일을 제거하지 않아야 합니다.');
assert.doesNotMatch(styles, /@media print[\s\S]*\.markdown-document[\s\S]*font-size: 12pt/, '인쇄 스타일은 본문 글꼴 크기를 별도로 바꾸지 않아야 합니다.');
assert.match(styles, /\.markui-pdf-button[\s\S]*margin-right: clamp/, 'PDF 버튼은 헤더 오른쪽에 배치되어야 합니다.');

console.log('인쇄 미리보기 계약 평가 통과');
