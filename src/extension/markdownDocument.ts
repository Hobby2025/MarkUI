export type MarkdownMetadataItem = {
  key: string;
  label: string;
  value: string;
};

export type ParsedMarkdownDocument = {
  body: string;
  metadata: MarkdownMetadataItem[];
};

type LineToken = {
  content: string;
  lineEnding: string;
  full: string;
};

const metadataLabels: Record<string, string> = {
  author: 'Author',
  created: 'Created',
  createdat: 'Created',
  date: 'Date',
  description: 'Description',
  generated: 'Generated',
  modified: 'Modified',
  parent: 'Parent',
  summary: 'Summary',
  tags: 'Tags',
  title: 'Title',
  updated: 'Updated',
  updatedat: 'Updated'
};

const multiMarkdownKeys = new Set([
  'author',
  'created',
  'createdat',
  'date',
  'description',
  'modified',
  'summary',
  'tags',
  'title',
  'updated',
  'updatedat'
]);

export function parseMarkdownDocument(source: string): ParsedMarkdownDocument {
  const sourceWithoutBom = source.replace(/^\uFEFF/, '');
  const lines = splitLines(sourceWithoutBom);
  const metadata: MarkdownMetadataItem[] = [];
  const cursor = consumeLeadingMetadata(lines, metadata);
  const body = stripMarkdownHtmlCommentsWithMetadata(lines.slice(cursor).map((line) => line.full).join(''), metadata);

  return {
    body,
    metadata: dedupeMetadata(metadata)
  };
}

export function stripMarkdownHtmlComments(source: string): string {
  return stripMarkdownHtmlCommentsWithMetadata(source);
}

function stripMarkdownHtmlCommentsWithMetadata(source: string, metadata?: MarkdownMetadataItem[]): string {
  const lines = splitLines(source);
  let isInsideFence = false;
  let isInsideComment = false;
  let commentParts: string[] = [];

  return lines.map((line) => {
    if (!isInsideComment && isFenceLine(line.content)) {
      isInsideFence = !isInsideFence;
      return line.full;
    }

    if (!isInsideComment && (isInsideFence || isIndentedCodeLine(line.content))) {
      return line.full;
    }

    return `${stripHtmlCommentsFromLine(
      line.content,
      (nextState) => {
        isInsideComment = nextState;
      },
      isInsideComment,
      commentParts,
      (nextCommentParts) => {
        commentParts = nextCommentParts;
      },
      (commentContent) => {
        if (metadata) {
          collectHtmlCommentMetadata(commentContent, metadata);
        }
      }
    )}${line.lineEnding}`;
  }).join('');
}

export function getMetadataValue(metadata: MarkdownMetadataItem[], key: string): string {
  const normalizedKey = normalizeKey(key);
  return metadata.find((item) => normalizeKey(item.key) === normalizedKey)?.value ?? '';
}

function consumeLeadingMetadata(lines: LineToken[], metadata: MarkdownMetadataItem[]): number {
  let cursor = 0;

  while (cursor < lines.length && isBlank(lines[cursor].content)) {
    cursor += 1;
  }

  cursor = consumeLeadingHtmlComments(lines, cursor, metadata);

  while (cursor < lines.length && isBlank(lines[cursor].content)) {
    cursor += 1;
  }

  const frontMatterCursor = consumeFrontMatter(lines, cursor, metadata);

  if (frontMatterCursor !== cursor) {
    cursor = frontMatterCursor;

    while (cursor < lines.length && isBlank(lines[cursor].content)) {
      cursor += 1;
    }
  } else {
    const pandocCursor = consumePandocTitleBlock(lines, cursor, metadata);

    if (pandocCursor !== cursor) {
      cursor = pandocCursor;
    } else {
      cursor = consumeMultiMarkdownMetadata(lines, cursor, metadata);
    }
  }

  while (cursor < lines.length && isBlank(lines[cursor].content)) {
    cursor += 1;
  }

  return cursor;
}

function consumeLeadingHtmlComments(lines: LineToken[], cursor: number, metadata: MarkdownMetadataItem[]): number {
  let nextCursor = cursor;

  while (nextCursor < lines.length) {
    const startLine = lines[nextCursor].content;
    const commentStart = startLine.indexOf('<!--');

    if (commentStart < 0 || startLine.slice(0, commentStart).trim()) {
      return nextCursor;
    }

    const commentLines: string[] = [];
    let scanCursor = nextCursor;
    let commentEnded = false;

    while (scanCursor < lines.length) {
      const content = lines[scanCursor].content;
      commentLines.push(content);

      if (content.includes('-->')) {
        commentEnded = true;
        break;
      }

      scanCursor += 1;
    }

    if (!commentEnded) {
      return nextCursor;
    }

    collectHtmlCommentMetadata(commentLines.join('\n'), metadata);
    nextCursor = scanCursor + 1;

    while (nextCursor < lines.length && isBlank(lines[nextCursor].content)) {
      nextCursor += 1;
    }
  }

  return nextCursor;
}

function consumeFrontMatter(lines: LineToken[], cursor: number, metadata: MarkdownMetadataItem[]): number {
  if (cursor >= lines.length) {
    return cursor;
  }

  const marker = lines[cursor].content.trim();

  if (marker === '---') {
    const endCursor = findClosingMarker(lines, cursor + 1, ['---', '...']);

    if (endCursor < 0) {
      return cursor;
    }

    collectKeyValueMetadata(lines.slice(cursor + 1, endCursor).map((line) => line.content), ':', metadata);
    return endCursor + 1;
  }

  if (marker === '+++') {
    const endCursor = findClosingMarker(lines, cursor + 1, ['+++']);

    if (endCursor < 0) {
      return cursor;
    }

    collectKeyValueMetadata(lines.slice(cursor + 1, endCursor).map((line) => line.content), '=', metadata);
    return endCursor + 1;
  }

  if (marker.startsWith('{')) {
    const jsonBlock = findJsonFrontMatter(lines, cursor);

    if (!jsonBlock) {
      return cursor;
    }

    Object.entries(jsonBlock.value).forEach(([key, value]) => {
      addMetadata(metadata, key, stringifyMetadataValue(value));
    });
    return jsonBlock.endCursor;
  }

  return cursor;
}

function consumePandocTitleBlock(lines: LineToken[], cursor: number, metadata: MarkdownMetadataItem[]): number {
  if (cursor >= lines.length || !lines[cursor].content.startsWith('%')) {
    return cursor;
  }

  const values: string[] = [];
  let nextCursor = cursor;

  while (nextCursor < lines.length && lines[nextCursor].content.startsWith('%')) {
    values.push(lines[nextCursor].content.replace(/^%\s?/, '').trim());
    nextCursor += 1;
  }

  ['title', 'author', 'date'].forEach((key, index) => {
    addMetadata(metadata, key, values[index] ?? '');
  });

  return nextCursor;
}

function consumeMultiMarkdownMetadata(lines: LineToken[], cursor: number, metadata: MarkdownMetadataItem[]): number {
  let nextCursor = cursor;
  const entries: Array<[string, string]> = [];

  while (nextCursor < lines.length) {
    const line = lines[nextCursor].content;

    if (isBlank(line)) {
      break;
    }

    const entry = parseKeyValueLine(line, ':');

    if (!entry || !multiMarkdownKeys.has(normalizeKey(entry.key))) {
      return cursor;
    }

    entries.push([entry.key, entry.value]);
    nextCursor += 1;
  }

  if (entries.length === 0 || nextCursor >= lines.length || !isBlank(lines[nextCursor].content)) {
    return cursor;
  }

  entries.forEach(([key, value]) => addMetadata(metadata, key, value));
  return nextCursor + 1;
}

function collectHtmlCommentMetadata(comment: string, metadata: MarkdownMetadataItem[]): void {
  const content = comment
    .replace(/^\s*<!--/, '')
    .replace(/-->\s*$/, '')
    .trim();

  content.split('|').forEach((part) => {
    const entry = parseKeyValueLine(part.trim(), ':');

    if (entry) {
      addMetadata(metadata, entry.key, entry.value);
    }
  });
}

function collectKeyValueMetadata(lines: string[], separator: ':' | '=', metadata: MarkdownMetadataItem[]): void {
  lines.forEach((line) => {
    const entry = parseKeyValueLine(line, separator);

    if (entry) {
      addMetadata(metadata, entry.key, entry.value);
    }
  });
}

function parseKeyValueLine(line: string, separator: ':' | '='): { key: string; value: string } | undefined {
  const separatorIndex = line.indexOf(separator);

  if (separatorIndex <= 0) {
    return undefined;
  }

  const key = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();

  if (!/^[\p{Letter}\p{Number}_ -]+$/u.test(key)) {
    return undefined;
  }

  return {
    key,
    value: normalizeMetadataValue(value)
  };
}

function findJsonFrontMatter(
  lines: LineToken[],
  cursor: number
): { value: Record<string, unknown>; endCursor: number } | undefined {
  let block = '';

  for (let index = cursor; index < lines.length; index += 1) {
    block += lines[index].full;

    try {
      const parsed = JSON.parse(block) as unknown;

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return undefined;
      }

      const nextLine = lines[index + 1];

      if (nextLine && !isBlank(nextLine.content)) {
        return undefined;
      }

      return {
        value: parsed as Record<string, unknown>,
        endCursor: index + 1
      };
    } catch {
      continue;
    }
  }

  return undefined;
}

function findClosingMarker(lines: LineToken[], cursor: number, markers: string[]): number {
  for (let index = cursor; index < lines.length; index += 1) {
    if (markers.includes(lines[index].content.trim())) {
      return index;
    }
  }

  return -1;
}

function addMetadata(metadata: MarkdownMetadataItem[], key: string, value: string): void {
  const normalizedValue = normalizeMetadataValue(value);

  if (!normalizedValue) {
    return;
  }

  metadata.push({
    key: normalizeKey(key),
    label: metadataLabels[normalizeKey(key)] ?? key.trim(),
    value: normalizedValue
  });
}

function stringifyMetadataValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(stringifyMetadataValue).filter(Boolean).join(', ');
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return '';
  }

  return String(value);
}

function normalizeMetadataValue(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map((item) => normalizeMetadataValue(item)).filter(Boolean).join(', ');
  }

  return trimmed;
}

function dedupeMetadata(metadata: MarkdownMetadataItem[]): MarkdownMetadataItem[] {
  const seen = new Set<string>();

  return metadata.filter((item) => {
    const signature = `${item.key}\u001f${item.value}`;

    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
}

function splitLines(source: string): LineToken[] {
  return source.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)
    ?.filter((line) => line.length > 0)
    .map((line) => {
      const lineEndingMatch = line.match(/(\r\n|\r|\n)$/);
      const lineEnding = lineEndingMatch?.[0] ?? '';
      const content = lineEnding ? line.slice(0, -lineEnding.length) : line;

      return {
        content,
        lineEnding,
        full: line
      };
    }) ?? [];
}

function stripHtmlCommentsFromLine(
  line: string,
  setCommentState: (isInsideComment: boolean) => void,
  initialCommentState: boolean,
  initialCommentParts: string[] = [],
  setCommentParts: (commentParts: string[]) => void = () => undefined,
  onComment: (commentContent: string) => void = () => undefined
): string {
  let output = '';
  let cursor = 0;
  let isInsideComment = initialCommentState;
  let commentParts = initialCommentParts;

  while (cursor < line.length) {
    if (isInsideComment) {
      const commentEnd = line.indexOf('-->', cursor);

      if (commentEnd < 0) {
        commentParts.push(line.slice(cursor));
        cursor = line.length;
        break;
      }

      commentParts.push(line.slice(cursor, commentEnd));
      onComment(commentParts.join('\n'));
      commentParts = [];
      cursor = commentEnd + 3;
      isInsideComment = false;
      continue;
    }

    const commentStart = line.indexOf('<!--', cursor);

    if (commentStart < 0) {
      output += line.slice(cursor);
      break;
    }

    output += line.slice(cursor, commentStart);
    cursor = commentStart + 4;
    isInsideComment = true;
  }

  setCommentState(isInsideComment);
  setCommentParts(commentParts);
  return output;
}

function isFenceLine(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
}

function isIndentedCodeLine(line: string): boolean {
  return /^( {4}|\t)/.test(line);
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function normalizeKey(key: string): string {
  return key.replace(/[\s_-]/g, '').trim().toLowerCase();
}
