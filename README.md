# MarkUI

MarkUI는 VS Code에서 Markdown 문서를 React 기반 컴포넌트형 미리보기로 보여주는 확장 프로그램입니다.

## 주요 기능

- Markdown 문서를 웹 문서처럼 넓고 정돈된 캔버스로 미리봅니다.
- 문서 제목, 목차, 메타데이터를 자동으로 구성합니다.
- 코드 블록 복사, 코드 하이라이트, 표, 작업 목록, 각주를 지원합니다.
- Webview 보안을 위해 원본 HTML은 실행하지 않고 안전하게 이스케이프합니다.

## 사용 방법

1. VS Code에서 Markdown 파일을 엽니다.
2. 에디터 우측 상단의 MarkUI 아이콘을 누르거나 명령 팔레트에서 `Markdown 미리보기 열기`를 실행합니다.
3. 열린 미리보기 탭에서 문서를 확인합니다.

## 지원 문법

MarkUI는 `markdown-it` 기반 렌더링 파이프라인을 사용합니다.

- 제목, 문단, 인용문, 목록, 링크, 이미지, 코드, 수평선
- 표, 취소선, 작업 목록, 각주
- fenced code block과 들여쓰기 code block
- 자동 링크

## 보안

VS Code Webview에서 안전하게 동작하도록 원본 HTML은 실행 가능한 HTML로 렌더링하지 않습니다. Markdown 안의 HTML 태그는 텍스트로 이스케이프됩니다.

## 개발

```powershell
npm install
npm test
npm run check
npm run build
```

VS Code에서 이 폴더를 열고 `F5`로 확장 개발 호스트를 실행한 뒤, Markdown 파일에서 `MarkUI: Markdown 미리보기 열기` 명령을 실행합니다.
