import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';

try {
  // Left behind by an earlier version that offered several designs.
  localStorage.removeItem('passportdiary.design');
} catch {
  // Storage can be unavailable (private mode).
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
