import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { createMarkdownSectionRenderer, renderMarkdown, renderMarkdownSections } from '../src/webview/src/markdownRenderer';

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
assert.match(html, /data-code="%20%20%20%20const%20indented%20%3D%20true%3B"/, '들여쓰기 코드 블록은 원문 공백 4칸을 유지해야 합니다.');
assert.match(html, /<span class="indent-unit" aria-hidden="true">    <\/span>const indented = true;/, '들여쓰기 코드 블록은 공백 4칸 영역을 시각적으로 표시해야 합니다.');
assert.match(html, /<img src="https:\/\/example.com\/image.png" alt="대체 텍스트">/, '이미지를 렌더링해야 합니다.');
assert.match(html, /footnote-ref/, '각주 참조를 렌더링해야 합니다.');
assert.match(html, /각주 본문입니다/, '각주 본문을 렌더링해야 합니다.');
assert.doesNotMatch(html, /<script>/, '원본 HTML 태그는 실행 가능한 HTML로 렌더링하지 않아야 합니다.');
assert.match(html, /&lt;script&gt;alert/, '원본 HTML 태그는 이스케이프되어야 합니다.');

console.log('Markdown 렌더러 문법 점검 통과');
const sectionMarkdown = [
  'Intro paragraph.',
  '',
  '## Alpha',
  '',
  'Alpha body with **strong** text.',
  '',
  '## Beta',
  '',
  '- [x] done'
].join('\n');
const sections = renderMarkdownSections(sectionMarkdown);
const sectionHtml = sections.map((section) => section.html).join('');

assert.equal(sections.length, 3, '최상위 제목 경계로 Markdown 본문을 안정적인 렌더 섹션으로 나눠야 합니다.');
assert.equal(sectionHtml, renderMarkdown(sectionMarkdown), '섹션별 렌더링 HTML은 기존 전체 렌더링 HTML과 같아야 합니다.');
assert.equal(sections[1].headingId, 'alpha', '제목 섹션은 React가 참조할 수 있는 heading id를 노출해야 합니다.');
assert.equal(sections[2].headingId, 'beta', '다음 제목 섹션도 heading id를 노출해야 합니다.');

const cachedRenderer = createMarkdownSectionRenderer();
const cachedSections = cachedRenderer(sectionMarkdown);
const reusedSections = cachedRenderer(sectionMarkdown);

assert.equal(reusedSections[1], cachedSections[1], '변경되지 않은 섹션은 캐시된 렌더 결과 객체를 재사용해야 합니다.');
