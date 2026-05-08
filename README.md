# MarkUI

MarkUI is a VS Code extension that presents Markdown documents in a React-powered, component-style preview.

## Features

- Preview Markdown documents on a wide, structured canvas that feels closer to a web document.
- Build the document title, outline, and metadata automatically.
- Support code copy buttons, syntax highlighting, tables, task lists, and footnotes.
- Escape raw HTML instead of executing it in the Webview.

## Usage

1. Open a Markdown file in VS Code.
2. Select the MarkUI icon in the editor title bar, or run `Open Markdown Preview` from the Command Palette.
3. Review the document in the preview tab.

## Supported Syntax

MarkUI uses a `markdown-it` based rendering pipeline.

- CommonMark basics: headings, paragraphs, blockquotes, lists, links, images, code, and horizontal rules
- GitHub Flavored Markdown-style syntax: tables, strikethrough, task lists, and autolinks
- MarkUI extensions: footnotes, code block copy buttons, heading IDs, and an outline
- Code blocks: fenced code blocks and indented code blocks

HTML tags are displayed as text instead of executable HTML. HTML-based extensions such as `<details>` and `<kbd>` are escaped the same way.

## Writing Guidelines

- Use a single `#` heading per document.
- Use `##` for main sections, `###` for subsections, and `####` only when needed.
- Increase heading levels one step at a time.
- Write link text that describes the destination.
- Include meaningful alternative text for images.
- Use tables only for real tabular data, and introduce each table with a short summary sentence.
- Prefer fenced code blocks and specify the language when possible.

See `docs/markdown-style-guide.md` for the full writing guide.

## Security

Raw HTML is not rendered as executable HTML in the VS Code Webview. HTML tags inside Markdown are escaped as text.

## Development

```powershell
npm install
npm test
npm run check
npm run build
```

Open this folder in VS Code, press `F5` to launch the Extension Development Host, then run `MarkUI: Open Markdown Preview` from a Markdown file.
