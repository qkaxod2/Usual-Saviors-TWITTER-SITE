import assert from 'node:assert/strict';
import {createAfterhoursUI} from '../client/afterhours.js';

const characters=[
  {id:'public-first',user_id:'other',name:'다른 회원 인물',image_id:'other-image',intro:'다른 회원의 소개'},
  {id:'owned',user_id:'member',name:'내 인물',image_id:'owned-image',intro:'내 소개'},
];
const state={user:null,characters,selected:'',route:'home',unread:0};
const ui=createAfterhoursUI({
  state,
  escape:v=>String(v??''),
  button:(text,action)=>`<button data-do="${action}">${text}</button>`,
  face:c=>c?`<img src="/api/images/${c.image_id}" alt="${c.name}">`:'<span>·</span>',
  I:()=>'',
  mine:()=>state.characters.filter(c=>c.user_id===state.user?.id),
});
const personalSurfaces=()=>ui.characterPanel()+ui.terminal(true);
function assertNoActor({hasOwnedChoices=false}={}){
  assert.equal(ui.active(),null);
  assert.equal(ui.scene(),null);
  const html=hasOwnedChoices?ui.terminal()+ui.terminal(true):personalSurfaces();
  assert.doesNotMatch(html,/<img|data-do="profile:|다른 회원 인물|다른 회원의 소개|내 인물|내 소개/);
}

// Public character images must never become an anonymous visitor's identity.
assertNoActor();
assert.match(ui.characterPanel(),/VISITOR/);
assert.match(ui.terminal(),/data-do="login"/);
assert.match(ui.terminal(true),/방문자/);

state.user={id:'member'};state.selected='owned';
assert.equal(ui.scene(),characters[1]);
assert.match(personalSurfaces(),/owned-image/);
assert.doesNotMatch(ui.terminal()+ui.terminal(true),/other-image/);
assert.match(ui.terminal(),/data-do="profile:owned"/);

// Logout and account switching must not reuse the previous selection.
state.user=null;
assertNoActor();
state.user={id:'new-member'};
assertNoActor();
assert.match(ui.terminal(),/data-do="personnel"/);
assert.match(ui.terminal(),/캐릭터 미선택/);
state.user={id:'member'};state.selected='public-first';
assertNoActor({hasOwnedChoices:true});
assert.doesNotMatch(ui.characterPanel(),/other-image|다른 회원 인물|다른 회원의 소개/);

// Once the owning account selects that character, its portrait is available.
state.user={id:'other'};
assert.equal(ui.active(),characters[0]);
assert.match(ui.terminal(true),/other-image/);
console.log('Guest, logout, account-switch and owned-character display boundaries verified.');
