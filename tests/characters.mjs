import assert from 'node:assert/strict';
import {createCharacterSelection} from '../client/characters.js';
import {createDrafts} from '../client/drafts.js';
const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const selection=createCharacterSelection(storage),characters=[{id:'a1',user_id:'a'},{id:'a2',user_id:'a'},{id:'b1',user_id:'b'}];
assert.equal(selection.resolve(null,characters),'');
assert.equal(selection.resolve('a',characters),'a1');
assert.equal(selection.select('a',characters,'a2'),'a2');
assert.equal(selection.resolve('a',characters),'a2','selection persists');
assert.equal(selection.resolve('b',characters,'a2'),'b1','account switch cannot inherit another actor');
assert.throws(()=>selection.select('a',characters,'b1'));
assert.equal(selection.resolve('a',characters.filter(c=>c.id!=='a2'),'a2'),'a1','deleted actor falls back to an owned actor');
assert.equal(selection.resolve('a',[],'a1'),'');
globalThis.sessionStorage=storage;globalThis.document={addEventListener(){},querySelectorAll(){return[]}};
let user='a';const drafts=createDrafts(()=>user);
function form(kind,id,context,body=''){
 const fields=[{name:'characterId',type:'select-one',tagName:'SELECT',value:id,options:characters.map(c=>({value:c.id}))},{name:'body',type:'textarea',tagName:'TEXTAREA',value:body}];
 if(context)fields.push({name:kind==='post'?'parentId':'sceneId',type:'hidden',value:context});
 fields.namedItem=name=>fields.find(x=>x.name===name);
 return {dataset:{form:kind,draftCharacter:id},elements:fields};
}
for(const [kind,context] of [['post',''],['post','root-1'],['action',''],['action','scene-1']]){
 const first=form(kind,'a1',context,'첫 인물 초안'),second=form(kind,'a2',context,'두 번째 인물 초안');
 drafts.capture(first);const retry=drafts.requestId(first,{characterId:'a1',body:'첫 인물 초안'});drafts.capture(second);
 const back=form(kind,'a1',context);drafts.restoreForm(back);assert.equal(back.elements.namedItem('body').value,'첫 인물 초안');assert.equal(back.elements.namedItem('characterId').value,'a1');
 assert.equal(drafts.requestId(back,{characterId:'a1',body:'첫 인물 초안'}),retry,'switching must preserve retry identity');
 const next=form(kind,'a2',context);drafts.restoreForm(next);assert.equal(next.elements.namedItem('body').value,'두 번째 인물 초안');
 drafts.clear(first);const cleared=form(kind,'a1',context);drafts.restoreForm(cleared);assert.equal(cleared.elements.namedItem('body').value,'');drafts.restoreForm(next);assert.equal(next.elements.namedItem('body').value,'두 번째 인물 초안');
}
// The select change event can arrive after its value changes: identity remains the original form's actor.
const old=form('post','a1','change','전환 직전 초안');old.elements.namedItem('characterId').value='a2';drafts.capture(old);
const back=form('post','a1','change');drafts.restoreForm(back);assert.equal(back.elements.namedItem('body').value,'전환 직전 초안');assert.equal(back.elements.namedItem('characterId').value,'a1');
user='b';const other=form('post','b1','change');drafts.restoreForm(other);assert.equal(other.elements.namedItem('body').value,'');
user='a';storage.setItem('us:draft:a:post:legacy',JSON.stringify({values:{characterId:'a2',body:'기존 버전의 초안'},requestId:'legacy-retry'}));
const wrong=form('post','a1','legacy');drafts.restoreForm(wrong);assert.equal(wrong.elements.namedItem('body').value,'');
const legacy=form('post','a2','legacy');drafts.restoreForm(legacy);assert.equal(legacy.elements.namedItem('body').value,'기존 버전의 초안');drafts.clear(legacy);
const once=form('post','a2','legacy');drafts.restoreForm(once);assert.equal(once.elements.namedItem('body').value,'','saved legacy drafts must not reappear');
console.log('Owned character selection, account changes, removed actors, per-character post/reply/action drafts, retry identity and legacy migration verified.');
