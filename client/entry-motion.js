const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bounded=async(promise,ms)=>{
 let timer;
 try{await Promise.race([promise,new Promise(resolve=>timer=setTimeout(resolve,ms))])}
 catch{}finally{clearTimeout(timer)}
};

// Loading never reaches completion while data or the first visible assets are pending.
export function entryProgress(elapsed,ready,reduced=false) {
 const t=Math.min(1,Math.max(0,elapsed/1900));
 const progress=Math.min(.94,(t*t*(3-2*t))*.94);
 return {progress,stage:progress<.3?0:progress<.7?1:2,complete:ready&&(reduced||elapsed>=1900)};
}

async function prepareFirstFrame(app) {
 const portrait=app.querySelector('.portrait-plane > img'),mobile=app.querySelector('.terminal-mobile > img');
 const images=[...new Set([portrait,mobile,...app.querySelectorAll('.masthead img,.record-composer img,.server-post img')])]
  .filter(image=>image&&image.getBoundingClientRect().width>0&&image.getBoundingClientRect().top<innerHeight+80).slice(0,8);
 for(const image of images){image.loading='eager';image.fetchPriority='high'}
 await Promise.all([
  bounded(document.fonts?.ready||Promise.resolve(),1600),
  ...images.map(image=>bounded(image.decode(),2500))
 ]);
}

export async function enterSite({app,load,reveal,isReduced}) {
 const loader=document.getElementById('entry-loader');
 if(!loader){await load();reveal();return}
 const boot=document.getElementById('entry-boot'),percent=document.getElementById('entry-percent');
 const label=document.getElementById('entry-loading-phase'),code=document.getElementById('entry-progress');
 const bar=document.getElementById('entry-progress-bar'),core=document.getElementById('entry-core-status');
 const controller=new AbortController();
 const deadline=setTimeout(()=>controller.abort(new DOMException('Startup timed out','TimeoutError')),15000);
 const started=performance.now();
 let ready=false,frame=0,lastStage=-1;
 loader.dataset.phase='loading';
 loader.classList.toggle('boot-still',isReduced());
 const prepared=new Promise(resolve=>{
  const tick=now=>{
   const state=entryProgress(now-started,ready,isReduced());
   boot.style.setProperty('--boot-progress',String(state.progress));
   bar.style.width=(state.progress*100)+'%';
   percent.innerHTML=String(Math.round(state.progress*100)).padStart(2,'0')+'<small>%</small>';
   boot.dataset.stage=String(state.stage);
   if(state.stage!==lastStage){
    lastStage=state.stage;
    label.textContent=['화면을 준비하는 중','기록을 연결하는 중','일상을 불러오는 중'][state.stage];
    code.textContent=['DISPLAY SETUP','RECORD CONNECTION','PREPARING'][state.stage];
   }
   if(state.complete){resolve();return}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
 });
 try{
  await load(controller.signal);
  clearTimeout(deadline);
  await prepareFirstFrame(app);
  ready=true;
  await prepared;
  loader.dataset.phase='ready';
  loader.classList.add('entry-complete');
  boot.classList.add('boot-complete');boot.dataset.stage='3';
  boot.style.setProperty('--boot-progress','1');bar.style.width='100%';
  percent.innerHTML='100<small>%</small>';core.textContent='COMPLETE';
  code.textContent='READY';label.textContent='접속 준비 완료';
  if(!isReduced()){
   await wait(420);
   loader.dataset.phase='releasing';boot.classList.add('boot-release');
   await wait(180);
  }
  loader.hidden=true;loader.setAttribute('aria-busy','false');loader.dataset.phase='done';
  document.body.classList.remove('site-starting');
  app.inert=false;app.removeAttribute('aria-hidden');
  reveal();
 }catch{
  loader.classList.add('entry-stalled');loader.dataset.phase='error';
  label.textContent='화면을 불러오지 못했습니다';code.textContent='RETRY';
 }finally{clearTimeout(deadline);cancelAnimationFrame(frame)}
}
