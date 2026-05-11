import { parseMarkdownDocument } from '../../extension/markdownDocument';
import { createHeadingId } from './markdownRenderer';

export type DocumentPage = {
  title: string;
  lead: string;
  body: string;
  outline: OutlineItem[];
};

export type OutlineItem = {
  id: string;
  level: number;
  text: string;
};

export type OutlineNode = OutlineItem & {
  children: OutlineNode[];
};

type LineWithFenceState = {
  line: string;
  index: number;
  isInsideFence: boolean;
};

export function createDocumentPage(text: string, fileTitle: string): DocumentPage {
  const parsedDocument = parseMarkdownDocument(text);
  const normalizedText = trimBlankLines(parsedDocument.body.split(/\r?\n/)).join('\n');

  if (!normalizedText) {
    return {
      title: fileTitle,
      lead: '',
      body: '',
      outline: []
    };
  }

  const lines = normalizedText.split(/\r?\n/);
  const lineStates = createLineFenceStates(lines);
  const titleLine = lineStates.find(({ isInsideFence, line }) => !isInsideFence && /^ {0,3}#\s+/.test(line));
  const title = titleLine
    ? cleanMarkdownTitle(titleLine.line.replace(/^ {0,3}#\s+/, ''))
    : findMetadataTitle(parsedDocument.metadata) || fileTitle;
  const contentLines = titleLine
    ? lines.filter((_, index) => index !== titleLine.index)
    : lines;
  const contentLineStates = titleLine
    ? createLineFenceStates(contentLines)
    : lineStates;
  const leadLine = findLeadLine(contentLineStates);
  const lead = leadLine ? cleanMarkdownTitle(leadLine.line) : '';
  const bodyLines = leadLine
    ? contentLines.filter((_, index) => index !== leadLine.index)
    : contentLines;

  return {
    title,
    lead,
    body: trimBlankLines(bodyLines).join('\n'),
    outline: extractOutline(bodyLines)
  };
}

export function buildOutlineTree(items: OutlineItem[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  items.forEach((item) => {
    const node: OutlineNode = {
      ...item,
      children: []
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  });

  return roots;
}

function extractOutline(lines: string[]): OutlineItem[] {
  return createLineFenceStates(lines)
    .map(({ isInsideFence, line }, index) => {
      if (isInsideFence) {
        return undefined;
      }

      const heading = line.match(/^ {0,3}(#{2,4})\s+(.+)$/);

      if (!heading) {
        return undefined;
      }

      const text = cleanMarkdownTitle(heading[2]);

      return {
        id: createHeadingId(text, index),
        level: heading[1].length,
        text
      };
    })
    .filter((item): item is OutlineItem => Boolean(item));
}

function findLeadLine(lineStates: LineWithFenceState[]): LineWithFenceState | undefined {
  const firstSectionHeadingIndex = lineStates.findIndex(({ isInsideFence, line }) => {
    return !isInsideFence && /^ {0,3}(#{2,4})\s+(.+)$/.test(line);
  });
  const introLineStates = firstSectionHeadingIndex >= 0
    ? lineStates.slice(0, firstSectionHeadingIndex)
    : lineStates;
  const plainParagraphLines = introLineStates.filter(({ isInsideFence, line }) => {
    return !isInsideFence && isPlainParagraph(line);
  });

  return plainParagraphLines.length === 1 ? plainParagraphLines[0] : undefined;
}

function createLineFenceStates(lines: string[]): LineWithFenceState[] {
  let openFence: { marker: '`' | '~'; length: number } | undefined;

  return lines.map((line, index) => {
    const currentState = {
      line,
      index,
      isInsideFence: Boolean(openFence)
    };

    if (openFence) {
      if (isClosingFenceLine(line, openFence)) {
        openFence = undefined;
      }
      return currentState;
    }

    const openingFence = findOpeningFence(line);

    if (openingFence) {
      openFence = openingFence;
    }

    return currentState;
  });
}

function findOpeningFence(line: string): { marker: '`' | '~'; length: number } | undefined {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})/);

  if (!match) {
    return undefined;
  }

  const marker = match[1][0] as '`' | '~';
  return {
    marker,
    length: match[1].length
  };
}

function isClosingFenceLine(line: string, openFence: { marker: '`' | '~'; length: number }): boolean {
  const escapedMarker = openFence.marker === '`' ? '`' : '~';
  const match = line.match(new RegExp(`^ {0,3}(${escapedMarker}{${openFence.length},})\\s*$`));
  return Boolean(match);
}

function isPlainParagraph(line: string): boolean {
  const trimmed = line.trim();

  return Boolean(
    trimmed &&
    !isIndentedCodeLine(line) &&
    !isMarkdownBlockStartLine(trimmed)
  );
}

function isMarkdownBlockStartLine(line: string): boolean {
  return Boolean(
    line.startsWith('#') ||
    line.startsWith('>') ||
    line.startsWith('|') ||
    line.startsWith('```') ||
    line.startsWith('~~~') ||
    /^[-*+]\s+/.test(line) ||
    /^\d{1,9}[.)]\s+/.test(line) ||
    /^<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s|>|\/>)/.test(line) ||
    isHorizontalRuleLine(line)
  );
}

function isHorizontalRuleLine(line: string): boolean {
  return /^(?:-\s*){3,}$|^(?:\*\s*){3,}$|^(?:_\s*){3,}$/.test(line);
}

function isIndentedCodeLine(line: string): boolean {
  return /^( {4}|\t)/.test(line);
}

function cleanMarkdownTitle(value: string): string {
  return value.replace(/[#*_`~[\]()]/g, '').trim();
}

function findMetadataTitle(metadata: { key: string; value: string }[]): string {
  return metadata.find((item) => item.key === 'title')?.value ?? '';
}

function trimBlankLines(lines: string[]): string[] {
  let startIndex = 0;
  let endIndex = lines.length;

  while (startIndex < endIndex && lines[startIndex].trim() === '') {
    startIndex += 1;
  }

  while (endIndex > startIndex && lines[endIndex - 1].trim() === '') {
    endIndex -= 1;
  }

  return lines.slice(startIndex, endIndex);
}
