import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { createMarkdownSectionRenderer, renderMarkdown, renderMarkdownSections } from '../src/webview/src/markdownRenderer';

const markdown = readFileSync('tests/fixtures/markdown-all-syntax-sample.md', 'utf8');
const html = renderMarkdown(markdown);

assert.match(html, /<h1 id="markdown-전체-문법-샘플-데이터">Markdown 전체 문법 샘플 데이터<\/h1>/, '목차 이동용 id가 있는 제목을 렌더링해야 합니다.');
assert.match(html, /<strong>굵은 강조<\/strong>/, '굵게 문법을 렌더링해야 합니다.');
assert.match(html, /<em>기울임 강조<\/em>/, '기울임 문법을 렌더링해야 합니다.');
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
assert.match(html, /data-code="%20%20%20%20const%20value%20%3D%2042%3B/, '들여쓰기 코드 블록은 원문 공백 4칸을 유지해야 합니다.');
assert.match(html, /<pre><code>const value = 42;\nconst doubled = value \* 2;\nconsole\.log\(doubled\);\n<\/code><\/pre>/, '들여쓰기 코드 블록은 화면에서는 표준 Markdown처럼 공백 4칸을 제거해 표시해야 합니다.');
assert.match(html, /<img src="https:\/\/example.com\/image.png" alt="대체 텍스트가 있는 샘플 이미지">/, '이미지를 렌더링해야 합니다.');
assert.match(html, /footnote-ref/, '각주 참조를 렌더링해야 합니다.');
assert.match(html, /첫 번째 각주입니다/, '각주 본문을 렌더링해야 합니다.');
assert.match(html, /<br><span class="footnote-continuation">이 줄은 세 번째 각주의 추가 설명입니다\.<\/span>/, '각주 후속 들여쓰기 줄은 별도 continuation으로 렌더링해야 합니다.');
assert.doesNotMatch(html, /<script>/, '허용되지 않은 HTML 태그는 실행 가능한 HTML로 렌더링하지 않아야 합니다.');
assert.match(html, /<kbd>Ctrl<\/kbd> \+ <kbd>S<\/kbd>/, '허용된 HTML 인라인 태그는 실제 HTML로 렌더링해야 합니다.');
assert.match(html, /HTML 줄바꿈 예시입니다\.<br>\s*이 줄은 HTML 줄바꿈 태그 다음에 이어지는 내용입니다\./, '허용된 HTML 줄바꿈 태그는 실제 HTML로 렌더링해야 합니다.');
assert.match(html, /<sub>아래 첨자<\/sub>/, '허용된 아래 첨자 태그는 실제 HTML로 렌더링해야 합니다.');
assert.match(html, /<sup>위 첨자<\/sup>/, '허용된 위 첨자 태그는 실제 HTML로 렌더링해야 합니다.');
assert.match(html, /<ins>밑줄 텍스트<\/ins>/, '허용된 밑줄 태그는 실제 HTML로 렌더링해야 합니다.');
assert.match(html, /<details>/, '허용된 HTML 블록 시작 태그는 실제 HTML로 렌더링해야 합니다.');
assert.match(html, /<summary>접을 수 있는 상세 정보<\/summary>/, '허용된 HTML 블록 내부 태그도 실제 HTML로 렌더링해야 합니다.');
assert.match(html, /class="markdown-alert markdown-alert-note" data-alert-title="NOTE"/, 'GitHub NOTE 알림을 전용 알림 블록으로 렌더링해야 합니다.');
assert.match(html, /class="markdown-alert markdown-alert-tip" data-alert-title="TIP"/, 'GitHub TIP 알림을 전용 알림 블록으로 렌더링해야 합니다.');
assert.match(html, /class="markdown-alert markdown-alert-important" data-alert-title="IMPORTANT"/, 'GitHub IMPORTANT 알림을 전용 알림 블록으로 렌더링해야 합니다.');
assert.match(html, /class="markdown-alert markdown-alert-warning" data-alert-title="WARNING"/, 'GitHub WARNING 알림을 전용 알림 블록으로 렌더링해야 합니다.');
assert.match(html, /class="markdown-alert markdown-alert-caution" data-alert-title="CAUTION"/, 'GitHub CAUTION 알림을 전용 알림 블록으로 렌더링해야 합니다.');
assert.doesNotMatch(html, /\[!NOTE\]/, 'GitHub 알림 마커는 본문에 표시하지 않아야 합니다.');

const unsafeHtml = renderMarkdown('<script>alert("xss")</script>');
assert.doesNotMatch(unsafeHtml, /<script>/, '허용되지 않은 원본 HTML 태그는 실행 가능한 HTML로 렌더링하지 않아야 합니다.');
assert.match(unsafeHtml, /&lt;script&gt;alert/, '허용되지 않은 원본 HTML 태그는 이스케이프되어야 합니다.');

const unsafeAttributeHtml = renderMarkdown('<sub onclick="alert(1)">safe text</sub>');
assert.doesNotMatch(unsafeAttributeHtml, /onclick/, '허용된 HTML 태그의 위험한 속성은 제거해야 합니다.');
assert.match(unsafeAttributeHtml, /<sub>safe text<\/sub>/, '허용된 HTML 태그는 속성을 제거한 뒤 렌더링해야 합니다.');

const htmlCommentMarkdown = [
  '<!-- Parent: none root -->',
  '',
  '# TerraLink-MxDrawCloudServer',
  '',
  'Visible text <!-- inline comment --> remains.',
  '',
  '<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->',
  '',
  '```md',
  '<!-- code comment stays visible -->',
  '```',
  '',
  '    <!-- indented code comment stays visible -->'
].join('\n');
const htmlCommentHtml = renderMarkdown(htmlCommentMarkdown);

assert.doesNotMatch(htmlCommentHtml, /Parent: none root/, 'HTML 주석은 일반 문서 본문에서 표시하지 않아야 합니다.');
assert.doesNotMatch(htmlCommentHtml, /Generated: 2026-04-15/, 'HTML 주석 형식의 문서 메타데이터를 표시하지 않아야 합니다.');
assert.match(htmlCommentHtml, /Visible text\s+remains\./, '인라인 HTML 주석만 제거하고 일반 문장은 유지해야 합니다.');
assert.match(htmlCommentHtml, /&lt;!-- code comment stays visible --&gt;/, '코드 블록 내부 HTML 주석은 유지해야 합니다.');
assert.match(htmlCommentHtml, /&lt;!-- indented code comment stays visible --&gt;/, '들여쓰기 코드 블록 내부 HTML 주석은 유지해야 합니다.');

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

const indentedSections = renderMarkdownSections('    const value = 1;');
const indentedSectionHtml = indentedSections.map((section) => section.html).join('');

assert.match(indentedSectionHtml, /data-code="%20%20%20%20const%20value%20%3D%201%3B"/, '섹션 렌더링도 들여쓰기 코드 블록의 원문 공백 4칸을 유지해야 합니다.');
assert.match(indentedSectionHtml, /<pre><code>const value = 1;\n<\/code><\/pre>/, '섹션 렌더링도 화면에서는 표준 Markdown처럼 공백 4칸을 제거해 표시해야 합니다.');

const commentOnlySectionHtml = renderMarkdownSections('<!-- Parent: none root -->\n\n## Body')
  .map((section) => section.html)
  .join('');

assert.doesNotMatch(commentOnlySectionHtml, /Parent: none root/, '섹션 렌더링도 HTML 주석을 표시하지 않아야 합니다.');
assert.match(commentOnlySectionHtml, /<h2 id="body">Body<\/h2>/, 'HTML 주석 제거 후 제목 섹션을 렌더링해야 합니다.');
