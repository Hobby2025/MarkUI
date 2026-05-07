# MarkUI 전체 문법 점검

문단은 **굵게**, *기울임*, ~~취소선~~, `인라인 코드`, 자동 링크 https://example.com 을 포함합니다.
각주도 지원합니다.[^note]

## 목록

- 일반 항목
- [ ] 미완료 작업
- [x] 완료 작업
  1. 중첩 순서 목록
  2. 두 번째 항목

> 인용문 안의 **강조**와 링크 [문서](https://example.com/docs)

---

| 이름 | 값 |
| --- | ---: |
| 표 | 100 |

```ts
const message = 'hello';
console.log(message);
```

![대체 텍스트](https://example.com/image.png)

<script>alert('xss')</script>

[^note]: 각주 본문입니다.
