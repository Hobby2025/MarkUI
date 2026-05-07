import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { renderMarkdown } from '../src/webview/src/markdownRenderer';

const markdown = readFileSync('tests/fixtures/full-syntax.md', 'utf8');
const html = renderMarkdown(markdown);

assert.match(html, /<h1 id="markui-전체-문법-점검">MarkUI 전체 문법 점검<\/h1>/, '목차 이동용 id가 있는 제목을 렌더링해야 합니다.');
assert.match(html, /<strong>굵게<\/strong>/, '굵게 문법을 렌더링해야 합니다.');
assert.match(html, /<em>기울임<\/em>/, '기울임 문법을 렌더링해야 합니다.');
assert.match(html, /<s>취소선<\/s>/, '취소선 문법을 렌더링해야 합니다.');
assert.match(html, /<code>인라인 코드<\/code>/, '인라인 코드를 렌더링해야 합니다.');
assert.match(html, /<a href="https:\/\/example.com"/, '자동 링크를 안전한 링크로 렌더링해야 합니다.');
assert.match(html, /class="task-list"/, '작업 목록 컨테이너 클래스를 렌더링해야 합니다.');
assert.match(html, /task-list-item-checkbox" type="checkbox" disabled>/, '미완료 작업 체크박스를 렌더링해야 합니다.');
assert.match(html, /task-list-item-checkbox" type="checkbox" disabled checked>/, '완료 작업 체크박스를 렌더링해야 합니다.');
assert.match(html, /<blockquote>/, '인용문을 렌더링해야 합니다.');
assert.match(html, /<table>/, '표를 렌더링해야 합니다.');
assert.match(html, /<code class="language-ts">/, '언어가 지정된 코드블록을 렌더링해야 합니다.');
assert.match(html, /class="code-copy-button"/, '코드블록 복사 버튼을 렌더링해야 합니다.');
assert.match(html, /data-code="/, '코드 복사용 원본 코드를 버튼 데이터에 포함해야 합니다.');
assert.match(html, /hljs/, '코드 강조 HTML을 렌더링해야 합니다.');
assert.match(html, /<img src="https:\/\/example.com\/image.png" alt="대체 텍스트">/, '이미지를 렌더링해야 합니다.');
assert.match(html, /footnote-ref/, '각주 참조를 렌더링해야 합니다.');
assert.match(html, /각주 본문입니다/, '각주 본문을 렌더링해야 합니다.');
assert.doesNotMatch(html, /<script>/, '원본 HTML 태그는 실행 가능한 HTML로 렌더링하지 않아야 합니다.');
assert.match(html, /&lt;script&gt;alert/, '원본 HTML 태그는 이스케이프되어야 합니다.');

console.log('Markdown 렌더러 문법 점검 통과');
