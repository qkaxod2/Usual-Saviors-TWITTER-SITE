const CACHE='usual-saviors-offline-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/icons/app-192.png','/icons/badge.png'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('usual-saviors-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
// Account data and actual app pages always come from the network, never a shared offline cache.
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))});
const PUSH_STATE='usual-saviors-push-state-v1',STATE_URL='/__push-display-state__';
let pushSerial=Promise.resolve(),memoryState={seen:{},groups:{},lastSound:0};
const DIAGNOSTIC_VERSION='push-diag-v2';
const DIAG_CACHE='usual-saviors-diagnostic-v2',DIAG_URL='/__push-diagnostics__';
let diagnosticWrites=Promise.resolve();
async function publishDiagnostic(record){
 try{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows)client.postMessage({type:'push-diagnostic',version:DIAGNOSTIC_VERSION,...record})}catch{}
}
function saveDiagnostic(entry){
 const task=diagnosticWrites.then(async()=>{
  const cache=await caches.open(DIAG_CACHE),saved=await cache.match(DIAG_URL);
  const rows=saved?await saved.json():[];
  const keep=rows.filter(x=>x.diagnostic.expires>Date.now()&&!(x.diagnostic.id===entry.diagnostic.id&&x.record.sequence===entry.record.sequence));
  keep.push(entry);await cache.put(DIAG_URL,new Response(JSON.stringify(keep.slice(-40))));
 });
 diagnosticWrites=task.catch(()=>{});return task;
}
async function sendDiagnostic(entry){
 let error='NetworkError',httpStatus=null;
 for(let attempt=0;attempt<3;attempt++){
  if(entry.diagnostic.expires<Date.now())break;
  try{
   const response=await fetch('/api/push/diagnostics',{method:'POST',credentials:'omit',headers:{'content-type':'application/json','x-requested-with':'usual-saviors'},body:JSON.stringify({diagnostic:entry.diagnostic,...entry.record}),signal:AbortSignal.timeout(3000)});
   httpStatus=response.status||200;
   if(response.ok){entry.report='accepted';await saveDiagnostic(entry).catch(()=>{});await publishDiagnostic({id:entry.diagnostic.id,...entry.record,report:'accepted'});return}
   error='HttpError';if(response.status>=400&&response.status<500&&response.status!==429)break;
  }catch(e){error=e.name==='TimeoutError'?'TimeoutError':'NetworkError'}
  if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
 }
 entry.report='failed';await saveDiagnostic(entry).catch(()=>{});
 await publishDiagnostic({id:entry.diagnostic.id,...entry.record,report:'failed',reportError:error,reportStatus:httpStatus});
}
async function replayDiagnostics(){
 await diagnosticWrites;
 try{
  const cache=await caches.open(DIAG_CACHE),saved=await cache.match(DIAG_URL),rows=saved?await saved.json():[];
  for(const entry of rows.filter(x=>x.diagnostic.expires>Date.now())){
   await publishDiagnostic({id:entry.diagnostic.id,...entry.record,report:entry.report||'pending'});
   if(entry.report!=='accepted')await sendDiagnostic(entry);
  }
 }catch{await publishDiagnostic({type:'push-diagnostic-storage-error'})}
}
self.addEventListener('message',event=>{
 if(event.data?.type==='push-diagnostic-version')event.ports?.[0]?.postMessage({version:DIAGNOSTIC_VERSION});
 if(event.data?.type==='push-diagnostic-replay')event.waitUntil(replayDiagnostics());
});
function testDiagnostics(payload){
 const pending=[],diagnostic=payload?.test&&payload.diagnostic;let sequence=0;
 const emit=(stage,details={})=>{
  if(!diagnostic)return;
  const permission=typeof Notification==='undefined'?'unavailable':Notification.permission;
  const allowed=['TypeError','DataCloneError','NotAllowedError','InvalidStateError','SecurityError','AbortError','TimeoutError','NetworkError','SyntaxError','Error'];
  const record={stage,permission,sequence:++sequence,...details};
  if(record.error&&!allowed.includes(record.error))record.error='Error';
  // Never copy exception messages: they can contain URLs or account data.
  pending.push((async()=>{
   await publishDiagnostic({id:diagnostic.id,...record,report:'pending'});
   const entry={diagnostic,record,report:'pending'};
   await saveDiagnostic(entry).catch(()=>publishDiagnostic({id:diagnostic.id,...record,report:'storage_failed'}));
   await sendDiagnostic(entry);
  })());
 };
 return {emit,finish:()=>Promise.allSettled(pending)};
}
// A woken phone may still be reconnecting. Retry transient lookup failures within
// a bounded event lifetime, without bypassing logout or current-account checks.
async function pushLookup(url,diagnostics){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(3500)});
   if(response.ok)return await response.json();
   diagnostics?.emit('lookup_http_error',{httpStatus:response.status});
   if(response.status!==408&&response.status!==429&&response.status<500)return null;
   if(attempt===2)throw Error('push lookup status '+response.status);
  }catch(error){diagnostics?.emit('lookup_error',{error:error.name});if(attempt===2)throw error}
  await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));
 }
}
async function displayPush(payload){
 const diagnostics=testDiagnostics(payload);let phase='state';
 try{
  if(!payload)return;
  diagnostics.emit('received');
  let body,url='/?route=alerts',tag,notification,userId;
  if(payload.test){
   phase='lookup';diagnostics.emit('lookup_started');
   const data=await pushLookup('/api/me',diagnostics);if(!data)return;
   diagnostics.emit('lookup_ok');
   if(!data.user){diagnostics.emit('account_missing');return}
   if(data.user.id!==payload.userId){diagnostics.emit('account_mismatch');return}
   userId=data.user.id;body='테스트 알림이 도착했습니다.';tag='us-test-'+userId;
  }else{
   const data=await pushLookup('/api/notifications?id='+encodeURIComponent(payload.notificationId));if(!data)return;
   notification=data.items?.find(item=>item.id===payload.notificationId);userId=data.userId;
   if(!userId||!notification||notification.read_at)return;
   body=notification.title;url='/?notification='+encodeURIComponent(notification.id);
   tag='us-thread-'+userId+'-'+notification.route+'-'+(notification.target_id||notification.id);
  }
  phase='state';const now=Date.now();let cache;
  try{cache=await caches.open(PUSH_STATE);const saved=await cache.match(STATE_URL);if(saved)memoryState=await saved.json()}catch{}
  const state=structuredClone(memoryState),seenKey=notification?userId+':'+notification.id:null;
  // Persist only opaque IDs and timestamps, never notification bodies or account details.
  for(const [key,time] of Object.entries(state.seen))if(now-time>7*86400000)delete state.seen[key];
  if(seenKey&&state.seen[seenKey])return;
  if(notification){
   const previous=state.groups[tag],order=[notification.created_at,notification.id];
   if(previous&&(previous[0]>order[0]||previous[0]===order[0]&&previous[1]>=order[1]))return;
   state.groups[tag]=order;
  }
  const silent=now-state.lastSound<60000;
  phase='display';diagnostics.emit('display_started',{silent});
  await self.registration.showNotification('USUAL SAVIORS',{body,icon:'/icons/app-192.png',badge:'/icons/badge.png',tag,silent,renotify:!silent,data:{url,userId,shownAt:now}});
  diagnostics.emit('display_ok',{silent});phase='cleanup';
  if(!silent)state.lastSound=now;
  if(seenKey)state.seen[seenKey]=now;
  state.seen=Object.fromEntries(Object.entries(state.seen).sort((a,b)=>b[1]-a[1]).slice(0,1000));
  state.groups=Object.fromEntries(Object.entries(state.groups).sort((a,b)=>b[1][0]-a[1][0]).slice(0,200));
  memoryState=state;
  try{if(cache)await cache.put(STATE_URL,new Response(JSON.stringify(state),{headers:{'content-type':'application/json'}}))}catch{}
  const visible=await self.registration.getNotifications();
  const ours=visible.filter(item=>item.tag.startsWith('us-')||item.tag.startsWith('notification-')||item.tag==='push-test');
  // Bound the tray, not the in-app history. Remove legacy individual cards on the first new push.
  const current=[];for(const item of ours){if(item.data?.userId!==userId)item.close();else current.push(item)}
  current.sort((a,b)=>(b.data.shownAt||0)-(a.data.shownAt||0));current.slice(5).forEach(item=>item.close());
 }catch(error){diagnostics.emit(phase==='display'?'display_error':phase==='cleanup'?'cleanup_error':phase==='lookup'?'lookup_error':'state_error',{error:error.name});console.warn('Push display failed after bounded retries')}
 finally{await diagnostics.finish()}
}
self.addEventListener('push',event=>{
 const task=pushSerial.then(()=>displayPush(event.data?.json()));
 pushSerial=task.catch(()=>{});event.waitUntil(pushSerial);
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const target=new URL(event.notification.data?.url||'/?route=alerts',self.location.origin);
  if(target.origin!==self.location.origin)return;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const current=windows.find(client=>new URL(client.url).origin===self.location.origin);
  if(current){await current.navigate(target.href);await current.focus()}else await self.clients.openWindow(target.href);
 })());
});
