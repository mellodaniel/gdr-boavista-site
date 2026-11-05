import React from 'react';
import {createRoot} from 'react-dom/client';
import Dashboard from './Dashboard';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Dashboard manage={location.pathname.startsWith('/mapa-jogos/gestao/')} /></React.StrictMode>);
