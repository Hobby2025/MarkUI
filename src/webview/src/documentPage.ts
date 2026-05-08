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
  const normalizedText = parsedDocument.body.trim();

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
  const titleLine = lineStates.find(({ isInsideFence, line }) => !isInsideFence && /^#\s+/.test(line));
  const title = titleLine
    ? cleanMarkdownTitle(titleLine.line.replace(/^#\s+/, ''))
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
    body: bodyLines.join('\n').trim(),
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

      const heading = line.match(/^(#{2,4})\s+(.+)$/);

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
    return !isInsideFence && /^(#{2,4})\s+(.+)$/.test(line);
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
  let isInsideFence = false;

  return lines.map((line, index) => {
    const currentState = {
      line,
      index,
      isInsideFence
    };

    if (/^\s*(```|~~~)/.test(line)) {
      isInsideFence = !isInsideFence;
    }

    return currentState;
  });
}

function isPlainParagraph(line: string): boolean {
  const trimmed = line.trim();

  return Boolean(
    trimmed &&
    !trimmed.startsWith('#') &&
    !trimmed.startsWith('- ') &&
    !trimmed.startsWith('* ') &&
    !trimmed.startsWith('>') &&
    !trimmed.startsWith('|') &&
    !trimmed.startsWith('```') &&
    !trimmed.startsWith('~~~')
  );
}

function cleanMarkdownTitle(value: string): string {
  return value.replace(/[#*_`~[\]()]/g, '').trim();
}

function findMetadataTitle(metadata: { key: string; value: string }[]): string {
  return metadata.find((item) => item.key === 'title')?.value ?? '';
}
