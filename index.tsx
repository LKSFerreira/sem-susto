import React from 'react';
import ReactDOM from 'react-dom/client';
// Font Awesome - Importação via JS para garantir carregamento correto das fontes pelo Vite
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App';
import { ProvedorRepositorios } from './contextos/ContextoRepositorios';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ProvedorRepositorios>
      <App />
    </ProvedorRepositorios>
  </React.StrictMode>
);