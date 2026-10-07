import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const nodes=new Map(),listeners={};
function el(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',hidden:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},focus(){},setAttribute(){},scrollIntoView(){},querySelector(){return el('focus')},querySelectorAll(){return []}});return nodes.get(id)}
const context=vm.createContext({URLSearchParams,Date,console,location:{search:''},history:{replaceState(){}},document:{getElementById:el,querySelector:el,querySelectorAll:()=>[],activeElement:el('focus'),addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn)},window:{scrollTo(){},matchMedia:()=>({matches:false})},setTimeout:()=>1,clearTimeout(){}});
const run=s=>vm.runInContext(s,context);
const source=['world.js','whippy-ui.js'].map(f=>fs.readFileSync('dist/'+f,'utf8')).join('\n');
run(source);
const baseline=run(`studies.map((d,i)=>{current=i;return layouts[d.key]()})`);
run(fs.readFileSync('dist/creative-review.js','utf8'));
assert.deepEqual(Array.from(run('lowerTen.slice().sort((a,b)=>a-b)')),[3,5,8,10,12,13,14,17,19,20]);
for(let i=0;i<20;i++){
 run('current='+i);
 const selected=run('lowerTen.includes(current+1)');
 if(!selected)assert.equal(run('layouts[studies[current].key]()'),baseline[i],`${i+1}: preserved layout`);
 else {
   assert.notEqual(run('layouts[studies[current].key]()'),baseline[i],`${i+1}: new layout`);
   run('fxState().before=true');
   assert.equal(run('layouts[studies[current].key]()'),baseline[i],`${i+1}: baseline comparison`);
   run('fxState().before=false');
 }
}
const results=run(`studies.map((d,i)=>{current=i;render();return {...d,html:app.innerHTML}})`);
assert.equal(results.length,20);assert.equal(new Set(results.map(r=>r.key)).size,20);
for(const r of results){
 assert(r.html.includes('data-action="report"'),`${r.n}: report entry`);
 assert(r.html.includes('data-action="route:notifications"'),`${r.n}: notifications`);
 assert(r.html.includes('data-action="route:dm"'),`${r.n}: 개별 메시지 entry`);
 assert(r.html.includes('data-action="route:members"'),`${r.n}: members`);
 assert(r.html.includes('class="toot toot-'),`${r.n}: real timeline`);
 assert.equal((r.html.match(/id="draft"/g)||[]).length,1,`${r.n}: one inline composer`);
 assert(!r.html.includes('undefined'),`${r.n}: invalid value`);
 const ids=[...r.html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,`${r.n}: unique IDs`);
}
const dispatch=(name,event)=>{for(const fn of listeners[name]||[])fn(event)};
const click=action=>dispatch('click',{preventDefault(){},target:{closest:s=>s==='[data-action]'?{dataset:{action}}:null}});
const fx=action=>dispatch('click',{preventDefault(){},target:{closest:s=>s==='[data-fx]'?{dataset:{fx:action}}:null}});
const input=(name,value)=>dispatch('input',{target:{name,value}});
const submit=form=>dispatch('submit',{preventDefault(){},target:{closest:()=>({dataset:{form}})}});
click('study:0');input('draft','새 기록 <script>안전한 문자</script>');submit('public');
assert(el('app').innerHTML.includes('&lt;script&gt;안전한 문자&lt;/script&gt;'));
click('study:1');assert(!el('app').innerHTML.includes('안전한 문자'));
click('study:0');assert(el('app').innerHTML.includes('안전한 문자'));
click('reply:p0');assert.equal(run('drawerKind'),'reply');
click('respond:p0');input('draft','현장으로 가고 있어.');submit('public');
click('reply:p0');assert(el('detail-panel').innerHTML.includes('현장으로 가고 있어.'));
click('save:p0');click('route:bookmarks');assert(el('app').innerHTML.includes('가스 사고'));
click('scope:local');click('like:p0');assert(run(`state().likes.has('p0')`));
click('boost:p0');assert(run(`state().boosted.has('p0')`));
click('expand:p4');assert(el('app').innerHTML.includes('힘으로 밀면 안 돼'));
click('cw');input('cw','장면 경고');input('draft','경고가 있는 기록');submit('public');assert(el('app').innerHTML.includes('장면 경고'));assert(!el('app').innerHTML.includes('경고가 있는 기록'));
click('search');input('query','마패');assert(el('search-results').innerHTML.includes('변신이 안 끝나'));
input('query','');click('drawer-close');
click('dm:2');input('dmDraft','공개 기록 목록에 나타나면 안 되는 개별 메시지');submit('dm');assert(el('app').innerHTML.includes('공개 기록 목록에 나타나면 안 되는 개별 메시지'));
click('scope:local');assert(!el('app').innerHTML.includes('공개 기록 목록에 나타나면 안 되는 개별 메시지'));assert.equal(run(`state().posts.some(p=>p.text.includes('공개 기록 목록에'))`),false);
click('route:notifications');click('notification:direct');assert(el('app').innerHTML.includes('공개 기록 목록에 나타나면 안 되는 개별 메시지'));
click('scope:local');input('draft','작성 인물 전환 보존');click('switch');click('switchto:1');assert(el('app').innerHTML.includes('작성 인물 전환 보존'));assert.equal(run('state().person'),1);
click('study:10');click('reply:p3');assert.equal(run('state().selected'),'p3');assert.equal(run('drawerKind'),'');
click('study:13');click('filter:0');assert.equal(run('getPosts().length'),1);
click('study:17');click('dm:2');input('dmDraft','오른쪽의 독립 개별 메시지');submit('dm');assert.equal(run('state().route'),'home');assert(el('app').innerHTML.includes('오른쪽의 독립 개별 메시지'));assert(!run(`getPosts().some(p=>p.text==='오른쪽의 독립 개별 메시지')`));
click('gallery');assert.equal((el('app').innerHTML.match(/class="gallery-item"/g)||[]).length,20);
click('report');assert(el('app').innerHTML.includes('입장 버튼만 구현'));
// Route transitions must not duplicate composer / search / 개별 메시지 element IDs.
for(let i=0;i<20;i++){click('study:'+i);for(const route of ['members','notifications','dm','home']){click('route:'+route);const h=el('app').innerHTML;const ids=[...h.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,`${i+1}/${route}: IDs`);assert(!h.includes('undefined'));}}
// New controls retain draft state and change the corresponding content.
click('study:2');input('draft','장소를 바꿔도 남는 초안');fx('place:지하철역');
assert.equal(run('getPosts().length'),2);assert.equal(run('state().draft'),'장소를 바꿔도 남는 초안');
fx('before');assert(!el('app').innerHTML.includes('class="location-lens"'));assert.equal(run('getPosts().length'),6);
fx('before');assert.equal(run('getPosts().length'),2);fx('place:전체');
click('study:4');fx('focus');assert(el('app').innerHTML.includes('dock-layout reading-focus'));
assert.equal((el('app').innerHTML.match(/id="draft"/g)||[]).length,1);fx('focus');
click('study:7');fx('spotlight:3');assert.equal(run('fxState().spotlight'),3);assert(run('folio()').includes('윤태오'));
fx('roster:list');assert(run('folio()').includes('directory-results'));fx('roster:profile');
click('study:9');dispatch('input',{target:{id:'veil-range',value:999,closest:()=>el('veil-cover')}});
assert.equal(run('fxState().veil'),85);run('render()');assert(el('app').innerHTML.includes('value="85" aria-label="현실과 이면'));
click('study:11');assert.equal((run('readRail()').match(/data-read=/g)||[]).length,run('getPosts().length'));
fx('read:p3');
click('study:12');input('draft','캐릭터 탭에서도 유지');
for(const tab of ['media','about','posts']){fx('profile-tab:'+tab);assert.equal(run('state().draft'),'캐릭터 탭에서도 유지');assert.equal((el('app').innerHTML.match(/id="draft"/g)||[]).length,1)}
click('study:13');fx('lens:2');assert(run('getPosts().every(p=>p.who===2)'));assert.equal(run('getPosts().length'),2);fx('lens:all');
click('study:16');fx('compare:following');assert(el('app').innerHTML.includes('comparison-feeds mode-following'));
click('route:world');assert(el('app').innerHTML.includes('comparison-feeds mode-local'));assert(el('app').innerHTML.includes('세계관'));
fx('link');assert.equal(run('fxState().linked'),false);click('route:home');fx('compare:both');
click('study:18');fx('phase:2');assert.equal(run('fxState().phase'),2);assert(el('.event-brief').outerHTML.includes('다시 일상으로'));
fx('scene-write');assert(run('state().draft').includes('현장에서 돌아와'));input('draft','내가 쓰던 문장');fx('phase:0');fx('scene-write');assert.equal(run('state().draft'),'내가 쓰던 문장');
click('study:19');fx('move:notice:1');assert.deepEqual(Array.from(run('fxState().moduleOrder')),['members','notice','world','report']);
dispatch('toggle',{target:{dataset:{module:'members'},open:false}});run('render()');assert(run("fxState().closed.has('members')"));
fx('move:members:-1');assert.equal(run('fxState().moduleOrder[0]'),'members');
fx('motion');assert(el('app').innerHTML.includes('fx-motion-off'));fx('motion');
fx('review');assert(el('app').innerHTML.includes('브라우저 실측 점수가 아닙니다'));fx('review');
// Export evaluation data from the same source used by the interactive review.
fs.mkdirSync('validation',{recursive:true});
fs.writeFileSync('validation/design-review.json',JSON.stringify(run('({scores:uiReview,selected:lowerTen,plans:upgradePlans,names:studies.map(s=>s.name)})'),null,2));
const css=['whippy-ui.css','creative-review.css'].map(f=>fs.readFileSync('dist/'+f,'utf8')).join('\n');assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
for(const r of results)assert(css.includes('.design-'+r.key));
assert(css.includes('prefers-reduced-motion'));assert(css.includes('@media(max-width:700px)'));
const html=fs.readFileSync('dist/index.html','utf8');assert.equal((html.match(/<dialog/g)||[]).length,1);assert(html.includes('id="personnel-window"'));assert(html.includes('whippy-ui.js'));assert(!html.includes('studio.js'));
for(const f of ['whippy-ui.js','whippy-ui.css','creative-review.js','creative-review.css','portraits.png','world.js'])assert(fs.statSync('dist/'+f).size>0);
// The second revision changes the experience of the same ten studies.
run(fs.readFileSync('dist/game-experience.js','utf8'));
const game=action=>dispatch('click',{preventDefault(){},target:{closest:s=>s==='[data-game]'?{dataset:{game:action}}:null}});
const gameResults=run(`studies.map((d,i)=>{current=i;state().route='home';state().scope='local';state().filter='all';fxState().before=false;render();return {...d,html:app.innerHTML}})`);
const gameKeys=['topnav','bottom','directory','cover','compact','character','lists','parallel','event','modules'];
assert.deepEqual(Array.from(run('Object.keys(gameLayouts)')),gameKeys);
for(const r of gameResults){
 assert.equal((r.html.match(/id="draft"/g)||[]).length,1,`${r.n}/game: inline composer`);
 assert(r.html.includes('data-action="report"'),`${r.n}/game: report entry`);
 for(const route of ['notifications','dm','members'])assert(new RegExp(`data-(?:action|game)="route:${route}"`).test(r.html),`${r.n}/game: ${route} entry`);
 assert(!r.html.includes('undefined'),`${r.n}/game: invalid text`);
 const ids=[...r.html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,`${r.n}/game: unique IDs`);
 run('current='+(r.n-1));
 if(gameKeys.includes(r.key)){
  assert.notEqual(run('layouts[studies[current].key]()'),run('originalLayouts[studies[current].key]()'),`${r.n}/game: structure changed`);
  run('fxState().before=true');assert.equal(run('layouts[studies[current].key]()'),run('originalLayouts[studies[current].key]()'),`${r.n}/game: comparison works`);run('fxState().before=false');
 }else assert.equal(run('layouts[studies[current].key]()'),run('originalLayouts[studies[current].key]()'),`${r.n}/game: preserved`);
}
click('study:2');game('scene:옥상');assert.equal(run('getPosts().length'),1);assert(run('getPosts().every(p=>p.place==="옥상")'));game('map-toggle');assert(run('sceneMap()').includes('map-collapsed'));game('scene:전체');
click('study:4');game('wheel');assert(run('commandWheel()').includes('is-open'));game('route:dm');assert.equal(run('state().route'),'dm');assert.equal(run('gameState().wheel'),false);game('route:home');
click('study:7');game('dossier-prev');assert.equal(run('gameState().dossier'),3);game('dossier-next');assert.equal(run('gameState().dossier'),0);game('dossier:2');assert(run('dossierDeck()').includes('도하준'));
click('study:9');game('rift:hidden');assert.equal(run('fxState().veil'),18);dispatch('input',{target:{id:'veil-range',value:61,closest:()=>el('rift-stage')}});assert.equal(run('fxState().veil'),61);
click('study:11');game('scan:trace');assert(el('app').innerHTML.includes('scanner-layout scan-trace'));game('scanpost:p0');game('scan:words');assert(el('app').innerHTML.includes('scanner-layout scan-words'));
click('study:12');input('draft','슬롯 선택에도 남는 상황 기록');game('slot:2');assert.equal(run('state().person'),2);assert.equal(run('state().draft'),'슬롯 선택에도 남는 상황 기록');assert(run('characterConsole()').includes('도하준'));
click('study:13');game('star:3');assert(run('getPosts().every(p=>p.who===3)'));assert.equal(run('getPosts().length'),1);game('star:all');
click('study:16');dispatch('input',{target:{id:'split-range',value:999,closest:()=>el('split-screen')}});assert.equal(run('gameState().split'),70);fx('compare:following');click('route:world');assert(run('splitScreen()').includes('mode-local'));click('route:home');
click('study:18');game('operation:2');assert(run('operationBoard()').includes('다시 일상으로'));input('draft','');game('operation-write');assert(run('state().draft').includes('현장에서 돌아와'));input('draft','이미 쓰던 상황 기록');game('operation:1');game('operation-write');assert.equal(run('state().draft'),'이미 쓰던 상황 기록');
click('study:19');game('hud-edit');assert.equal(run('gameState().hudEdit'),true);assert(run('hudModules()').includes('draggable="true"'));run("gameState().hudOrder=['notice','members','report']");game('hudmove:notice:1');assert.equal(run('gameState().hudOrder[1]'),'notice');
const dataTransfer={setData(){},getData:()=> 'notice'};
dispatch('dragstart',{target:{closest:()=>({dataset:{hud:'notice'},classList:{add(){}}})},dataTransfer});
dispatch('drop',{preventDefault(){},target:{closest:()=>({dataset:{hud:'report'}})},dataTransfer});assert.equal(run('gameState().hudOrder.at(-1)'),'notice');
game('hud-edit');assert(run('hudModules()').includes('draggable="false"'));
for(const n of [3,5,8,10,12,13,14,17,19,20]){click('study:'+(n-1));for(const route of ['members','notifications','dm','home']){click('route:'+route);const h=el('app').innerHTML;assert(!h.includes('undefined'),`${n}/${route}/game`);const ids=[...h.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,`${n}/${route}/game IDs`)}}
const gameCSS=fs.readFileSync('dist/game-experience.css','utf8');assert.equal((gameCSS.match(/\{/g)||[]).length,(gameCSS.match(/\}/g)||[]).length);assert(gameCSS.includes('prefers-reduced-motion'));assert(gameCSS.includes('@media(max-width:700px)'));assert(!gameCSS.includes('infinite'));
fs.mkdirSync('validation/game-experience',{recursive:true});for(const r of gameResults)fs.writeFileSync('validation/game-experience/'+r.n+'.html',r.html);
fs.writeFileSync('validation/game-result.json',JSON.stringify({modified:[3,5,8,10,12,13,14,17,19,20],structurallyDistinctFromBaseline:10,preservedOtherLayouts:10,uniqueComposers:20,reportEntries:20,newInteractions:['scene map','command wheel','dossier carousel','rift boundary','time scanner','character slots','constellation filter','adjustable split screen','operation flow','HUD drag and keyboard reorder'],routeChecks:40,motion:'finite animations with reduced motion override',verification:'Node VM render and event-handler tests; no browser visual testing'},null,2));
fs.mkdirSync('validation/creative-review',{recursive:true});for(const r of results)fs.writeFileSync('validation/creative-review/'+r.n+'.html',r.html);
fs.writeFileSync('validation/result.json',JSON.stringify({designs:20,upgraded:10,preserved:10,baselineComparisons:10,inlineComposers:20,notificationAndDMEntries:20,reportEntries:20,controls:'passed including ten creative enhancements',publicDMSeparation:'passed',routeChecks:80,method:'Node VM rendering / event handlers / source checks. No browser visual QA.'},null,2));
console.log('PASS: 20 layouts, 10 preserved / 10 game-experience upgrades; scene map, wheel, dossier, rift, scanner, slots, constellation, split screen, operation and HUD controls; baseline comparison, public/개별 메시지 separation, draft preservation and 120 route checks. No browser visual QA.');
