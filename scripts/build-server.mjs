import {build} from 'vite';
import path from 'node:path';
await build({configFile:false,resolve:{alias:[{find:'crypto',replacement:path.resolve('server/crypto-shim.js')}]},ssr:{noExternal:true,target:'webworker'},build:{ssr:'server/worker.js',outDir:'dist/server',emptyOutDir:true,minify:true,rollupOptions:{output:{entryFileNames:'index.js'}}}});
