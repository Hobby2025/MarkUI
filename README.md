# MarkUI

MarkUI는 VS Code에서 Markdown 문서를 React 기반 컴포넌트형 미리보기로 보여주는 확장 프로그램입니다.

## 개발

```powershell
npm install
npm test
npm run check
npm run build
```

VS Code에서 이 폴더를 열고 `F5`로 확장 개발 호스트를 실행한 뒤, Markdown 파일에서 `MarkUI: Markdown 미리보기 열기` 명령을 실행합니다.

## Markdown 지원 범위

MarkUI는 `markdown-it` 렌더링 파이프라인을 사용해 CommonMark 기반 문법과 표, 취소선, 작업 목록, 각주, 코드 강조, 자동 링크를 지원합니다. 원본 HTML은 Webview 보안을 위해 실행 가능한 HTML로 렌더링하지 않고 이스케이프합니다.
