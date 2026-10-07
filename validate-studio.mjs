import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Executes the shipped renderer and handlers without claiming browser/layout QA.
const nodes=new Map(), listeners={};
function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',open:false,dataset:{},classList:{add(){},remove(){},toggle(){}},showModal(){this.open=true},close(){this.open=false},focus(){},setAttribute(){},addEventListener(){},appendChild(){},querySelector(){return {focus(){}}},scrollIntoView(){}});return nodes.get(id)}
const context=vm.createContext({URLSearchParams,console,Date,location:{search:''},history:{replaceState(){}},document:{getElementById:node,activeElement:{focus(){}},addEventListener:(name,fn)=>listeners[name]=fn},window:{scrollY:0,scrollTo(){}},setTimeout:()=>1,clearTimeout(){}});
const run=code=>vm.runInContext(code,context);
run(['world.js','studio.js'].map(f=>fs.readFileSync('dist/'+f,'utf8')).join('\n'));
const results=run(`designSpecs.map((d,i)=>{designIndex=i;render();return {...d,html:root.innerHTML}})`);
assert.equal(results.length,20);
assert.equal(new Set(results.map(r=>r.key)).size,20);
assert.equal(new Set(results.map(r=>r.html.split('class="site ')[1].split('studio-foot')[0])).size,20);
for(const r of results){
 assert(r.html.includes('data-do="board"'),`${r.n}: report entrance`);
 assert(r.html.includes('data-do="compose"'),`${r.n}: writing entrance`);
 assert(r.html.includes('data-do="more"'),`${r.n}: utility access`);
 assert(r.html.includes('class="post post-'+r.key+'"'),`${r.n}: own post markup`);
 assert(!r.html.includes('undefined'),`${r.n}: invalid data`);
 const ids=[...r.html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,`${r.n}: duplicate HTML IDs`);
}
const click=action=>listeners.click({preventDefault(){},target:{closest:()=>({dataset:{do:action},innerHTML:'',setAttribute(){}})}});
const submit=text=>{node('draft').value=text;node('draft').oninput();node('compose-form').onsubmit({preventDefault(){}})};
click('design:0');click('compose');submit('검증용 <script>문자</script>');
assert(node('app').innerHTML.includes('&lt;script&gt;문자&lt;/script&gt;'));
click('design:1');assert(!node('app').innerHTML.includes('검증용'));
click('design:0');assert(node('app').innerHTML.includes('검증용'));
click('like:p0');assert(run(`state().liked.has('p0')`));
click('like:p0');assert(!run(`state().liked.has('p0')`));
click('save:p0');click('saved');assert(node('modal').innerHTML.includes('가스 사고'));
assert(!node('modal').innerHTML.includes('id="scene-'));
click('reply:p0');assert(node('modal').innerHTML.includes('답멘 쓰기'));
click('compose:p0');submit('실제 답멘 확인');click('reply:p0');assert(node('modal').innerHTML.includes('실제 답멘 확인'));
click('board');assert(node('modal').innerHTML.includes('입장 버튼만 배치'));
click('search');node('search-input').oninput({target:{value:'마패'}});assert(node('search-results').innerHTML.includes('변신이 안 끝나'));
click('catalog');assert.equal((node('modal').innerHTML.match(/class="catalog-card"/g)||[]).length,20);
click('design:3');click('page:1');assert.equal(run('state().selected'),2);assert(node('app').innerHTML.includes('마패 연출'));
click('design:4');click('step:1');assert.equal(run('state().selected'),1);assert(node('app').innerHTML.includes('수리비는 아직'));
click('design:11');click('pick:4');assert(node('app').innerHTML.includes('약속을 어겼다고'));
click('design:6');click('cast:0');assert.equal((node('app').innerHTML.match(/class="post post-cast"/g)||[]).length,1);
click('design:13');click('save:p2');click('filter:저장');assert.equal((node('app').innerHTML.match(/class="post post-folder"/g)||[]).length,1);assert(node('app').innerHTML.includes('마패 연출'));
click('switchto:2');assert.equal(run('state().person'),2);
click('design:14');click('pick:3');assert(node('app').innerHTML.includes('내 안에 있는 양반'));
click('design:19');assert.equal((node('app').innerHTML.match(/href="#scene-/g)||[]).length,6);
click('mono');assert(node('app').innerHTML.includes('monochrome'));
// Each task opens in its own non-modal surface; keyboard dismissal remains available.
click('reply:p0');assert.equal(run('panelKind'),'right');assert.equal(node('modal').hidden,false);
click('world');assert.equal(run('panelKind'),'left');
click('notice');assert.equal(run('panelKind'),'inline');
click('catalog');assert.equal(run('panelKind'),'gallery');
click('compose');assert.equal(run('panelKind'),'compose');
node('draft').value='전환 후에도 남길 초안';node('draft').oninput();
click('switch');click('switchto:1');assert.equal(run('panelKind'),'compose');assert(node('modal').innerHTML.includes('전환 후에도 남길 초안'));
listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(run('panelOpen'),false);
click('design:4');click('step:1');assert(node('app').innerHTML.includes('data-motion="deck"'));
click('design:3');click('page:1');assert(node('app').innerHTML.includes('data-motion="page"'));

const css=['studio.css','responsive.css','density.css','interaction.css'].map(f=>fs.readFileSync('dist/'+f,'utf8')).join('\n');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
for(const r of results)assert(css.includes('.design-'+r.key),`${r.n}: missing styles`);
for(const feature of ['perspective:','scroll-snap-type:','backdrop-filter:','clip-path:','prefers-reduced-motion','@media(max-width:700px)'])assert(css.includes(feature));
const html=fs.readFileSync('dist/index.html','utf8');
assert(html.includes('Usual Saviors — 독립 UI 디자인 20안'));
assert(!html.includes('<dialog'));
assert(!fs.readFileSync('dist/studio.js','utf8').includes('showModal'));
for(const [,file] of html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css))"/g))assert(fs.statSync('dist/'+file).size>0);
assert(fs.statSync('dist/portraits.png').size>100000);
fs.mkdirSync('validation',{recursive:true});
for(const r of results)fs.writeFileSync(`validation/study-${r.n}.html`,r.html);
fs.writeFileSync('validation/result.json',JSON.stringify({designs:20,independentPageTemplates:20,independentPostTemplates:20,reportEntrances:20,utilityMenus:20,controls:'passed',responsiveRules:'present; not browser tested',method:'Node VM static rendering and interaction handlers, no browser QA'},null,2));
console.log('PASS: 20 page/post templates; entries, per-design posts, escaping, replies, likes, saved/search, book/deck/orbit/cast/folder/cross/chapter controls; CSS and asset integrity. No browser QA.');
