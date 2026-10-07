import assert from 'node:assert/strict';
import {createDrafts} from '../client/drafts.js';
const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.document={addEventListener(){},querySelectorAll(){return[]}};
let user='alice';const drafts=createDrafts(()=>user);
function form(value=''){const el={name:'body',type:'textarea',value,tagName:'TEXTAREA'},elements=[el];elements.namedItem=name=>elements.find(x=>x.name===name);return {dataset:{form:'post'},elements}}
const a=form('unfinished');drafts.capture(a);const key=drafts.requestId(a,{body:'unfinished'});
drafts.capture(a);assert.equal(drafts.requestId(a,{body:'unfinished'}),key,'navigation must not change retry key');
const restored=form();drafts.restore({querySelectorAll:()=>[restored]});assert.equal(restored.elements[0].value,'unfinished');
user='bob';drafts.capture(a);const b=form();drafts.restore({querySelectorAll:()=>[b]});assert.equal(b.elements[0].value,'','account change must not transfer drafts');
user='alice';assert.notEqual(drafts.requestId(a,{body:'changed'}),key,'changed payload must get new request key');
a.dataset.submitting='true';drafts.clear(a);drafts.capture(a);assert.equal(storage.size,0,'render during completion must not resurrect a saved draft');
console.log('Draft recovery, account separation, retry identity and successful-save clearing verified.');
function reportForm(character='char-a'){
 const elements=[{name:'body',type:'text',value:'',tagName:'INPUT'},{name:'day',type:'date',value:'2026-09-06',tagName:'INPUT'},{name:'characterId',type:'hidden',value:character,tagName:'INPUT'}];
 elements.namedItem=name=>elements.find(el=>el.name===name);
 return {dataset:{form:'action',draftId:'2026-09-06',draftCharacter:character},elements};
}
const report=reportForm();report.elements.namedItem('day').value='2026-08-25';report.elements.namedItem('body').value='이전 날짜에 쓸 행동';drafts.capture(report);
const afterPaging=reportForm();drafts.restoreForm(afterPaging);
assert.equal(afterPaging.elements.namedItem('day').value,'2026-08-25');
assert.equal(afterPaging.elements.namedItem('body').value,'이전 날짜에 쓸 행동','paging or filtering keeps a draft with a changed writing date');
const otherActor=reportForm('char-b');drafts.restoreForm(otherActor);assert.equal(otherActor.elements.namedItem('body').value,'');
console.log('Report writing date and character-specific drafts survive list changes.');
