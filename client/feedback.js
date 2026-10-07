const reduced=()=>document.documentElement.dataset.reducedMotion==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
let routeAnimation;
export function cancelRouteMotion(){routeAnimation?.cancel();routeAnimation=null}
export function revealRoute(element){cancelRouteMotion();if(!element||reduced())return;routeAnimation=element.animate([{opacity:.25,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});routeAnimation.finished.catch(()=>{});}
export function formFeedback(form,label){
  form.dataset.submitting='true';form.setAttribute('aria-busy','true');document.dispatchEvent(new Event('us:form-state'));
  const controls=[...form.querySelectorAll('input,textarea,select,button')].map(el=>[el,el.disabled]);
  controls.forEach(([el])=>el.disabled=true);
  const panel=document.createElement('div');panel.className='save-feedback';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
  panel.innerHTML='<span class="save-symbol" aria-hidden="true"></span><div><b></b><small></small></div><div class="save-track" aria-hidden="true"><i></i></div>';
  const footer=form.querySelector('footer');if(footer)footer.before(panel);else form.append(panel);
  const text=panel.querySelector('b'),detail=panel.querySelector('small');
  let slow;
  const stage=(message,hint='처리가 끝나면 자동으로 반영됩니다.')=>{text.textContent=message;detail.textContent=hint;clearTimeout(slow);slow=setTimeout(()=>{detail.textContent='연결 상태에 따라 시간이 걸릴 수 있습니다. 처리 중입니다.'},8000)};
  stage(label);
  return{stage,async complete(){clearTimeout(slow);panel.classList.add('is-complete');text.textContent='저장 완료';detail.textContent='기록을 반영합니다.';panel.querySelector('.save-symbol').textContent='✓';form.setAttribute('aria-busy','false');await new Promise(resolve=>setTimeout(resolve,reduced()?0:200))},fail(){clearTimeout(slow);panel.remove()},release(){clearTimeout(slow);delete form.dataset.submitting;form.removeAttribute('aria-busy');controls.forEach(([el,disabled])=>el.disabled=disabled);if(panel.isConnected)panel.remove();document.dispatchEvent(new Event('us:form-state'))}};
}
