import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'mapa-piloto',envDir:'..',base:'/mapa-jogos/',plugins:[react()],build:{outDir:'../dist/mapa-jogos',emptyOutDir:true}});
