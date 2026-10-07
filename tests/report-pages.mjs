import assert from 'node:assert/strict';
import {database} from '../scripts/db-adapter.mjs';
import worker from '../server/worker.js';
import {emptyReportFilters,reportQuery,reportPageNumbers,createReportsUI} from '../client/reports.js';

const DB=database(),env={DB,ADMIN_PASSWORD_HASH:'unused-in-read-only-test',ASSETS:{fetch:()=>new Response('asset')}};
for(const id of ['a','b','suspended']){
 DB.native.prepare('INSERT INTO users(id,username,display_name,password_hash,status,created_at) VALUES(?,?,?,?,?,?)').run(id,id,id,'unused',id==='suspended'?'suspended':'active',1);
 DB.native.prepare('INSERT INTO characters(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)').run('char-'+id,id,'인물 '+id,1,1);
}
function seed(id,day,place,user='a',created=1){
 DB.native.prepare('INSERT INTO scenes VALUES(?,?,?,?,?)').run(id,user,day,place,created);
 DB.native.prepare('INSERT INTO actions VALUES(?,?,?,?,?,?,?)').run(id+'-a',id,user,'char-'+user,'09:00','첫 행동',1);
}
for(let i=1;i<=25;i++)seed('scene-'+String(i).padStart(2,'0'),'2026-09-0'+(Math.floor((i-1)/10)+1),i%2?'골목':'옥상', 'a', Math.floor(i/3));
seed('hidden','2026-10-01','골목','suspended');
for(const id of ['scene-01','scene-11','scene-21']){
 DB.native.prepare('INSERT INTO actions VALUES(?,?,?,?,?,?,?)').run(id+'-b',id,'b','char-b','10:00','함께한 행동',2);
 DB.native.prepare('INSERT INTO actions VALUES(?,?,?,?,?,?,?)').run(id+'-hidden',id,'suspended','char-suspended','11:00','보이면 안 되는 행동',3);
}
async function get(query='',status=200,path='/api/scenes'){
 const response=await worker.fetch(new Request('https://test.example'+path+(query?'?'+query:'')),env);
 const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));return body;
}
const pages=await Promise.all([get(),get('page=2'),get('page=3')]);
assert.deepEqual(pages.map(p=>[p.page,p.pageSize,p.total,p.totalPages,p.items.length]),[[1,10,25,3,10],[2,10,25,3,10],[3,10,25,3,5]]);
const expected=DB.native.prepare("SELECT s.id FROM scenes s JOIN users u ON u.id=s.user_id WHERE u.status='active' ORDER BY s.day DESC,s.created_at DESC,s.id DESC").all().map(s=>s.id);
assert.deepEqual(pages.flatMap(p=>p.items.map(s=>s.id)),expected,'all dates appear once, in stable newest-first order');
assert.equal((await get('page=999')).page,3,'last page clamps after an outdated page request');
const people=await get('characterId=char-b');
assert.deepEqual(people.items.map(s=>s.id),['scene-21','scene-11','scene-01']);
assert.ok(people.items.every(s=>s.entries.map(a=>a.character_id).join(',')==='char-a,char-b'),'filter matches a participant and keeps the whole active conversation');
assert.equal((await get('characterId=char-suspended')).total,0);
const mixed=await get('from=2026-09-02&to=2026-09-02&place='+encodeURIComponent('골목')+'&characterId=char-b');
assert.deepEqual(mixed.items.map(s=>s.id),['scene-11']);
assert.equal((await get('day=2026-09-02')).total,10,'legacy date links remain supported');
assert.equal((await get('from=2026-09-03')).total,5);
assert.equal((await get('to=2026-09-01')).total,10);
for(const place of ["' OR 1=1 --",'%','_','없는 장소'])assert.equal((await get('place='+encodeURIComponent(place))).total,0,'place is a literal search');
const none=await get('page=30&from=2027-01-01');
assert.deepEqual([none.items,none.total,none.page,none.totalPages],[[],0,1,1]);
for(const query of ['page=0','page=-1','page=1.5','page=abc','page=1000000000','from=2026-02-30','to=2026-13-01','from=bad','from=2026-09-03&to=2026-09-01','place='+('x'.repeat(61)),'characterId='+('x'.repeat(101))])await get(query,400);
const detail=await get('',200,'/api/scenes/scene-01');
assert.equal(detail.item.id,'scene-01','notification detail is independent of pagination and filters');
DB.native.prepare("DELETE FROM scenes WHERE day='2026-09-03'").run();
const afterDelete=await get('page=3');assert.deepEqual([afterDelete.page,afterDelete.totalPages,afterDelete.total],[2,2,20]);

assert.deepEqual(reportPageNumbers(1,1),[1]);assert.deepEqual(reportPageNumbers(1,9),[1,2,3,4,5]);
assert.deepEqual(reportPageNumbers(5,9),[3,4,5,6,7]);assert.deepEqual(reportPageNumbers(9,9),[5,6,7,8,9]);
const encoded=new URLSearchParams(reportQuery(2,{...emptyReportFilters(),place:'골목 & 옥상',characterId:'char/b'}));
assert.equal(encoded.get('place'),'골목 & 옥상');assert.equal(encoded.get('characterId'),'char/b');assert.equal(encoded.get('page'),'2');assert.equal(encoded.has('from'),false);
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const state={user:null,characters:[],scenes:[detail.item],reportFilters:emptyReportFilters(),reportPage:2,reportPages:3,reportTotal:25,reportHelp:false,reportFiltersOpen:false,day:'2099-01-01'};
let selected=null;
const ui=createReportsUI({state,escape,button:(label,action,cls='',attrs='')=>`<button data-do="${action}" ${attrs}>${label}</button>`,gate:()=>'',form:()=>'',help:()=>'',canEdit:()=>false,empty:(title,body)=>title+body,focus:()=>selected});
const html=ui.render();assert.ok(html.includes(detail.item.day));assert.ok(!html.includes(state.day),'each scene shows its own date');
assert.match(html,/name="character"/);assert.doesNotMatch(html,/name="characterId"/,'filter selection cannot trigger the writing-character selector');
assert.match(html,/aria-current="page"/);selected={target_id:'scene-01'};
assert.match(ui.render(),/보고로그 목록으로/);assert.doesNotMatch(ui.render(),/report-pagination/);
DB.native.close();
console.log('Report pages: ordering, visibility, filters, whole conversations, validation, page bounds and focused scene navigation verified.');
