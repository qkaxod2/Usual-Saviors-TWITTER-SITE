import {defineConfig} from 'vite';
import {sites} from '@openai/sites-vite-plugin';
import {entryShell} from './scripts/entry-shell.mjs';
export default defineConfig({plugins:[entryShell(),sites()],build:{outDir:'dist/client',emptyOutDir:true}});
