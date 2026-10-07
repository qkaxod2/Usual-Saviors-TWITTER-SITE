import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {database} from '../scripts/db-adapter.mjs';
import worker from '../server/worker.js';
import {createCharacterSelection} from '../client/characters.js';

// Exercise the selected actor against the real Worker and an isolated SQLite database.
const DB=database(),n=DB.native,now=Date.now(),env={DB};
const tokens={a:'1'.repeat(64),b:'2'.repeat(64)};
for(const id of ['a','b']){
 n.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id,id==='a'?'Nockcho':'Other',id,'unused',id==='a'?'admin':'member','active',now);
 n.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(tokens[id]).digest('hex'),id,now+600000);
}
for(const [id,owner,name] of [['a1','a','첫 인물'],['a2','a','둘째 인물'],['b1','b','상대 인물']])n.prepare('INSERT INTO characters(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)').run(id,owner,name,now,now);
let checks=0;
async function call(path,{user='a',method='GET',data,status=200}={}){
 const response=await worker.fetch(new Request('https://test.example/api'+path,{method,headers:{'x-requested-with':'usual-saviors',cookie:'us_session='+tokens[user],...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),env);
 const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));checks++;return result;
}
const chars=(await call('/characters')).items,memory=new Map(),selection=createCharacterSelection({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)});
const selected=selection.select('a',chars,'a2');
const root=await call('/posts',{method:'POST',data:{characterId:selected,body:'둘째 인물의 글'},status:201});
let item=(await call('/posts/'+root.id)).item;
assert.equal(item.character_id,'a2');assert.equal(item.name,'둘째 인물');
await call('/posts',{method:'POST',data:{characterId:selection.select('a',chars,'a1'),parentId:root.id,body:'같은 계정의 다른 캐릭터'},status:201});
assert.equal((await call('/notifications')).unread,0,'same-account replies should not notify oneself');
await call('/posts',{user:'b',method:'POST',data:{characterId:'b1',parentId:root.id,body:'상대의 답글'},status:201});
item=(await call('/posts/'+root.id)).item;assert.deepEqual(new Set(item.replies.map(r=>r.character_id)),new Set(['a1','b1']));
let alerts=await call('/notifications');assert.equal(alerts.unread,1);assert.equal(alerts.items[0].target_id,root.id);assert.equal(alerts.items[0].body,'상대의 답글');
await call('/notifications/read',{user:'b',method:'POST',data:{id:alerts.items[0].id}});
assert.equal((await call('/notifications')).unread,1,'another account cannot mark my notification read');
await call('/notifications/read',{method:'POST',data:{id:alerts.items[0].id}});
assert.equal((await call('/notifications')).unread,0);
const scene=await call('/actions',{method:'POST',data:{characterId:selection.select('a',chars,'a2'),day:'2026-09-06',at:'20:00',place:'옥상',body:'하늘을 바라봄'},status:201});
await call('/actions',{method:'POST',data:{characterId:selection.select('a',chars,'a1'),sceneId:scene.sceneId,at:'20:01',body:'합류함'},status:201});
await call('/actions',{user:'b',method:'POST',data:{characterId:'b1',sceneId:scene.sceneId,at:'20:02',body:'문을 열고 나옴'},status:201});
alerts=await call('/notifications');assert.equal(alerts.unread,1,'multiple owned actors in a scene receive one account notification');
assert.equal(alerts.items.filter(a=>a.type==='report').length,1);assert.equal(alerts.items[0].target_day,'2026-09-06');
const entries=(await call('/scenes/'+scene.sceneId)).item.entries;assert.deepEqual(entries.map(e=>e.character_id),['a2','a1','b1']);
await call('/posts',{user:'b',method:'POST',data:{characterId:'a2',body:'forbidden'},status:403});
await call('/actions',{user:'b',method:'POST',data:{characterId:'a2',sceneId:scene.sceneId,at:'20:03',body:'forbidden'},status:403});
await call('/notifications/read',{method:'POST',data:{}});
assert.equal((await call('/notifications')).unread,0);
n.close();console.log(`${checks} selected-character API checks passed: post/reply/action attribution, ownership, account notifications, read isolation and scene deduplication.`);
