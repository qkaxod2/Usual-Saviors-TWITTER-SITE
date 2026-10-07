import {hueOf} from './hue.js';
export function flattenPosts(posts){
 const result=[],stack=[...posts].reverse();
 while(stack.length){const post=stack.pop();result.push(post);stack.push(...(post.replies||[]).slice().reverse())}
 return result;
}
export function revealReply(posts,id,expanded){
 const map=new Map(flattenPosts(posts).map(post=>[post.id,post]));
 let post=map.get(id);
 while(post?.parent_id){expanded.add(post.parent_id);post=map.get(post.parent_id)}
}
export function replyBranch(posts,id){
 const map=new Map(flattenPosts(posts).map(post=>[post.id,post]));
 let post=map.get(id),branch=post;
 while(post?.parent_id){branch=post;post=map.get(post.parent_id)}
 return branch&&branch.id!==id?branch:null;
}
export function createPostRenderer({state,escape:e,button,face,date,canEdit,mine,expanded}){
 let continued=new Set();
 function card(post,depth=0,parent=null,windowMode=false,rightCharacter=null){
  const children=post.replies||[],count=flattenPosts(children).length,open=depth>0||expanded.has(post.id);
  const descendants=depth===0?(windowMode?flattenPosts(children):children):[],parents=new Map([post,...flattenPosts(children)].map(item=>[item.id,item]));
  if(windowMode&&depth===0){const cast=[post,...descendants];rightCharacter=cast.some(item=>item.character_id===state.selected)?state.selected:cast.find(item=>item.character_id!==post.character_id)?.character_id;continued=new Set(cast.filter((item,i)=>i&&cast[i-1].character_id===item.character_id).map(item=>item.id))}
  return `<article class="server-post ${windowMode?'chat-message '+(post.character_id===rightCharacter?'chat-out':'chat-in')+(continued.has(post.id)?' chat-cont':''):''} ${depth?'reply-post':''}" style="--hue:${hueOf(post.name)}" data-record="${e(post.id)}" data-thread-depth="${Math.min(depth,2)}"><div class="post-top">${button(face(post)+(windowMode?`<b class="chat-card-name">${e(post.name)}</b>`:''),'profile:'+post.character_id,'avatar-button',`aria-label="${e(post.name)} 프로필"`)}${windowMode?'':`<div><b>${e(post.name)}</b><time>${date(post.created_at)}</time></div>`}${!windowMode&&canEdit(post)?`<div class="row-tools">${button('수정','edit-post:'+post.id)}${button('삭제','delete:post:'+post.id)}</div>`:''}</div>${parent?`<p class="reply-context">${e(parent.name)}에게 답글</p>`:''}<p class="post-body">${e(post.body)}</p>${windowMode?`<time class="chat-time">${date(post.created_at)}</time>`:''}<footer class="thread-actions">${state.user&&mine().length?button('답글 쓰기','reply:'+post.id,'outline',`aria-expanded="false" aria-controls="${windowMode?'thread-composer':'reply-'+e(post.id)}"`):''}${count&&!windowMode&&depth===0?button(`답글 ${children.length}개 ${open?'접기':'펼치기'}`,'toggle-replies:'+post.id,'quiet-button',`aria-expanded="${open}" aria-controls="replies-${e(post.id)}" data-reply-count="${children.length}"`):''}${count&&depth>0&&!windowMode?button('대화 창 열기 · '+count,'thread-open:'+post.id,'outline','aria-haspopup="dialog"'):''}${windowMode&&canEdit(post)?button('수정','edit-post:'+post.id,'chat-edit')+button('삭제','delete:post:'+post.id,'chat-delete'):''}</footer><div id="${windowMode?'window-':''}reply-${e(post.id)}" data-reply-slot></div>${count&&depth===0?`<div class="post-replies" id="replies-${e(post.id)}" ${windowMode||open?'':'hidden'}>${descendants.map(child=>card(child,1,parents.get(child.parent_id),windowMode,rightCharacter)).join('')}</div>`:''}</article>`;
 }
 return card;
}
