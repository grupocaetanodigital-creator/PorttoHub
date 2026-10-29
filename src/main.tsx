import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { inicializarTema } from './services/themeService';

// Inicializa o tema ativo (Claro ou Escuro) antes da montagem inicial
inicializarTema();

createRoot(document.getElementById('root')!).render(<App />);

