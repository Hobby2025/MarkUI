import React from 'react';
import { createRoot } from 'react-dom/client';
import { MarkdownPreviewApp } from './MarkdownPreviewApp';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('MarkUI root element was not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <MarkdownPreviewApp />
  </React.StrictMode>
);
