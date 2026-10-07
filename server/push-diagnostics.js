// Opt-in test receipts only. No message text, device endpoints, cookies or user IDs.
const enc=new TextEncoder();
const stages=new Set(['received','lookup_started','lookup_ok','lookup_http_error','lookup_error','account_missing','account_mismatch','state_error','display_started','display_ok','display_error','cleanup_error']);
const errors=new Set(['TypeError','DataCloneError','NotAllowedError','InvalidStateError','SecurityError','AbortError','TimeoutError','NetworkError','SyntaxError','Error']);
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const key=env=>crypto.subtle.importKey('raw',enc.encode('push-diagnostics-v1:'+env.PUSH_PRIVATE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const bytes=d=>enc.encode(d.id+':'+d.expires);
export async function createDiagnostic(env){
 const d={id:crypto.randomUUID(),expires:Date.now()+15*60000};
 d.proof=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env),bytes(d))),x=>x.toString(16).padStart(2,'0')).join('');
 return d;
}
export async function acceptDiagnostic(env,value,fail){
 const d=value?.diagnostic;
 if(!env.PUSH_PRIVATE_KEY||!d||!idPattern.test(d.id)||!Number.isSafeInteger(d.expires)||d.expires<Date.now()||d.expires>Date.now()+15*60000||!/^[a-f0-9]{64}$/.test(d.proof||''))fail(403,'진단 요청이 만료되었거나 유효하지 않습니다.');
 const signature=Uint8Array.from(d.proof.match(/../g),x=>parseInt(x,16));
 if(!await crypto.subtle.verify('HMAC',await key(env),signature,bytes(d)))fail(403,'유효하지 않은 진단 요청입니다.');
 if(!stages.has(value.stage))fail(400,'유효하지 않은 진단 단계입니다.');
 return {id:d.id,stage:value.stage,sequence:Number.isInteger(value.sequence)&&value.sequence>0&&value.sequence<=40?value.sequence:null,permission:['granted','denied','default','unavailable'].includes(value.permission)?value.permission:'unavailable',error:errors.has(value.error)?value.error:null,httpStatus:Number.isInteger(value.httpStatus)&&value.httpStatus>=100&&value.httpStatus<=599?value.httpStatus:null,silent:typeof value.silent==='boolean'?value.silent:null,worker:'push-diag-v1'};
}
export function logDiagnostic(record){console.log('push_diagnostic '+JSON.stringify(record))}
