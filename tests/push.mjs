import assert from 'node:assert/strict';
import {createECDH,createHash,randomBytes,createHmac,createDecipheriv,createPublicKey,verify} from 'node:crypto';
import {database} from '../scripts/db-adapter.mjs';
import worker from '../server/worker.js';
import {deliverPush,sendPush,validPushEndpoint} from '../server/push.js';
const DB=database(),vapid=createECDH('prime256v1'),client=createECDH('prime256v1');vapid.generateKeys();client.generateKeys();
const auth=randomBytes(16),sent=[],env={DB,PUSH_PUBLIC_KEY:vapid.getPublicKey().toString('base64url'),PUSH_PRIVATE_KEY:vapid.getPrivateKey().toString('base64url'),PUSH_FETCH:async(url,options)=>{sent.push({url,options});return {status:201}}};
const tokens={a:'a'.repeat(64),b:'b'.repeat(64)},now=Date.now();
for(const id of ['a','b']){
 DB.native.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id,id==='a'?'Nockcho':id,id,'unused','member','active',now);
 DB.native.prepare('INSERT INTO characters(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)').run(id,id,id,now,now);
 DB.native.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(tokens[id]).digest('hex'),id,now+600000);
}
async function call(path,{user='a',method='GET',data,status=200}={}){const response=await worker.fetch(new Request('https://test.example/api'+path,{method,headers:{'x-requested-with':'usual-saviors',cookie:'us_session='+(tokens[user]||''),'content-type':'application/json'},body:data?JSON.stringify(data):undefined}),env);const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result}
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test-device',keys:{p256dh:client.getPublicKey().toString('base64url'),auth:auth.toString('base64url')}};
assert.equal((await call('/push/config')).enabled,true);
await call('/push/subscription',{user:'guest',method:'POST',data:subscription,status:401});
for(const endpoint of ['http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.test/x','https://127.0.0.1/x','https://user@fcm.googleapis.com/x']){assert.equal(validPushEndpoint(endpoint),false);await call('/push/subscription',{method:'POST',data:{...subscription,endpoint},status:400})}
await call('/push/subscription',{method:'POST',data:{...subscription,keys:{...subscription.keys,p256dh:'wrong'}},status:400});
await call('/push/subscription',{method:'POST',data:subscription});
const savedSubscription=DB.native.prepare('SELECT * FROM push_subscriptions').get();
let redirectRequests=0;
const redirectEnv={...env,PUSH_FETCH:async(url,options)=>{
 assert.equal(options.redirect,'manual','Workers-compatible redirect mode must not forward VAPID credentials');
 assert.equal(url,subscription.endpoint);redirectRequests++;
 return new Response(null,{status:307,headers:{location:'https://untrusted.example/push'}});
}};
assert.equal((await sendPush(redirectEnv,savedSubscription,{test:true,userId:'a'})).status,307);
assert.equal(redirectRequests,1,'redirect destination is never requested');
const originalFetch=env.PUSH_FETCH;env.PUSH_FETCH=redirectEnv.PUSH_FETCH;
await call('/push/test',{method:'POST',data:subscription,status:502});env.PUSH_FETCH=originalFetch;
await call('/push/test',{user:'b',method:'POST',data:subscription,status:404});
await call('/push/subscription',{user:'b',method:'DELETE',data:subscription});
assert.equal(DB.native.prepare('SELECT count(*) n FROM push_subscriptions').get().n,1);
const root=await call('/posts',{method:'POST',data:{characterId:'a',body:'root'},status:201});
const reply=await call('/posts',{user:'b',method:'POST',data:{characterId:'b',parentId:root.id,body:'reply'},status:201});
assert.equal(sent.length,1);assert.equal(sent[0].options.headers.urgency,'high','visible messages must request delivery while a device is idle');const notification=(await call('/notifications')).items[0];assert.equal(notification.reply_id,reply.id);
assert.equal((await call('/notifications?id='+notification.id)).items.length,1);
assert.equal((await call('/notifications?id='+notification.id,{user:'b'})).items.length,0);
// Independently decrypt RFC 8291 ciphertext and verify the VAPID signature.
const hmac=(key,value)=>createHmac('sha256',key).update(value).digest();
const expand=(key,info,length)=>hmac(key,Buffer.concat([info,Buffer.from([1])])).subarray(0,length);
const data=Buffer.from(sent[0].options.body),salt=data.subarray(0,16),serverKey=data.subarray(21,21+data[20]);
const shared=client.computeSecret(serverKey),ikm=expand(hmac(auth,shared),Buffer.concat([Buffer.from('WebPush: info\0'),client.getPublicKey(),serverKey]),32),prk=hmac(salt,ikm);
const decipher=createDecipheriv('aes-128-gcm',expand(prk,Buffer.from('Content-Encoding: aes128gcm\0'),16),expand(prk,Buffer.from('Content-Encoding: nonce\0'),12));
decipher.setAuthTag(data.subarray(-16));const plain=Buffer.concat([decipher.update(data.subarray(21+data[20],-16)),decipher.final()]);let end=plain.length-1;while(plain[end]===0)end--;assert.equal(plain[end],2);assert.deepEqual(JSON.parse(plain.subarray(0,end)),{notificationId:notification.id});
const jwt=sent[0].options.headers.authorization.match(/t=([^, ]+)/)[1],parts=jwt.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
assert.equal(claims.aud,'https://fcm.googleapis.com');assert.ok(claims.exp>Date.now()/1000);
const publicKey=vapid.getPublicKey();assert.ok(verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:createPublicKey({key:{kty:'EC',crv:'P-256',x:publicKey.subarray(1,33).toString('base64url'),y:publicKey.subarray(33).toString('base64url')},format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')));
await Promise.all([deliverPush(env),deliverPush(env)]);assert.equal(sent.length,1,'delivered jobs are not sent twice');
DB.native.prepare('UPDATE push_deliveries SET delivered_at=NULL,lease_until=0').run();sent.length=0;
await Promise.all([deliverPush(env),deliverPush(env)]);assert.equal(sent.length,1,'concurrent senders claim once');
env.PUSH_FETCH=async()=>({status:503});DB.native.prepare('UPDATE push_deliveries SET delivered_at=NULL,lease_until=0').run();await deliverPush(env);
assert.match(DB.native.prepare('SELECT last_error FROM push_deliveries').get().last_error,/503/);
assert.ok(DB.native.prepare('SELECT lease_until FROM push_deliveries').get().lease_until>Date.now());
await call('/push/subscription',{user:'b',method:'POST',data:subscription});DB.native.prepare('UPDATE push_deliveries SET lease_until=0').run();sent.length=0;env.PUSH_FETCH=async(...args)=>{sent.push(args);return {status:201}};await deliverPush(env);assert.equal(sent.length,0,'a transferred device cannot receive the previous account notifications');
await call('/push/subscription',{method:'POST',data:subscription});env.PUSH_FETCH=async()=>({status:410});await deliverPush(env);assert.equal(DB.native.prepare('SELECT count(*) n FROM push_subscriptions').get().n,0,'expired device removed');
await call('/push/subscription',{method:'POST',data:subscription});await call('/logout',{method:'POST'});assert.equal(DB.native.prepare('SELECT count(*) n FROM push_subscriptions').get().n,0,'logout revokes device registration');
DB.native.close();console.log('Push encryption, VAPID, ownership, outbox claims, retries, expiry and logout verified.');
