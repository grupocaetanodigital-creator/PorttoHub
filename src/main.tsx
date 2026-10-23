import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { inicializarTema } from './services/themeService.ts';

// Inicializa o tema (Modo Claro ou Modo Escuro) no <html> e <body>
inicializarTema();

createRoot(document.getElementById('root')!).render(<App />);
