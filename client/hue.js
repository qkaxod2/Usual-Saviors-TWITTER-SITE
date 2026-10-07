// Stable accent hue per character name, picked from a palette that reads well on the dark theme.
const HUES=[172,190,205,222,258,284,318,342,24,42];
export const hueOf=name=>HUES[[...String(name||'')].reduce((h,ch)=>(h*31+ch.codePointAt(0))>>>0,7)%HUES.length];

// Keeps every [data-world-clock] element on the current local time.
export function installWorldClock(){
 const tick=()=>{const now=new Date().toLocaleTimeString('en-GB',{hour12:false});document.querySelectorAll('[data-world-clock]').forEach(el=>{if(el.textContent!==now)el.textContent=now})};
 tick();setInterval(tick,1000);
}
