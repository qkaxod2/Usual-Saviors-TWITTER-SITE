import {bootMarkup} from './boot-markup.js';
import {I} from './icons.js';
let personnelPhase='closed',personnelOrigin=null,personnelWho=0,personnelGeneration=0,personnelFrame=0;
const personnelWindow=document.getElementById('personnel-window');
const still=()=>document.documentElement.dataset.reducedMotion==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
let originButton=null;
const closeDrawer=()=>{};
let onReady=()=>{};
function personnelForm(){personnelPhase='ready';personnelWindow.classList.remove('personnel-booting','boot-still','boot-opening');personnelWindow.removeAttribute('aria-busy');onReady();if(!still())personnelWindow.querySelector('.personnel-home,.character-form')?.animate([{opacity:.65,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});personnelWindow.querySelector('input:not([type=hidden]),[data-personnel=close]')?.focus({preventScroll:true});document.dispatchEvent(new Event('us:form-state'))}
function personnelTransform(origin){const target=personnelWindow.getBoundingClientRect();return `translate(${origin.left+origin.width/2-target.left-target.width/2}px,${origin.top+origin.height/2-target.top-target.height/2}px) scale(${Math.max(.04,origin.width/target.width)},${Math.max(.04,origin.height/target.height)})`}
function personnelHeader(){return `<header class="personnel-header"><div><span>PERSONNEL / CENTRAL RECORD</span><h1 id="personnel-title">인사기록</h1></div><button type="button" data-personnel="close" aria-label="인사기록 닫기">${I('close')}</button></header>`}

async function openPersonnel(button){if(personnelPhase!=='closed')return;closeDrawer(true);personnelWho=0;originButton=button;personnelOrigin=button?.getBoundingClientRect()||{left:innerWidth/2,top:innerHeight/2,width:1,height:1};const generation=++personnelGeneration;personnelPhase='opening';personnelWindow.classList.add('personnel-booting','boot-opening');personnelWindow.classList.toggle('boot-still',still());personnelWindow.innerHTML=personnelHeader()+bootMarkup();personnelWindow.setAttribute('aria-busy','true');personnelWindow.showModal();document.dispatchEvent(new Event('us:form-state'));if(still()){personnelForm();return}if(!still()){try{await personnelWindow.animate([{transform:personnelTransform(personnelOrigin),opacity:.15},{transform:'none',opacity:1}],{duration:600,easing:'cubic-bezier(.4,0,.2,1)'}).finished}catch{}}
if(generation!==personnelGeneration||personnelPhase!=='opening')return;
personnelPhase='loading';personnelWindow.classList.remove('boot-opening');
const start=performance.now();let lastStep=-1,completeAt=null;
const steps=[
 {at:0,value:0,stage:0,label:'화면 초기화',code:'STANDBY'},
 {at:180,value:18,stage:0,label:'화면 초기화',code:'DISPLAY SETUP'},
 {at:440,value:47,stage:1,label:'입력 항목 구성',code:'FIELD SETUP'},
 {at:730,value:76,stage:2,label:'인사기록 화면 구성',code:'RECORD LAYOUT'},
 {at:990,value:94,stage:2,label:'작성 화면 준비',code:'FINALIZING'},
 {at:1300,value:100,stage:3,label:'기록창 준비 완료',code:'READY'}
];
const frame=now=>{if(generation!==personnelGeneration||personnelPhase!=='loading')return;const elapsed=now-start;const fill=Math.min(1,Math.max(0,elapsed/1300));const progress=fill*fill*(3-2*fill);document.getElementById('personnel-progress-bar').style.width=(progress*100)+'%';document.getElementById('personnel-boot').style.setProperty('--boot-progress',String(progress));const index=steps.findLastIndex(step=>elapsed>=step.at);
if(index!==lastStep){lastStep=index;const step=steps[index];document.getElementById('personnel-progress').textContent=step.code;document.getElementById('boot-percent').innerHTML=String(step.value).padStart(2,'0')+'<small>%</small>';document.getElementById('personnel-boot').dataset.stage=String(step.stage);document.getElementById('personnel-loading-phase').textContent=step.label}
if(elapsed>=1300){if(completeAt===null){completeAt=now;document.getElementById('personnel-boot').classList.add('boot-complete');document.getElementById('boot-core-status').textContent='COMPLETE'}if(now-completeAt>=420)document.getElementById('personnel-boot').classList.add('boot-release');if(now-completeAt>=600){personnelForm();return}}personnelFrame=requestAnimationFrame(frame)};personnelFrame=requestAnimationFrame(frame)}
async function closePersonnel(){if(personnelPhase==='closed'||personnelPhase==='closing'||personnelWindow.querySelector('[data-submitting]'))return;personnelPhase='closing';++personnelGeneration;cancelAnimationFrame(personnelFrame);const button=originButton?.isConnected?originButton:document.querySelector('[data-terminal="personnel"]');if(!still()&&button){try{await personnelWindow.animate([{transform:'none',opacity:1},{transform:personnelTransform(button.getBoundingClientRect()),opacity:0}],{duration:170,easing:'ease-in',fill:'forwards'}).finished}catch{}}personnelWindow.close();personnelWindow.classList.remove('personnel-booting','boot-still','boot-opening');personnelWindow.getAnimations().forEach(a=>a.cancel());personnelWindow.removeAttribute('aria-busy');personnelPhase='closed';document.dispatchEvent(new Event('us:form-state'));button?.focus({preventScroll:true})}

export function showPersonnel(button,ready){if(personnelPhase!=='closed')return;onReady=ready;return openPersonnel(button)}
export {personnelHeader,closePersonnel};
personnelWindow.addEventListener('cancel',e=>{e.preventDefault();closePersonnel()});
document.addEventListener('click',e=>{if(e.target.closest('[data-personnel=close]'))closePersonnel()});
