import { strict as assert } from 'node:assert';
import { getMetadataValue, parseMarkdownDocument } from '../src/extension/markdownDocument';

const yamlDocument = parseMarkdownDocument([
  '---',
  'title: YAML 제목',
  'author: 홍길동',
  'tags: [alpha, beta]',
  '---',
  '',
  '# 실제 제목',
  '',
  '본문입니다.'
].join('\n'));

assert.equal(getMetadataValue(yamlDocument.metadata, 'title'), 'YAML 제목', 'YAML front matter 제목을 추출해야 합니다.');
assert.equal(getMetadataValue(yamlDocument.metadata, 'author'), '홍길동', 'YAML front matter 작성자를 추출해야 합니다.');
assert.equal(getMetadataValue(yamlDocument.metadata, 'tags'), 'alpha, beta', 'YAML 배열 형태 값은 표시 가능한 문자열로 추출해야 합니다.');
assert.doesNotMatch(yamlDocument.body, /^---/, '확정된 YAML front matter는 본문에서 제거해야 합니다.');
assert.match(yamlDocument.body, /^# 실제 제목/, 'front matter 제거 후 실제 본문은 유지해야 합니다.');

const htmlCommentDocument = parseMarkdownDocument([
  '# 문서',
  '',
  '<!-- Parent: none root -->',
  '',
  '<!-- Generated: 2026-04-15 | Updated: 2026-04-16 -->',
  '',
  '문장 <!-- 숨김 --> 유지',
  '',
  '```md',
  '<!-- 코드 주석 -->',
  '```'
].join('\n'));

assert.equal(getMetadataValue(htmlCommentDocument.metadata, 'parent'), 'none root', '최상단 HTML 주석 메타데이터를 추출해야 합니다.');
assert.equal(getMetadataValue(htmlCommentDocument.metadata, 'generated'), '2026-04-15', 'HTML 주석의 생성일 메타데이터를 추출해야 합니다.');
assert.equal(getMetadataValue(htmlCommentDocument.metadata, 'updated'), '2026-04-16', 'HTML 주석의 수정일 메타데이터를 추출해야 합니다.');
assert.doesNotMatch(htmlCommentDocument.body, /숨김/, '코드 블록 밖 HTML 주석은 본문에서 제거해야 합니다.');
assert.match(htmlCommentDocument.body, /&?<!-- 코드 주석 -->?/, '코드 블록 안 HTML 주석 원문은 보존해야 합니다.');

const tomlDocument = parseMarkdownDocument([
  '+++',
  'title = "TOML 제목"',
  'author = "작성자"',
  '+++',
  '',
  '본문'
].join('\n'));

assert.equal(getMetadataValue(tomlDocument.metadata, 'title'), 'TOML 제목', 'TOML front matter 제목을 추출해야 합니다.');
assert.equal(getMetadataValue(tomlDocument.metadata, 'author'), '작성자', 'TOML front matter 작성자를 추출해야 합니다.');
assert.equal(tomlDocument.body, '본문', 'TOML front matter는 본문에서 제거해야 합니다.');

const jsonDocument = parseMarkdownDocument([
  '{',
  '  "title": "JSON 제목",',
  '  "author": "작성자"',
  '}',
  '',
  '본문'
].join('\n'));

assert.equal(getMetadataValue(jsonDocument.metadata, 'title'), 'JSON 제목', 'JSON front matter 제목을 추출해야 합니다.');
assert.equal(jsonDocument.body, '본문', 'JSON front matter는 본문에서 제거해야 합니다.');

const pandocDocument = parseMarkdownDocument([
  '% Pandoc 제목',
  '% 작성자',
  '% 2026-05-08',
  '',
  '본문'
].join('\n'));

assert.equal(getMetadataValue(pandocDocument.metadata, 'title'), 'Pandoc 제목', 'Pandoc 제목 블록을 추출해야 합니다.');
assert.equal(getMetadataValue(pandocDocument.metadata, 'author'), '작성자', 'Pandoc 작성자 줄을 추출해야 합니다.');
assert.equal(getMetadataValue(pandocDocument.metadata, 'date'), '2026-05-08', 'Pandoc 날짜 줄을 추출해야 합니다.');

const multiMarkdownDocument = parseMarkdownDocument([
  'Title: MultiMarkdown 제목',
  'Author: 작성자',
  '',
  '# 본문 제목'
].join('\n'));

assert.equal(getMetadataValue(multiMarkdownDocument.metadata, 'title'), 'MultiMarkdown 제목', 'MultiMarkdown 제목을 추출해야 합니다.');
assert.equal(multiMarkdownDocument.body, '# 본문 제목', 'MultiMarkdown 메타데이터 블록은 본문에서 제거해야 합니다.');

const horizontalRuleDocument = parseMarkdownDocument([
  '---',
  '닫히지 않은 front matter가 아니라 수평선이어야 합니다.'
].join('\n'));

assert.match(horizontalRuleDocument.body, /^---/, '닫히지 않은 front matter는 본문으로 보존해야 합니다.');
assert.equal(horizontalRuleDocument.metadata.length, 0, '닫히지 않은 front matter는 메타데이터로 추출하지 않아야 합니다.');

const plainColonDocument = parseMarkdownDocument([
  '오늘 회의록:',
  '- 항목 1'
].join('\n'));

assert.match(plainColonDocument.body, /^오늘 회의록:/, '허용 키가 아닌 콜론 문장은 본문으로 보존해야 합니다.');
assert.equal(plainColonDocument.metadata.length, 0, '허용 키가 아닌 콜론 문장은 메타데이터로 추출하지 않아야 합니다.');

const codeBlockDocument = parseMarkdownDocument([
  '```yaml',
  '---',
  'title: 코드 안 제목',
  '---',
  '```'
].join('\n'));

assert.match(codeBlockDocument.body, /title: 코드 안 제목/, '코드 블록 내부 메타데이터 형태 문법은 보존해야 합니다.');
assert.equal(codeBlockDocument.metadata.length, 0, '코드 블록 내부 문법은 메타데이터로 추출하지 않아야 합니다.');

console.log('Markdown 메타데이터 파서 테스트 통과');
