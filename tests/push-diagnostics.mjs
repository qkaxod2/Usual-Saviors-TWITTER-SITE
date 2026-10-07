import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDiagnostic,acceptDiagnostic} from '../server/push-diagnostics.js';
import {database} from '../scripts/db-adapter.mjs';
import worker from '../server/worker.js';
const env={PUSH_PRIVATE_KEY:'test-secret',DB:database()};
env.DB.native.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run('a','Nockcho','a','unused','admin','active',Date.now());
const fail=(status,message)=>{throw Object.assign(Error(message),{status})};
const diagnostic=await createDiagnostic(env);
const record=await acceptDiagnostic(env,{diagnostic,stage:'display_error',sequence:4,permission:'denied',error:'NotAllowedError',body:'NEVER_LOG',endpoint:'NEVER_LOG'},fail);
assert.equal(record.error,'NotAllowedError');assert.ok(!JSON.stringify(record).includes('NEVER_LOG'));
for(const d of [{...diagnostic,proof:'0'.repeat(64)},{...diagnostic,expires:Date.now()-1},{...diagnostic,id:crypto.randomUUID()}])await assert.rejects(acceptDiagnostic(env,{diagnostic:d,stage:'received'},fail),e=>e.status===403);
await assert.rejects(acceptDiagnostic(env,{diagnostic,stage:'arbitrary secret text'},fail),e=>e.status===400);
assert.equal((await acceptDiagnostic(env,{diagnostic,stage:'lookup_error',error:'SECRET'},fail)).error,null);
const logs=[],originalLog=console.log;console.log=(...args)=>logs.push(args.join(' '));
try{
 const req=()=>new Request('https://test.example/api/push/diagnostics',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'usual-saviors'},body:JSON.stringify({diagnostic,stage:'account_missing'})});
 assert.equal((await worker.fetch(req(),env)).status,200,'signed receipt reports missing login without gaining account access');
 assert.match(logs[0],/account_missing/);assert.ok(!logs.join('').includes(diagnostic.proof));
 const forged=new Request('https://test.example/api/push/diagnostics',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'usual-saviors'},body:JSON.stringify({diagnostic:{...diagnostic,proof:'0'.repeat(64)},stage:'received'})});
 assert.equal((await worker.fetch(forged,env)).status,403);
 const cross=req();cross.headers.set('origin','https://evil.example');assert.equal((await worker.fetch(cross,env)).status,403);
 for(let i=1;i<40;i++)assert.equal((await worker.fetch(req(),env)).status,200);
 assert.equal((await worker.fetch(req(),env)).status,429,'bounded receipts per test');
}finally{console.log=originalLog;env.DB.native.close()}

async function run({user='a',error=null,lookupStatus=200,diagnostics=true,telemetryFails=false,recover=false}={}){
 const events={},receipts=[],messages=[];let shows=0;
 const saved=new Map();
 const self={addEventListener:(type,fn)=>events[type]=fn,clients:{matchAll:async()=>[{postMessage:m=>messages.push(m)}]},registration:{showNotification:async()=>{shows++;if(error)throw Object.assign(Error('PRIVATE_MESSAGE'),{name:error})},getNotifications:async()=>[]}};
 const fetcher=async(url,options)=>{
  if(url==='/api/push/diagnostics'){receipts.push(JSON.parse(options.body));if(telemetryFails)throw Error('offline');return {ok:true}}
  assert.equal(url,'/api/me');return {ok:lookupStatus===200,status:lookupStatus,json:async()=>({user:user?{id:user}:null})};
 };
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self,Notification:{permission:error?'denied':'granted'},fetch:fetcher,AbortSignal,structuredClone,Date,Response,URL,caches:{open:async name=>({match:async key=>saved.get(name+key)?.clone(),put:async(key,value)=>{saved.set(name+key,value.clone())}})},setTimeout:fn=>{fn();return 0},console:{warn(){}},encodeURIComponent});
 let wait;events.push({data:{json:()=>({test:true,userId:'a',...(diagnostics?{diagnostic}:{})})},waitUntil:p=>wait=p});await wait;
 assert.ok(!JSON.stringify(receipts).includes('PRIVATE_MESSAGE'));assert.ok(messages.every(m=>!m.diagnostic&&!m.userId));
 if(recover){assert.ok(messages.some(m=>m.report==='failed'));telemetryFails=false;events.message({data:{type:'push-diagnostic-replay'},waitUntil:p=>wait=p});await wait;assert.ok(messages.some(m=>m.report==='accepted'))}
 return {receipts,messages,shows};
}
let r=await run();assert.ok(r.receipts.some(x=>x.stage==='display_ok'));assert.equal(r.shows,1);
r=await run({error:'NotAllowedError'});assert.equal(r.receipts.at(-1).stage,'display_error');assert.equal(r.receipts.at(-1).error,'NotAllowedError');
r=await run({user:null});assert.ok(r.receipts.some(x=>x.stage==='account_missing'));assert.equal(r.shows,0);
r=await run({user:'b'});assert.ok(r.receipts.some(x=>x.stage==='account_mismatch'));assert.equal(r.shows,0);
r=await run({lookupStatus:401});assert.ok(r.receipts.some(x=>x.stage==='lookup_http_error'&&x.httpStatus===401));assert.equal(r.shows,0);
r=await run({telemetryFails:true});assert.equal(r.shows,1,'reporting failure cannot prevent display');assert.equal(r.receipts.length,15,'three bounded attempts for each of five stages');assert.ok(r.messages.some(m=>m.report==='failed'));
await run({telemetryFails:true,recover:true});
r=await run({diagnostics:false});assert.equal(r.receipts.length,0,'ordinary pushes never opt into diagnostics');assert.equal(r.shows,1);
console.log('Diagnostic signing, expiry, allowlists, no-login receipts, rate limit, display failure, account failures and non-interference verified.');
