# MarkUI Markdown Writing Guide

This guide defines writing conventions for Markdown documents that should render predictably in MarkUI.

## Core Principles

- Use CommonMark syntax as the baseline.
- Use GitHub Flavored Markdown-style syntax only within the range supported by MarkUI.
- Raw HTML is not rendered as executable HTML for security reasons.
- Consider document structure, accessibility, and mobile rendering together.

## Document Structure

- Use the first `#` heading as the document title.
- Use only one `#` heading in a document.
- Use `##` for major sections, `###` for subsections, and `####` for deeper supporting sections.
- Increase heading levels one step at a time.
- Avoid `#####` and `######` unless the document is a complex reference.
- Keep the opening introduction short and clear.

## Outline Rules

MarkUI uses `##`, `###`, and `####` headings in the body as outline entries.

- Write unique headings for the outline.
- Do not include URLs, code snippets, or unnecessary punctuation in headings.
- Prefer noun phrases or short phrases that identify the section content.

## Supported Syntax

| Type | Syntax | Handling |
| --- | --- | --- |
| Basic | Headings, paragraphs, blockquotes, lists, links, images, code, horizontal rules | Rendered |
| GFM-style | Tables, strikethrough, task lists, autolinks | Rendered |
| MarkUI extensions | Footnotes, code copy, heading IDs, outline | Rendered |
| HTML | `<script>`, `<details>`, `<kbd>`, and similar tags | Escaped as text |
| Unsupported extensions | Definition lists, math, diagrams | Displayed by regular Markdown rules |

## Links

- Link text should describe the destination and purpose.
- Avoid weak standalone text such as `here`, `click`, or `learn more`.
- Prefer `https` URLs for external links when possible.
- Prefer explicit links such as `[Document title](https://example.com)` over autolinks.

## Images

- Include alternative text for every image.
- Describe the image meaning instead of repeating the file name.
- For information-heavy images such as charts, screenshots, or diagrams, explain the key content in nearby body text.
- Use decorative images only when they are necessary for the document.

## Tables

- Use tables only for data where row and column relationships matter, such as comparisons, states, or values.
- Do not use tables for layout.
- Summarize what the table describes in a sentence before the table.
- Keep column headings short and specific.
- Move long explanations outside the table body.
- Keep the same number of columns in every row.

## Code Blocks

- Prefer fenced code blocks for examples.
- Specify the language when possible.
- Use `text` for plain text examples.
- For command examples, choose a specific language such as `powershell`, `bash`, `json`, `ts`, or `sql` based on the runtime.
- Use indented code blocks only when needed for compatibility with existing documents.

```powershell
npm install
npm test
npm run build
```

## Task Lists

- Use task lists only when they represent real progress.
- Use `- [x]` for completed items and `- [ ]` for incomplete items.
- If a task list item needs a long explanation, move the explanation into a nested list or a separate paragraph.

## Footnotes

- Use footnotes for supplemental explanations or sources that should not interrupt the body flow.
- Keep essential information in the body, not in footnotes.
- Preserve indentation for multi-line footnotes.

## Security

- HTML inside Markdown is not rendered as executable HTML.
- HTML comments may be removed from the document body, so write user-visible information in regular Markdown.
- Do not put sensitive information, tokens, internal paths, or personal information in HTML comments or metadata.

## Checklist

- [ ] The document has only one `#` heading.
- [ ] Heading levels increase one step at a time.
- [ ] Link text describes the destination.
- [ ] Images include meaningful alternative text.
- [ ] Tables are used only for real tabular data.
- [ ] Code blocks specify a language when possible.
- [ ] The document does not rely on executable HTML.
