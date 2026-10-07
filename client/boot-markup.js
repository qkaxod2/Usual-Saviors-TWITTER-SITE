// Shared by the personnel dialog and the HTML served before the application loads.
export function bootMarkup({entry=false,record=1}={}) {
 const personnelWho=record-1;
 const markup=`<section id="personnel-boot" class="personnel-loading" data-stage="0" aria-label="인사기록 준비">
<div class="boot-topline" aria-hidden="true"><span><i></i> PERSONNEL INTERFACE</span><span>RECORD / 0${personnelWho+1}</span></div>
<div class="boot-edges" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<div class="boot-visual" aria-hidden="true"><div class="boot-scan"></div><div class="boot-readout readout-display"><span>DISPLAY</span><i></i><i></i><i></i></div><div class="boot-target"><i class="boot-calibration"></i><svg class="boot-reticle" viewBox="0 0 240 240" fill="none"><path d="M48 18H18V48M192 18H222V48M222 192V222H192M48 222H18V192"/><path class="reticle-guides" d="M120 2V18M120 222V238M2 120H18M222 120H238"/></svg><svg class="boot-progress-orbit" viewBox="0 0 220 220" fill="none"><circle class="orbit-track" cx="110" cy="110" r="106"/><circle class="orbit-fill" cx="110" cy="110" r="106" pathLength="100"/></svg><i class="boot-ring ring-outer"></i><i class="boot-ring ring-inner"></i><i class="boot-cross cross-a"></i><i class="boot-cross cross-b"></i><div class="boot-core"><span id="boot-core-status">INITIALIZING</span><b id="boot-percent">00<small>%</small></b><em>PERSONNEL</em><svg class="boot-ready-mark" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15"/><path d="m9 16 5 5 9-10" pathLength="1"/></svg></div></div><div class="boot-readout readout-record"><span>RECORD</span><i></i><i></i><i></i></div><span class="boot-coordinate coordinate-a">US / P-${String(personnelWho+1).padStart(2,'0')}</span><span class="boot-coordinate coordinate-b">RECORD INTERFACE</span></div>
<div class="boot-caption"><span class="boot-eyebrow">PERSONNEL RECORD</span><p id="personnel-loading-phase" role="status">화면 초기화</p><div class="personnel-progress"><i id="personnel-progress-bar"></i></div><div class="boot-measure"><span>PREPARING WORKSPACE</span><output id="personnel-progress">STANDBY</output></div></div>
<div class="boot-checks" aria-hidden="true"><span class="boot-check check-one"><i></i><span class="boot-check-label"><span class="boot-step-number">01</span><span>화면 구성</span></span></span><span class="boot-check check-two"><i></i><span class="boot-check-label"><span class="boot-step-number">02</span><span>입력 항목</span></span></span><span class="boot-check check-three"><i></i><span class="boot-check-label"><span class="boot-step-number">03</span><span>작성 준비</span></span></span></div>
</section>`;
 if(!entry)return markup;
 return markup
  .replaceAll('id="personnel-','id="entry-')
  .replaceAll('id="boot-','id="entry-')
  .replace('aria-label="인사기록 준비"','aria-label="사이트 준비"')
  .replaceAll('PERSONNEL INTERFACE','USUAL SAVIORS')
  .replaceAll('PERSONNEL RECORD','AFTER HOURS')
  .replaceAll('PERSONNEL','SAVIORS')
  .replace('RECORD / 01','CONNECTION / 01')
  .replace('RECORD INTERFACE','YOUR EVERYDAY, CONTINUED')
  .replace('화면 초기화','일상을 불러오는 중')
  .replace('입력 항목','기록 연결')
  .replace('작성 준비','접속 준비');
}
