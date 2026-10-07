import {buildPushPayload} from '@block65/webcrypto-web-push';
import {createDiagnostic,acceptDiagnostic,logDiagnostic} from './push-diagnostics.js';
const all=async(db,q,...args)=>(await db.prepare(q).bind(...args).all()).results;
const clock=env=>env.PUSH_NOW?env.PUSH_NOW():Date.now();
const sleep=(env,ms)=>env.PUSH_SLEEP?env.PUSH_SLEEP(ms):new Promise(resolve=>setTimeout(resolve,ms));
export const pushConfigured=env=>!!(env.PUSH_PUBLIC_KEY&&env.PUSH_PRIVATE_KEY);
export function validPushEndpoint(value){
 try{const url=new URL(value);return value.length<=2048&&url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
  (url.hostname==='fcm.googleapis.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.services.mozilla.com'))}catch{return false}
}
export async function validateSubscription(value,fail){
 if(!value||!validPushEndpoint(value.endpoint))fail(400,'지원되는 푸시 주소가 아닙니다.');
 const {p256dh,auth}=value.keys||{};
 const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 try{
  if(typeof p256dh!=='string'||typeof auth!=='string'||p256dh.length>100||auth.length>30||!/^[\w-]+$/.test(p256dh)||!/^[\w-]+$/.test(auth))throw Error();
  const point=decode(p256dh);if(point.length!==65||decode(auth).length!==16)throw Error();
  await crypto.subtle.importKey('raw',point,{name:'ECDH',namedCurve:'P-256'},false,[]);
 }catch{fail(400,'알림 등록 정보를 확인해 주세요.');}
 return {endpoint:value.endpoint,p256dh,auth};
}
export async function sendPush(env,subscription,data){
 if(!validPushEndpoint(subscription.endpoint))return {status:400};
 const payload=await buildPushPayload({data:JSON.stringify(data),options:{ttl:86400,urgency:'high'}},
  {endpoint:subscription.endpoint,expirationTime:null,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},
  {subject:'https://chronicle-atlas.qkaxdo2.chatgpt.site/',publicKey:env.PUSH_PUBLIC_KEY,privateKey:env.PUSH_PRIVATE_KEY});
 if(subscription.topic){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subscription.topic)));
  payload.headers.topic=btoa(String.fromCharCode(...digest)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'').slice(0,32);
 }
 // Workers supports manual redirects; callers reject non-2xx without forwarding credentials.
 return (env.PUSH_FETCH||fetch)(subscription.endpoint,{...payload,redirect:'manual',signal:AbortSignal.timeout(7000)});
}
export async function deliverPush(env){
 if(!pushConfigured(env))return 0;
 const db=env.DB,now=clock(env);
 const jobs=await all(db,`SELECT d.notification_id,d.subscription_id,d.attempts,p.endpoint,p.p256dh,p.auth,
 n.id AS topic
 FROM push_deliveries d JOIN push_subscriptions p ON p.id=d.subscription_id
 JOIN notifications n ON n.id=d.notification_id JOIN sessions s ON s.token_hash=p.session_hash
 JOIN users u ON u.id=p.user_id
 WHERE d.delivered_at IS NULL AND d.lease_until<? AND d.attempts<8 AND n.read_at IS NULL
 AND n.user_id=p.user_id AND u.status='active' AND s.expires_at>? ORDER BY d.created_at LIMIT 8`,now,now);
 await Promise.allSettled(jobs.map(async job=>{
  const claim=await db.prepare('UPDATE push_deliveries SET lease_until=?,attempts=attempts+1 WHERE notification_id=? AND subscription_id=? AND lease_until<? AND delivered_at IS NULL').bind(now+30000,job.notification_id,job.subscription_id,now).run();
  if(!claim.meta.changes)return;
  try{
   const response=await sendPush(env,job,{notificationId:job.notification_id});
   if(response.status===404||response.status===410){await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(job.subscription_id).run();return}
   if(response.status>=200&&response.status<300){await db.prepare('UPDATE push_deliveries SET delivered_at=?,last_error=NULL WHERE notification_id=? AND subscription_id=?').bind(Date.now(),job.notification_id,job.subscription_id).run();return}
   const error=Error('push status '+response.status),retry=response.headers?.get('retry-after');
   error.retryAfter=retry?Math.max(0,Number.isFinite(Number(retry))?Number(retry)*1000:Date.parse(retry)-clock(env)):0;
   error.permanent=[400,401,403,413].includes(response.status);throw error;
 }catch(error){await db.prepare('UPDATE push_deliveries SET last_error=?,lease_until=?,attempts=CASE WHEN ? THEN 8 ELSE attempts END WHERE notification_id=? AND subscription_id=?').bind(String(error.message).slice(0,120),clock(env)+Math.max(Math.min(3600000,error.retryAfter||0),Math.min(60000,1000*2**job.attempts)),error.permanent?1:0,job.notification_id,job.subscription_id).run()}
 }));
 return jobs.length;
}
// Drain subsequent batches and short retries within the host's 30-second waitUntil lifetime.
// Durable jobs remain recorded if an outage exceeds this window; no timer survives termination.
export async function drainPush(env){
 if(!pushConfigured(env))return;
 const deadline=clock(env)+22000;
 for(let batch=0;batch<64&&clock(env)<deadline;batch++){
  await deliverPush(env);
  const pending=await env.DB.prepare(`SELECT MIN(d.lease_until) AS due FROM push_deliveries d
   JOIN push_subscriptions p ON p.id=d.subscription_id JOIN notifications n ON n.id=d.notification_id
   JOIN sessions s ON s.token_hash=p.session_hash JOIN users u ON u.id=p.user_id
   WHERE d.delivered_at IS NULL AND d.attempts<8 AND n.read_at IS NULL AND n.user_id=p.user_id
   AND s.expires_at>? AND u.status='active'`).bind(clock(env)).first();
  if(pending?.due==null)return;
  const delay=Math.max(1,pending.due-clock(env)+1);
  if(clock(env)+delay>=deadline)return;
  await sleep(env,delay);
 }
}
export function schedulePush(env,ctx){
 const task=drainPush(env).catch(error=>console.error('push drain failed',error.message));
 if(ctx?.waitUntil)ctx.waitUntil(task);
 return task;
}
export async function pushAPI({db,env,user,path,method,body,fail,json,requireUser,limit}){
 if(path==='/api/push/config'&&method==='GET')return json({enabled:pushConfigured(env),publicKey:env.PUSH_PUBLIC_KEY||null});
 if(path==='/api/push/diagnostics'&&method==='POST'){
  // A short-lived signed test receipt still works when the failing step is login lookup.
  // This capability permits logging only, never reading notifications or changing state.
  const record=await acceptDiagnostic(env,await body(),fail);
  await limit(db,'push-diag:'+record.id,40,15*60000);
  logDiagnostic(record);return json({ok:true});
 }
 requireUser(user);
 if(path==='/api/push/subscription'&&method==='POST'){
  if(!pushConfigured(env))fail(503,'알림 서비스를 준비하고 있습니다.');
  await limit(db,'push:'+user.id,30,60000);
  const subscription=await validateSubscription(await body(),fail),id=crypto.randomUUID();
  await db.prepare(`INSERT INTO push_subscriptions(id,endpoint,user_id,session_hash,p256dh,auth,created_at) VALUES(?,?,?,?,?,?,?)
  ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,session_hash=excluded.session_hash,p256dh=excluded.p256dh,auth=excluded.auth,created_at=excluded.created_at`).bind(id,subscription.endpoint,user.id,user.token_hash,subscription.p256dh,subscription.auth,Date.now()).run();
  return json({ok:true});
 }
 if(path==='/api/push/subscription'&&method==='DELETE'){
  const value=await body();
  await db.prepare('DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=? AND session_hash=?').bind(String(value.endpoint||''),user.id,user.token_hash).run();return json({ok:true});
 }
 if(path==='/api/push/test'&&method==='POST'){
  if(!pushConfigured(env))fail(503,'알림 서비스를 준비하고 있습니다.');
  await limit(db,'push-test:'+user.id,5,60000);
  const value=await body(),subscription=await db.prepare('SELECT * FROM push_subscriptions WHERE endpoint=? AND user_id=? AND session_hash=?').bind(String(value.endpoint||''),user.id,user.token_hash).first();
  if(!subscription)fail(404,'이 기기의 알림을 먼저 켜 주세요.');
  const diagnostic=value.diagnostics===true?await createDiagnostic(env):null;
  if(diagnostic)logDiagnostic({id:diagnostic.id,stage:'send_started'});
  let response;
  try{response=await sendPush(env,subscription,{test:true,userId:user.id,...(diagnostic?{diagnostic}:{})})}
  catch(error){if(diagnostic)logDiagnostic({id:diagnostic.id,stage:'send_error'});throw error}
  if(diagnostic)logDiagnostic({id:diagnostic.id,stage:response.status>=200&&response.status<300?'provider_accepted':'provider_rejected',httpStatus:response.status});
  if(response.status===404||response.status===410){await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(subscription.id).run();fail(410,'알림 연결이 만료되었습니다. 다시 켜 주세요.');}
  if(response.status<200||response.status>=300)fail(502,'알림 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  return json({ok:true,...(diagnostic?{diagnosticId:diagnostic.id}:{})});
 }
 fail(404,'알림 기능을 찾을 수 없습니다.');
}
