import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enterSite} from '../client/entry-motion.js';
import {bootMarkup} from '../client/boot-markup.js';
import {entryShell} from '../scripts/entry-shell.mjs';

const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
function element() {
 const classes=new Set(),attrs=new Map();
 return {hidden:false,inert:true,dataset:{},style:{setProperty(){}},
  classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},
  setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),
  querySelector:()=>null,querySelectorAll:()=>[]};
}
async function fixture(run) {
 const keys=['document','performance','innerHeight','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout'];
 const originals=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let now=0,id=0;const timers=new Map(),nodes=new Map();
 for(const name of ['entry-loader','entry-boot','entry-percent','entry-loading-phase','entry-progress','entry-progress-bar','entry-core-status'])nodes.set(name,element());
 const app=element(),body=element();body.classList.add('site-starting');
 const schedule=(fn,delay=0)=>{const key=++id;timers.set(key,{fn,at:now+delay});return key};
 const values={document:{body,fonts:{ready:Promise.resolve()},getElementById:id=>nodes.get(id)},performance:{now:()=>now},innerHeight:900,
  setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>schedule(()=>fn(now),16),cancelAnimationFrame:id=>timers.delete(id)};
 for(const [key,value] of Object.entries(values))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 const advance=async ms=>{const until=now+ms;await flush();for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>until)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush()}now=until;await flush()};
 let reveals=0;
 const reveal=()=>{assert.equal(nodes.get('entry-loader').hidden,true);assert.equal(app.inert,false);assert.equal(body.classList.contains('site-starting'),false);reveals++};
 try{await run({app,body,nodes,advance,reveal,reveals:()=>reveals})}finally{for(const key of keys){if(originals[key])Object.defineProperty(globalThis,key,originals[key]);else delete globalThis[key]}}
}

await fixture(async f=>{
 const data=deferred(),image=deferred();
 const img={decode:()=>image.promise,getBoundingClientRect:()=>({width:100,top:0})};
 f.app.querySelector=selector=>selector.includes('portrait-plane')?img:null;
 const finished=enterSite({...f,load:()=>data.promise,isReduced:()=>false});
 await f.advance(3000);
 assert.equal(f.reveals(),0,'A slow API must keep the UI hidden');
 assert.equal(f.nodes.get('entry-boot').dataset.stage,'2');
 data.resolve();await f.advance(1000);
 assert.equal(f.reveals(),0,'The first portrait must be prepared before the reveal');
 image.resolve();await f.advance(16);
 assert.equal(f.nodes.get('entry-loader').dataset.phase,'ready');
 await f.advance(599);assert.equal(f.reveals(),0,'The completion beat must finish first');
 await f.advance(1);await finished;assert.equal(f.reveals(),1);
});
await fixture(async f=>{
 const finished=enterSite({...f,load:async()=>{},isReduced:()=>false});
 await f.advance(1903);assert.equal(f.nodes.get('entry-loader').dataset.phase,'loading');
 await f.advance(601);await finished;assert.equal(f.reveals(),1,'Fast loads retain the full loading sequence');
});
await fixture(async f=>{
 const finished=enterSite({...f,load:async()=>{},isReduced:()=>true});
 await f.advance(16);await finished;assert.equal(f.reveals(),1,'Reduced motion has no artificial loading delay');
});
await fixture(async f=>{
 const finished=enterSite({...f,load:signal=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason))),isReduced:()=>false});
 await f.advance(15000);await finished;
 assert.equal(f.nodes.get('entry-loader').dataset.phase,'error');
 assert.equal(f.nodes.get('entry-loader').classList.contains('entry-stalled'),true,'A failed startup exposes recovery');
 assert.equal(f.reveals(),0);
});
await fixture(async f=>{
 const img={decode:()=>new Promise(()=>{}),getBoundingClientRect:()=>({width:100,top:0})};
 f.app.querySelector=()=>img;
 const finished=enterSite({...f,load:async()=>{},isReduced:()=>false});
 await f.advance(3200);await finished;assert.equal(f.reveals(),1,'A missing image cannot trap the user');
});
const personnel=bootMarkup(),entry=bootMarkup({entry:true});
const ids=[...((personnel+entry).matchAll(/id="([^"]+)"/g))].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'The two loading screens must not share DOM IDs');
const html=entryShell().transformIndexHtml(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
assert.ok(html.indexOf('id="entry-loader"')<html.indexOf('src="/client/app.js"'));
assert.match(html,/id="app" inert aria-hidden="true"/);
assert.match(html,/body\.site-starting #app \{ visibility: hidden/);
console.log('Initial HTML, slow data/images, completion ordering, recovery and reduced motion verified.');
