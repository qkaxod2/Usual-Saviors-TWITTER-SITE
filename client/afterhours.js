export function createAfterhoursUI({state:S,escape:e,button,face,I,mine}) {
  const titles={home:'타임라인',reports:'보고로그',members:'인물 목록',bulletin:'공지',alerts:'알림',admin:'관리실'};
  const captions={home:'THE NIGHT GOES ON',reports:'ONE SCENE, MANY STORIES',members:'PEOPLE OF THE NIGHT',bulletin:'COMMUNITY NOTICE',alerts:'YOUR STORIES, CONTINUED',admin:'COMMUNITY MANAGEMENT'};
  const active=()=>S.user?mine().find(c=>c.id===S.selected&&c.user_id===S.user.id)||null:null;
  const scene=()=>active();
  const count=()=>`<span class="unread-badge" data-unread ${S.unread?'':'hidden'}>${S.unread>99?'99+':S.unread}</span>`;
  const alertButton=()=>button(`${I('bell')}<span>알림</span>${count()}`,'route:alerts','header-alert','data-alert-button aria-label="알림"');
  const choices=()=>mine().map(c=>button(`${face(c)}<span>${e(c.name)}</span>`,'select-character:'+c.id,'cast-button',`aria-pressed="${c.id===S.selected}" aria-label="${e(c.name)}로 작성"`)).join('');
  function terminal(compact=false) {
    const c=scene();
    if(compact)return `<div class="terminal-mobile-label"><span>US / PERSONAL TERMINAL</span><span data-hud-state role="status">열람 중</span><i class="hud-led" aria-hidden="true"></i></div>${face(c)}<div class="mobile-actor-name"><b>${e(active()?.name||(S.user?'캐릭터 미선택':'방문자'))}</b><small data-hud-view>${titles[S.route]}</small></div>${S.user?button(mine().length?'캐릭터 선택':'캐릭터 등록',mine().length?'character-picker':'personnel','mobile-actor-select'):button('로그인','login','mobile-actor-select')}`;
    return `<section class="terminal-shell" aria-label="개인 단말기"><div class="terminal-bezel"><span>US / PERSONAL TERMINAL</span><i aria-hidden="true"></i></div><div class="terminal-glass"><div class="hud-owner"><h2>${e(c?.name||(S.user?'캐릭터 미선택':'방문자'))}</h2><span>${S.user?'WRITER':'VISITOR'}</span></div><div class="hud-view-row"><span>VIEW</span><span data-hud-view>${titles[S.route]}</span></div><div class="hud-status-row"><i class="hud-led" aria-hidden="true"></i><span data-hud-state role="status">열람 중</span><span class="hud-ticks" aria-hidden="true"></span></div></div>${button(c?'내 인물 기록':S.user?'첫 캐릭터 등록':'로그인',c?'profile:'+c.id:S.user?'personnel':'login','character-link')}</section>`;
  }
  function characterPanel() {
    const c=scene();
    return `<div class="character-caption">${S.user?'YOUR CHARACTER':'VISITOR'}</div><div class="character-stage"><div class="portrait-plane">${c?face(c):'<div class="empty-portrait" aria-hidden="true">US</div>'}<span class="portrait-cross" aria-hidden="true">＋</span><span class="portrait-letter" aria-hidden="true">${e(c?.callsign||c?.name||'SAVIORS')}</span></div></div><div class="character-info">${c?.intro?`<p class="character-quote">${e(c.intro)}</p>`:''}${terminal()}</div>${S.user?`<div class="cast-caption">작성할 캐릭터${button('관리','personnel','quiet-button')}</div><div class="cast-switch" aria-label="내 작성 캐릭터 선택">${choices()||button('첫 캐릭터 등록','personnel','outline')}</div>`:`<p class="guest-character-note">로그인하면 내 캐릭터로 이야기를 이어갈 수 있습니다.</p>`}`;
  }
  function navigation() {
    const items=[['home','타임라인'],['reports','보고로그'],['members','인물 목록'],['bulletin','공지'],['alerts','알림'],['personnel','인사기록'],...(S.user?.role==='admin'?[['admin','관리실']]:[])];
    const nav=(item,i,mobile=false)=>button(`<span class="nav-number">${String(i+1).padStart(2,'0')}</span><span>${item[1]}</span>${item[0]==='alerts'?count():''}`,item[0]==='personnel'?'personnel':'route:'+item[0],`nav-item terminal-key ${i>2&&!mobile?'nav-extra':''} ${S.route===item[0]?'selected':''}`,`${S.route===item[0]?'aria-current="page"':''} ${item[0]==='personnel'?'data-terminal="personnel" aria-haspopup="dialog"':''}`);
    const motion=()=>button('동작 줄이기','toggle-motion','quiet-button motion-control',`aria-pressed="${document.documentElement.dataset.reducedMotion==='true'}"`);
    return `<aside class="sidebar"><div class="nav-caption">YOUR EVERYDAY, CONTINUED</div><nav class="primary-nav" aria-label="주 메뉴">${items.map((item,i)=>nav(item,i)).join('')}<details class="mobile-more"><summary aria-label="더 많은 메뉴">더 보기</summary><div class="mobile-more-panel">${items.slice(3).map((item,i)=>nav(item,i+3,true)).join('')}${button('연출 다시 보기','replay-motion','quiet-button')}${motion()}</div></details></nav><div class="nav-tools">${button('↻ 연출 다시 보기','replay-motion','quiet-button')}${motion()}</div><p class="sidebar-foot">USUAL SAVIORS<br>BETWEEN THE EVERYDAYS.</p></aside>`;
  }
  function shell(content) {
    const c=active();
    return `<div class="afterhours-ui" data-route="${S.route}"><header class="masthead"><a class="wordmark" href="#" data-do="route:home"><i class="brand-mark" aria-hidden="true"></i><span>USUAL SAVIORS<small>AFTER HOURS</small></span></a><div class="account">${S.user?`${alertButton()}${button(c?face(c)+`<span>${e(c.name)}</span>`:e(S.user.displayName),'account','account-button','data-account-identity aria-label="내 계정"')}`:`${button('로그인','login','quiet-button')}${button('회원가입','signup','primary')}`}</div></header><div class="app-layout">${navigation()}<main class="terminal-content reading-column"><header class="page-heading"><div><p class="eyebrow">${captions[S.route]||captions.home}</p><h1>${titles[S.route]||titles.home}</h1></div>${S.route!=='admin'?button(I('boost'),'retry','refresh-page',`aria-label="${titles[S.route]} 새로고침"`):''}</header><div class="mobile-character terminal-mobile" data-mobile-terminal aria-label="개인 단말기">${terminal(true)}</div>${content}</main><aside class="character-side" aria-label="${S.user?'현재 작성 캐릭터':'방문자 단말기'}" data-character-panel>${characterPanel()}</aside></div><footer class="community-footer"><span>USUAL SAVIORS</span><span>그리고, 다시 일상으로.</span></footer></div>`;
  }
  return {active,scene,shell,characterPanel,terminal,choices,titles};
}
