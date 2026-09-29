import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { initDesign } from './designs/design.ts';
import './styles.css';
import './designs/shared.css';
import './designs/one.css';
import './designs/two.css';
import './designs/three.css';

initDesign();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
