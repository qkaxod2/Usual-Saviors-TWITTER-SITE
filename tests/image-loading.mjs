import assert from 'node:assert/strict';
import {watchImage} from '../client/image-loading.js';
const originalSetTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout;
let sequence=0;const timers=new Map();
globalThis.setTimeout=callback=>{timers.set(++sequence,callback);return sequence};
globalThis.clearTimeout=id=>timers.delete(id);
const tick=()=>{const queued=[...timers.values()];timers.clear();queued.forEach(callback=>callback())};
const flush=async()=>{await Promise.resolve();await Promise.resolve()};
class Image extends EventTarget{
 complete=false;naturalWidth=0;decode=()=>Promise.resolve();
}
const observe=image=>{const events=[];const dispose=watchImage(image,{pending:()=>events.push('pending'),ready:()=>events.push('ready'),failed:()=>events.push('error')});return{events,dispose}};
try{
 const cached=new Image();cached.complete=true;cached.naturalWidth=400;
 const c=observe(cached);tick();assert.deepEqual(c.events,['ready'],'cached images never flash a loader');c.dispose();
 const fast=new Image(),f=observe(fast);fast.dispatchEvent(new Event('load'));await flush();tick();
 assert.deepEqual(f.events,['ready'],'fast loads do not acquire an artificial minimum delay');f.dispose();
 let decode;const slow=new Image();slow.decode=()=>new Promise(resolve=>decode=resolve);
 const s=observe(slow);tick();slow.dispatchEvent(new Event('load'));await flush();
 assert.deepEqual(s.events,['pending'],'loading stays visible until the actual image is decoded');
 decode();await flush();assert.deepEqual(s.events,['pending','ready']);s.dispose();
 const broken=new Image(),b=observe(broken);tick();broken.dispatchEvent(new Event('error'));
 assert.deepEqual(b.events,['pending','error'],'a failed image stops the moving loader');b.dispose();
 let staleDecode;const stale=new Image();stale.decode=()=>new Promise(resolve=>staleDecode=resolve);
 const old=observe(stale);tick();stale.dispatchEvent(new Event('load'));old.dispose();staleDecode();await flush();
 assert.deepEqual(old.events,['pending'],'late callbacks from removed characters cannot affect the next image');
 const gone=observe(new Image());gone.dispose();tick();assert.deepEqual(gone.events,[],'removed lazy images leave no pending loader');
 console.log('Image loading: cached/fast paths, real decode completion, failure and detached-image cleanup verified.');
}finally{globalThis.setTimeout=originalSetTimeout;globalThis.clearTimeout=originalClearTimeout}
