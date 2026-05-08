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

console.log('문서 페이지 분리 테스트 통과');
