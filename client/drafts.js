// Drafts stay in this tab and are partitioned by signed-in account. Never store credentials.
export function createDrafts(getUser){
 const memory=new Map();
 const legacyKey=form=>{const kind=form.dataset.form;if(!['post','action','character','notice','edit-record'].includes(kind))return null;form.dataset.draftOwner??=getUser();return 'us:draft:'+form.dataset.draftOwner+':'+kind+':'+(form.dataset.draftId||form.elements.namedItem('parentId')?.value||form.elements.namedItem('sceneId')?.value||form.elements.namedItem('id')?.value||form.elements.namedItem('day')?.value||'new')};
 const actor=form=>{if(!['post','action'].includes(form.dataset.form))return '';form.dataset.draftCharacter??=form.elements.namedItem('characterId')?.value||'';return form.dataset.draftCharacter};
 const key=form=>{const base=legacyKey(form);return base&&actor(form)?base+':character:'+actor(form):base};
 const read=k=>{try{return JSON.parse(sessionStorage.getItem(k))||memory.get(k)}catch{return memory.get(k)}};
 const write=(k,v)=>{memory.set(k,v);try{sessionStorage.setItem(k,JSON.stringify(v))}catch{}};
 function capture(form){const k=key(form);if(!k||form.dataset.submitting)return;const values={};for(const el of form.elements){if(!el.name||['file','password','submit','button'].includes(el.type))continue;values[el.name]=el.type==='checkbox'?el.checked:el.value}const old=read(k);write(k,{...old,values,requestId:old?.requestId||crypto.randomUUID()})}
 function restoreForm(form){const k=key(form);if(!k)return;let draft=read(k);const oldKey=legacyKey(form),old=oldKey!==k&&read(oldKey);if(!draft&&old?.values?.characterId===actor(form)){draft=old;write(k,old);memory.delete(oldKey);try{sessionStorage.removeItem(oldKey)}catch{}}if(!draft)return;for(const [name,value]of Object.entries(draft.values)){if(name==='characterId'&&actor(form))continue;const el=form.elements.namedItem(name);if(el&&el.type!=='hidden'){if(el.type==='checkbox')el.checked=value;else if(el.tagName!=='SELECT'||[...el.options].some(o=>o.value===value))el.value=value}}}
 function restore(root=document){for(const form of root.querySelectorAll('[data-form]'))restoreForm(form)}
 function clear(form){const k=key(form);if(k){memory.delete(k);try{sessionStorage.removeItem(k)}catch{}}}
 function requestId(form,data){const k=key(form);if(!k)return crypto.randomUUID();const old=read(k)||{values:{}};const fingerprint=JSON.stringify(data);if(old.fingerprint!==fingerprint){old.requestId=crypto.randomUUID();old.fingerprint=fingerprint}write(k,old);return old.requestId}
 document.addEventListener('input',e=>{const form=e.target.closest('[data-form]');if(form)capture(form)});
 document.addEventListener('change',e=>{const form=e.target.closest('[data-form]');if(form)capture(form)});
 return{capture,restore,restoreForm,clear,requestId,captureAll(){document.querySelectorAll('[data-form]').forEach(capture)}};
}
