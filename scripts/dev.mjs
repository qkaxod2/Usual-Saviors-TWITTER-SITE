import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {database} from './db-adapter.mjs';
import worker from '../server/worker.js';
import bcrypt from 'bcryptjs';
fs.mkdirSync('.local',{recursive:true});const DB=database('.local/development.sqlite');
const env={DB,ADMIN_PASSWORD_HASH:await bcrypt.hash('development-admin-only',12),APP_ORIGIN:'http://127.0.0.1:5178',ASSETS:{async fetch(req){let name=decodeURIComponent(new URL(req.url).pathname);if(name==='/')name='/index.html';const root=path.resolve('dist/client'),file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Not found',{status:404});const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};return new Response(fs.readFileSync(file),{headers:{'content-type':types[path.extname(file)]||'application/octet-stream'}})}}};
http.createServer(async(req,res)=>{try{const request=new Request('http://127.0.0.1:5178'+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:req,duplex:'half'});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch{res.writeHead(500);res.end('Local server error')}}).listen(5178,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5178/'));
