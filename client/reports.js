export const emptyReportFilters=()=>({from:'',to:'',place:'',characterId:''});
export function reportQuery(page,filters) {
 const params=new URLSearchParams({page:String(page)});
 for(const [key,value] of Object.entries(filters))if(value)params.set(key,value);
 return params.toString();
}
export function reportPageNumbers(page,total) {
 const start=Math.max(1,Math.min(page-2,total-4));
 return Array.from({length:Math.min(5,total)},(_,i)=>start+i);
}
export function createReportsUI({state:S,escape:e,button,gate,form,help,canEdit,empty,focus}) {
 const filters=()=>S.reportFilters;
 function filterPanel() {
  const f=filters(),count=Object.values(f).filter(Boolean).length;
  const chips=[f.from||f.to?`${f.from||'처음'} ~ ${f.to||'현재'}`:'',f.place?`장소: ${f.place}`:'',f.characterId?`인물: ${S.characters.find(c=>c.id===f.characterId)?.name||'선택한 인물'}`:''].filter(Boolean);
  return `<div class="report-toolbar"><p class="report-count" role="status"><b>${S.reportTotal}개 장면</b><span>최신 날짜순</span></p>${button('필터'+(count?` · ${count}`:''),'report-filters','outline',`aria-expanded="${S.reportFiltersOpen}" aria-controls="report-filter-panel"`)}</div>
  <form id="report-filter-panel" class="report-filters" data-report-filters ${S.reportFiltersOpen?'':'hidden'}>
   <div class="report-filter-fields"><label>시작일<input type="date" name="from" value="${e(f.from)}"></label><label>종료일<input type="date" name="to" value="${e(f.to)}"></label><label>장소<input type="search" name="place" maxlength="60" placeholder="장소 이름" value="${e(f.place)}"></label><label>등장인물<select name="character"><option value="">전체 인물</option>${S.characters.map(c=>`<option value="${e(c.id)}" ${c.id===f.characterId?'selected':''}>${e(c.name)}</option>`).join('')}</select></label></div>
   <p class="form-error" role="alert"></p><footer>${button('초기화','report-reset','quiet-button')}<button type="submit" class="primary">필터 적용</button></footer>
  </form>${chips.length?`<div class="report-active-filters" aria-label="적용한 필터">${chips.map(chip=>`<span>${e(chip)}</span>`).join('')}${button('모두 해제','report-reset','quiet-button')}</div>`:''}`;
 }
 function pagination() {
  const page=S.reportPage,total=S.reportPages;
  return `<nav class="report-pagination" aria-label="보고로그 페이지">${button('이전','report-page:'+(page-1),'outline',`${page<=1?'disabled':''} aria-label="이전 페이지"`)}<div class="report-page-numbers">${reportPageNumbers(page,total).map(n=>button(String(n),'report-page:'+n,'report-page',`aria-label="${n}페이지" ${n===page?'aria-current="page"':''}`)).join('')}</div>${button('다음','report-page:'+(page+1),'outline',`${page>=total?'disabled':''} aria-label="다음 페이지"`)}<small>${page} / ${total} 페이지</small></nav>`;
 }
 function sceneCard(scene) {
  return `<article class="server-scene" data-record="${e(scene.id)}"><header><div><span class="eyebrow">${e(scene.day)}</span><b>${e(scene.place||'장소 미지정')}</b><p class="scene-people">${e([...new Set(scene.entries.map(a=>a.name))].join(' · '))}</p></div><small>${scene.entries.length}개 기록<br>마지막 행동 ${e(scene.entries.at(-1)?.at||'—')}</small></header>${scene.entries.map((a,i)=>`<div class="server-action"><span>${i?'ㄴ':'●'}</span><time>[${e(a.at)}]</time><p><b>${e(a.name)}</b> ${e(a.body)}</p>${canEdit(a)?`<div class="row-tools">${button('수정','edit-action:'+a.id)}${button('삭제','delete:action:'+a.id)}</div>`:''}</div>`).join('')}${S.user&&S.characters.some(c=>c.user_id===S.user.id)?`<details><summary>이 장면에 이어서 기록</summary>${form(scene)}</details>`:''}</article>`;
 }
 function render() {
  const selected=focus(),filtered=Object.values(filters()).some(Boolean);
  const context=selected?`<div class="context-strip"><span>${selected.source==='created'?'새로 작성한 장면':'알림에서 연결된 장면'}</span>${button('보고로그 목록으로','report-list','outline')}</div>`:filterPanel();
  const noResults=filtered?empty('조건에 맞는 장면이 없습니다.','필터를 바꾸거나 해제해 보세요.')+button('필터 모두 해제','report-reset','outline'):empty('아직 보고로그가 없습니다.','새 장면의 첫 행동을 남겨 보세요.');
  return `<section class="records-panel report-panel">${context}<div class="report-help-inline">${button('보고로그 사용법','report-help','quiet-button',`aria-controls="report-help-panel" aria-expanded="${S.reportHelp}"`)}${help()}</div>${gate()}${!selected&&S.user&&S.characters.some(c=>c.user_id===S.user.id)?form():''}<div id="report-results" class="server-scenes" tabindex="-1" aria-label="보고로그 장면 목록">${S.scenes.length?S.scenes.map(sceneCard).join(''):noResults}</div>${!selected?pagination():''}</section>`;
 }
 return {render};
}
