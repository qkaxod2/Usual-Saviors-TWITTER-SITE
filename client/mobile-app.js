export function createMobileApp({api,getUser}){
 let supported=false,enabled=false,busy=false,message='',registered=null,config=null,bound='';
 let diagnosticId='',diagnosticMessage='',diagnosticTimer;
 const results=new Map();
 try{const saved=JSON.parse(sessionStorage.getItem('push-diagnostic-current')||'null');if(saved?.expires>Date.now()&&/^[a-f0-9-]{36}$/.test(saved.id))diagnosticId=saved.id}catch{}
 let diagnosticPhase='',lastSuccess='',reportMessage='';
 const terminalStages=new Set(['account_missing','account_mismatch','state_error','display_ok','display_error','cleanup_error']);
 function waitForPhase(phase,ms,success){
  clearTimeout(diagnosticTimer);diagnosticPhase=phase;if(success)lastSuccess=success;
  diagnosticTimer=setTimeout(()=>{
   diagnosticMessage=`${diagnosticId?'진단 '+diagnosticId.slice(0,8)+' ':''}${phase} 시간 초과. 마지막 확인: ${lastSuccess||'테스트 시작'}. 실제 미수신인지 보고 실패인지는 아직 구분되지 않았습니다.`;
   render();
  },ms);
 }
 async function bounded(promise,ms,label){
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' 시간 초과. 작업 완료 여부는 확인되지 않았습니다.')),ms)})])}finally{clearTimeout(timer)}
 }
 const stageLabels={received:'기기가 푸시를 수신했습니다.',lookup_started:'로그인 상태를 확인하고 있습니다.',lookup_ok:'계정 조회가 응답했습니다.',lookup_http_error:'계정 조회 요청이 거절되었습니다.',lookup_error:'계정 조회 중 연결 또는 처리 오류가 발생했습니다.',account_missing:'기기 알림 처리기에서 로그인 계정을 찾지 못했습니다.',account_mismatch:'알림을 신청한 계정과 현재 계정이 다릅니다.',state_error:'기기의 알림 상태를 읽는 중 오류가 발생했습니다.',display_started:'브라우저에 알림 표시를 요청했습니다.',display_ok:'브라우저의 표시 처리가 완료됐습니다. 실제 알림이 안 보이면 이 결과를 알려 주세요.',display_error:'브라우저가 알림 표시를 실패했습니다.',cleanup_error:'알림 표시 후 정리 단계에서 오류가 발생했습니다.'};
 function showDiagnostic(record){
  if(record.id!==diagnosticId)return;
  if(record.sequence!==(showDiagnostic.sequence||0)){
   showDiagnostic.sequence=record.sequence;
   if(terminalStages.has(record.stage)||(record.stage==='lookup_http_error'&&record.httpStatus<500&&![408,429].includes(record.httpStatus)))clearTimeout(diagnosticTimer);
   else waitForPhase(record.stage==='display_started'?'알림 표시 처리':'기기 알림 처리',15000,stageLabels[record.stage]);
  }
  reportMessage=record.report==='accepted'?'서버가 이 단계의 수신 보고를 확인했습니다.':record.report==='failed'?`서버 보고 실패. ${record.reportError||'연결 오류'}${record.reportStatus?' HTTP '+record.reportStatus:''}. 기기 기록을 보관했으며 재연결 시 재시도합니다.`:record.report==='storage_failed'?'기기 진단 기록 저장 실패. 서버 보고를 시도합니다.':'서버에 이 단계의 보고를 전송 중입니다.';
  diagnosticMessage=`진단 ${record.id.slice(0,8)} · ${stageLabels[record.stage]||'상태 확인 중'}${record.error?' ('+record.error+')':''}${record.httpStatus?' HTTP '+record.httpStatus:''}${record.silent?' · 무음 처리':''}`;
  render();
 }
 navigator.serviceWorker?.addEventListener('message',event=>{
  const d=event.data;
  if(d?.type!=='push-diagnostic'||d.version!=='push-diag-v2'||!stageLabels[d.stage]||typeof d.id!=='string'||!/^[a-f0-9-]{36}$/.test(d.id))return;
  // Only display allowlisted error names/status values, never arbitrary worker text.
  if(!Number.isInteger(d.sequence)||d.sequence<1||d.sequence>40||(results.get(d.id)?.sequence||0)>d.sequence)return;
  const record={id:d.id,stage:d.stage,sequence:d.sequence,silent:d.silent===true,error:['TypeError','DataCloneError','NotAllowedError','InvalidStateError','SecurityError','AbortError','TimeoutError','NetworkError','SyntaxError','Error'].includes(d.error)?d.error:null,httpStatus:Number.isInteger(d.httpStatus)&&d.httpStatus>=100&&d.httpStatus<=599?d.httpStatus:null};
  record.report=['accepted','failed','pending','storage_failed'].includes(d.report)?d.report:'pending';
  record.reportError=['NetworkError','TimeoutError','HttpError'].includes(d.reportError)?d.reportError:null;
  record.reportStatus=Number.isInteger(d.reportStatus)?d.reportStatus:null;
  results.set(d.id,record);if(results.size>5)results.delete(results.keys().next().value);showDiagnostic(record);
 });
 async function diagnosticWorker(reg){
  await bounded(reg.update(),10000,'알림 처리기 업데이트');
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
   const version=await new Promise(resolve=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();resolve(null)},700);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.version)};reg.active?.postMessage({type:'push-diagnostic-version'},[channel.port2])});
   if(version==='push-diag-v2')return;
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw Error('알림 진단 업데이트가 아직 적용되지 않았습니다. 앱을 완전히 닫았다가 다시 열어 주세요.');
 }
 const canPush=()=>typeof Notification!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window;
 async function registration(){return registered||=navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready)}
 function panel(){
  const message=[getStatus(),diagnosticMessage,reportMessage].filter(Boolean).join(' ').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<section class="mobile-app-settings" data-push-settings><h2>앱 · 휴대폰 알림</h2><p>안드로이드 앱에서 같은 계정과 캐릭터로 이어서 이용하세요.</p><a class="outline app-download" href="/downloads/usual-saviors-1.0.2.apk" download>안드로이드 APK 1.0.2 다운로드</a><small>1.0.2는 Chrome으로 실행합니다. 업데이트 후 다시 로그인하고 이 기기의 알림을 켜 주세요. 기존 앱을 삭제할 필요는 없습니다.</small><a class="outline" href="intent://notification-diagnostics#Intent;scheme=usualsaviors;package=com.usualsaviors.app;end">앱 알림 차단 상태 확인</a><small>위 검사는 APK 1.0.2 설치 후 사용할 수 있습니다. 앱과 채널 차단 여부를 확인하며 실제 팝업 표시를 보장하는 검사는 아닙니다.</small><div class="push-controls"><button type="button" class="outline" data-push-action="toggle" ${busy||!getUser()||!supported?'disabled':''}>${busy?'연결 중…':enabled?'이 기기 알림 끄기':'이 기기 알림 켜기'}</button>${enabled?'<button type="button" class="quiet-button" data-push-action="test">테스트 알림 보내기</button>':''}</div><p class="push-message" role="status">${message||(!getUser()?'로그인하면 답글·보고로그·새 공지 알림을 받을 수 있습니다.':!supported?'이 환경에서는 푸시 알림을 지원하지 않습니다.':'알림 허용 여부는 기기마다 따로 설정됩니다.')}</p></section>`;
 }
 function getStatus(){return message}
 function render(){document.querySelectorAll('[data-push-settings]').forEach(el=>{el.outerHTML=panel()})}
 async function replay(){try{const reg=await registration();reg.active?.postMessage({type:'push-diagnostic-replay'})}catch{}}
 window.addEventListener('online',replay);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')replay()});
 async function refresh(){
  supported=canPush();if(!supported){render();return}
  try{
   const user=getUser()?.id,reg=await registration(),subscription=await reg.pushManager.getSubscription();
   if(getUser()?.id!==user)return;
   enabled=!!subscription&&Notification.permission==='granted'&&!!user;
   if(!user)bound='';
   if(enabled&&bound!==user+subscription.endpoint){await api('/push/subscription',{method:'POST',data:subscription.toJSON()});if(getUser()?.id===user)bound=user+subscription.endpoint}
   if(diagnosticId)reg.active?.postMessage({type:'push-diagnostic-replay'});
   render();
  }catch{message='알림 연결을 확인하지 못했습니다. 다시 켜 주세요.';render()}
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-push-action]');if(!button)return;event.preventDefault();
  if(busy||!getUser())return;
  busy=true;message='';
  try{
   const user=getUser().id;
   if(button.dataset.pushAction==='toggle'&&!enabled&&Notification.permission!=='granted'){
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw Error('알림 권한이 허용되지 않았습니다. 기기 설정에서 알림을 허용해 주세요.');
   }
   render();const reg=await bounded(registration(),10000,'알림 처리기 연결');let subscription=await bounded(reg.pushManager.getSubscription(),5000,'알림 등록 조회');
   if(getUser()?.id!==user)throw Error('계정이 바뀌었습니다. 다시 로그인해 주세요.');
   if(button.dataset.pushAction==='test'){
    if(!subscription)throw Error('이 기기의 알림을 먼저 켜 주세요.');
    diagnosticMessage='기기의 알림 처리기 응답을 확인하고 있습니다.';diagnosticId='';reportMessage='';showDiagnostic.sequence=0;clearTimeout(diagnosticTimer);render();
    await diagnosticWorker(reg);
    diagnosticMessage='알림 처리기 응답 확인 완료. 서버에 테스트 전송을 요청하고 있습니다.';render();
    const result=await bounded(api('/push/test',{method:'POST',data:{endpoint:subscription.endpoint,diagnostics:true}}),15000,'서버 전송 응답');
    diagnosticId=result.diagnosticId;message='테스트 진단은 수신·권한·오류 코드만 기록하며 알림 내용은 수집하지 않습니다.';
    try{sessionStorage.setItem('push-diagnostic-current',JSON.stringify({id:diagnosticId,expires:Date.now()+15*60000}))}catch{}
    diagnosticMessage=`진단 ${diagnosticId.slice(0,8)} · 전송 서비스 접수 완료. 기기 수신 신호를 최대 20초 기다립니다.`;
    waitForPhase('기기 수신 확인',20000,'전송 서비스 접수 완료');
    if(results.has(diagnosticId))showDiagnostic(results.get(diagnosticId));
   }else if(enabled){
    if(subscription){await api('/push/subscription',{method:'DELETE',data:{endpoint:subscription.endpoint}});await subscription.unsubscribe()}
    enabled=false;bound='';message='이 기기의 알림을 껐습니다.';
   }else{
    config=await api('/push/config');if(!config.enabled)throw Error('알림 서비스를 준비하고 있습니다.');
    const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    subscription||=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
    await api('/push/subscription',{method:'POST',data:subscription.toJSON()});bound=user+subscription.endpoint;enabled=true;message='이 기기에서 새 알림을 받습니다.';
   }
  }catch(error){clearTimeout(diagnosticTimer);message=String(error.message).replace(/[<>&]/g,'');diagnosticMessage='';reportMessage='';}finally{busy=false;render()}
 });
 return {panel,refresh};
}
