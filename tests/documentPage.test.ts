import { strict as assert } from 'node:assert';
import { createDocumentPage } from '../src/webview/src/documentPage';

const ddlMarkdown = [
  '```sql',
  '-- public.code definition',
  '',
  '-- Drop table',
  '',
  '-- DROP TABLE public.code;',
  '',
  'CREATE TABLE public.code (',
  'codeno bigserial NOT NULL',
  ');',
  '```'
].join('\n');

const ddlPage = createDocumentPage(ddlMarkdown, 'terraLink-DDL(미수정).md');

assert.equal(ddlPage.title, 'terraLink-DDL(미수정).md', '제목이 없으면 파일명을 문서 제목으로 사용해야 합니다.');
assert.equal(ddlPage.lead, '', '코드블록 내부 SQL 주석은 문서 리드 문장으로 추출하지 않아야 합니다.');
assert.match(ddlPage.body, /^```sql\n-- public\.code definition/, '코드블록 첫 줄을 본문에 그대로 유지해야 합니다.');
assert.deepEqual(ddlPage.outline, [], '코드블록 내부 Markdown 제목 표기는 목차로 추출하지 않아야 합니다.');

const mixedMarkdown = [
  '# 문서 제목',
  '',
  '요약 문장입니다.',
  '',
  '```sql',
  '## code comment',
  '-- public.code definition',
  '```',
  '',
  '## 실제 목차'
].join('\n');

const mixedPage = createDocumentPage(mixedMarkdown, 'fallback.md');

assert.equal(mixedPage.title, '문서 제목', '문서 최상위 제목을 제목 영역에 사용해야 합니다.');
assert.equal(mixedPage.lead, '요약 문장입니다.', '코드블록 밖 일반 문단만 리드로 추출해야 합니다.');
assert.equal(mixedPage.outline.length, 1, '코드블록 밖 제목만 목차로 추출해야 합니다.');
assert.equal(mixedPage.outline[0].text, '실제 목차', '코드블록 내부 제목 후보는 목차에서 제외해야 합니다.');

const htmlCommentPage = createDocumentPage([
  '# TerraLink-MxDrawCloudServer',
  '',
  '<!-- Parent: none root -->',
  '',
  '<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->',
  '',
  '## Purpose',
  '',
  '본문입니다.'
].join('\n'), 'AGENTS.md');

assert.equal(htmlCommentPage.title, 'TerraLink-MxDrawCloudServer', 'HTML 주석이 있어도 문서 제목은 유지해야 합니다.');
assert.equal(htmlCommentPage.lead, '', 'HTML 주석을 문서 리드 문장으로 추출하지 않아야 합니다.');
assert.doesNotMatch(htmlCommentPage.body, /Parent: none root/, '문서 본문에서도 HTML 주석을 제거해야 합니다.');
assert.doesNotMatch(htmlCommentPage.body, /Generated: 2026-04-15/, '문서 메타데이터 HTML 주석을 본문에 남기지 않아야 합니다.');
assert.equal(htmlCommentPage.outline[0].text, 'Purpose', 'HTML 주석 제거 후 실제 제목만 목차에 포함해야 합니다.');

const multiIntroMarkdown = [
  '# Markdown 전체 문법 샘플 데이터',
  '',
  '이 문서는 Markdown 렌더링, 스타일 확인, 파서 동작 검증을 위한 샘플입니다.',
  '',
  '각 문법은 `###` 제목으로 구분되어 있으며, 예시 문단을 충분히 포함합니다.',
  '',
  '### 제목'
].join('\n');

const multiIntroPage = createDocumentPage(multiIntroMarkdown, 'sample.md');

assert.equal(multiIntroPage.lead, '', '소개 문단이 여러 개이면 첫 문단만 리드 영역으로 분리하지 않아야 합니다.');
assert.match(multiIntroPage.body, /^이 문서는 Markdown 렌더링/, '여러 소개 문단은 본문 흐름에 함께 남아야 합니다.');
assert.match(multiIntroPage.body, /각 문법은 `###` 제목/, '두 번째 소개 문단도 본문에 유지해야 합니다.');

const horizontalRuleIntroPage = createDocumentPage([
  '# Couplanit 알고리즘 설계서 v2.0',
  '',
  '> 기준일: 2026-04-11 | 이전 설계 초기화 후 재설계',
  '',
  '---',
  '',
  '## 구조 정의',
  '',
  '본문입니다.'
].join('\n'), 'couplanit.md');

assert.equal(horizontalRuleIntroPage.lead, '', '제목 아래 수평선을 리드 문자열로 분리하지 않아야 합니다.');
assert.match(horizontalRuleIntroPage.body, /^> 기준일: 2026-04-11/, '수평선 앞 인용문은 본문에 유지해야 합니다.');
assert.match(horizontalRuleIntroPage.body, /\n---\n/, '제목 아래 수평선은 본문에 유지해 렌더러가 수평선으로 처리해야 합니다.');

const spacedHorizontalRuleIntroPage = createDocumentPage([
  '# 문서 제목',
  '',
  '- - -',
  '',
  '## 구조 정의',
  '',
  '본문입니다.'
].join('\n'), 'spaced-rule.md');

assert.equal(spacedHorizontalRuleIntroPage.lead, '', '공백이 포함된 수평선도 리드 문자열로 분리하지 않아야 합니다.');
assert.match(spacedHorizontalRuleIntroPage.body, /^- - -/, '공백이 포함된 수평선은 본문에 유지해야 합니다.');

const orderedListIntroPage = createDocumentPage([
  '# 문서 제목',
  '',
  '1. 첫 번째 항목',
  '',
  '## 구조 정의',
  '',
  '본문입니다.'
].join('\n'), 'ordered-list.md');

assert.equal(orderedListIntroPage.lead, '', '순서 목록을 리드 문자열로 분리하지 않아야 합니다.');
assert.match(orderedListIntroPage.body, /^1\. 첫 번째 항목/, '순서 목록은 본문에 유지해야 합니다.');

const plusListIntroPage = createDocumentPage([
  '# 문서 제목',
  '',
  '+ 첫 번째 항목',
  '',
  '## 구조 정의',
  '',
  '본문입니다.'
].join('\n'), 'plus-list.md');

assert.equal(plusListIntroPage.lead, '', '더하기 기호 목록을 리드 문자열로 분리하지 않아야 합니다.');
assert.match(plusListIntroPage.body, /^\+ 첫 번째 항목/, '더하기 기호 목록은 본문에 유지해야 합니다.');

const indentedCodeIntroPage = createDocumentPage([
  '# 문서 제목',
  '',
  '    const value = 1;',
  '',
  '## 구조 정의',
  '',
  '본문입니다.'
].join('\n'), 'indented-code.md');

assert.equal(indentedCodeIntroPage.lead, '', '들여쓴 코드 블록을 리드 문자열로 분리하지 않아야 합니다.');
assert.match(indentedCodeIntroPage.body, /^    const value = 1;/, '들여쓴 코드 블록은 본문에 유지해야 합니다.');

const underscoreHorizontalRuleIntroPage = createDocumentPage([
  '# 문서 제목',
  '',
  '_ _ _',
  '',
  '## 구조 정의',
  '',
  '본문입니다.'
].join('\n'), 'underscore-rule.md');

assert.equal(underscoreHorizontalRuleIntroPage.lead, '', '공백이 포함된 밑줄 수평선도 리드 문자열로 분리하지 않아야 합니다.');
assert.match(underscoreHorizontalRuleIntroPage.body, /^_ _ _/, '공백이 포함된 밑줄 수평선은 본문에 유지해야 합니다.');

const mixedFenceMarkerPage = createDocumentPage([
  '# 문서 제목',
  '',
  '```markdown',
  '~~~',
  '## 코드 내부 제목',
  '```',
  '',
  '## 실제 목차'
].join('\n'), 'mixed-fence.md');

assert.equal(mixedFenceMarkerPage.outline.length, 1, '다른 fence 기호가 코드블록 내부에 있어도 코드블록 상태를 유지해야 합니다.');
assert.equal(mixedFenceMarkerPage.outline[0].text, '실제 목차', '코드블록 내부 제목은 목차에 포함하지 않아야 합니다.');

const indentedHeadingPage = createDocumentPage([
  '  # 문서 제목',
  '',
  '요약 문장입니다.',
  '',
  '   ## 구조 정의',
  '',
  '본문입니다.'
].join('\n'), 'indented-heading.md');

assert.equal(indentedHeadingPage.title, '문서 제목', '최대 3칸 들여쓴 문서 제목을 인식해야 합니다.');
assert.equal(indentedHeadingPage.outline[0].text, '구조 정의', '최대 3칸 들여쓴 섹션 제목을 목차에 포함해야 합니다.');

const fourSpaceHeadingPage = createDocumentPage([
  '    # 코드 제목',
  '',
  '## 실제 목차'
].join('\n'), 'four-space-heading.md');

assert.equal(fourSpaceHeadingPage.title, 'four-space-heading.md', '4칸 들여쓴 제목 표기는 코드로 보고 문서 제목으로 사용하지 않아야 합니다.');
assert.equal(fourSpaceHeadingPage.outline[0].text, '실제 목차', '4칸 들여쓴 제목 표기는 목차에 포함하지 않아야 합니다.');

console.log('문서 페이지 분리 테스트 통과');
