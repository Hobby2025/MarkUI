import React from 'react';
import { createRoot } from 'react-dom/client';
import { MarkdownPreviewApp } from './MarkdownPreviewApp';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('MarkUI 루트 요소를 찾을 수 없습니다.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <MarkdownPreviewApp />
  </React.StrictMode>
);
