import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const shown=[],opened=[],tray=new Map(),stored=new Map(),origin='https://chronicle-atlas.qkaxdo2.chatgpt.site';
let now=1800000000000,result={items:[],userId:'a'};
const cache={match:async key=>stored.has(key)?new Response(stored.get(key)):undefined,put:async(key,value)=>stored.set(key,await value.text())};
function runtime(fetcher=async()=>({ok:true,json:async()=>result})){
 const events={},self={location:{origin},addEventListener:(type,handler)=>events[type]=handler,
 registration:{getNotifications:async()=>[...tray.values()],showNotification:async(title,options)=>{shown.push({title,...options});tray.set(options.tag,{...options,close(){tray.delete(options.tag)}})}},
 clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self,URL,Response,structuredClone,Date:{now:()=>now},caches:{open:async()=>cache},encodeURIComponent,AbortSignal,setTimeout:resolve=>{resolve();return 0},console:{warn(){}},fetch:fetcher});
 return {push:async data=>{let pending;events.push({data:{json:()=>data},waitUntil:p=>pending=p});await pending},click:async url=>{let pending;events.notificationclick({notification:{close(){},data:{url}},waitUntil:p=>pending=p});await pending}};
}
let app=runtime();
const notification=(id,root='root',time=now)=>({id,title:'New reply',read_at:null,created_at:time,target_id:root,route:'home'});
await app.push({notificationId:'n'});assert.equal(shown.length,0);
result={userId:'a',items:[{...notification('n'),read_at:1}]};await app.push({notificationId:'n'});assert.equal(shown.length,0);
result={userId:'a',items:[notification('n')]};await Promise.all([app.push({notificationId:'n'}),app.push({notificationId:'n'})]);assert.equal(shown.length,1,'parallel duplicates show once');assert.equal(shown[0].silent,false);
tray.clear();app=runtime();await app.push({notificationId:'n'});assert.equal(shown.length,1,'dismissed notification stays deduplicated after worker restart');
now+=100;result={userId:'a',items:[notification('n2')]};await app.push({notificationId:'n2'});assert.equal(shown.at(-1).silent,true);assert.equal(shown.at(-1).tag,shown[0].tag);
result={userId:'a',items:[notification('old','root',now-1000)]};await app.push({notificationId:'old'});assert.equal(shown.length,2,'out-of-order push cannot replace newest reply');
for(let i=0;i<12;i++){now+=100;result={userId:'a',items:[notification('burst'+i,'thread'+i)]};await app.push({notificationId:'burst'+i})}
assert.equal(tray.size,5);assert.equal(shown.filter(n=>!n.silent).length,1,'burst sounds only once across conversations');
now+=61000;result={userId:'a',items:[notification('later','root')]};await app.push({notificationId:'later'});assert.equal(shown.at(-1).silent,false);assert.equal(shown.at(-1).data.url,'/?notification=later');
result={user:{id:'other'}};const count=shown.length;await app.push({test:true,userId:'a'});assert.equal(shown.length,count);
result={userId:'b',items:[notification('b1')]};await app.push({notificationId:'b1'});assert.equal(tray.size,1);assert.match(shown.at(-1).tag,/us-thread-b-/);
await app.click('https://evil.example/');assert.equal(opened.length,0);await app.click('/?notification=b1');assert.equal(opened[0],origin+'/?notification=b1');
console.log('Push grouping, persistent deduplication, ordering, burst silence, tray bound, accounts and links verified.');

// Wake-up network outages retry; denied accounts must never turn into a fallback notification.
let attempts=0;
now+=61000;result={userId:'b',items:[notification('wake-retry')]};
app=runtime(async()=>{attempts++;if(attempts===1)throw Error('offline');if(attempts===2)return {ok:false,status:503};return {ok:true,json:async()=>result}});
await app.push({notificationId:'wake-retry'});assert.equal(attempts,3);assert.equal(shown.at(-1).data.url,'/?notification=wake-retry');
const beforeFailure=shown.length;attempts=0;app=runtime(async()=>{attempts++;return {ok:false,status:401}});
await app.push({notificationId:'revoked'});assert.equal(attempts,1);assert.equal(shown.length,beforeFailure);
attempts=0;app=runtime(async()=>{attempts++;throw Error('offline')});await app.push({notificationId:'offline'});
assert.equal(attempts,3,'retries have a hard bound');assert.equal(shown.length,beforeFailure);
console.log('Wake-up reconnection retries and logged-out notification suppression verified.');
