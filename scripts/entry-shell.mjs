import {readFileSync} from 'node:fs';
import {bootMarkup} from '../client/boot-markup.js';

const read=name=>readFileSync(new URL('../client/'+name,import.meta.url),'utf8');
export function entryShell() {
 const terminal=read('terminal-ui.css'),theme=read('afterhours-ui.css');
 const base=terminal.slice(terminal.indexOf('.personnel-window.personnel-booting'));
 const themeStart=theme.indexOf('.personnel-booting .personnel-loading');
 const colors=theme.slice(themeStart,theme.indexOf('dialog .modal-header',themeStart));
 const details=read('personnel-effects.css').replaceAll('#personnel-window','#entry-loader');
 const critical=base+colors+details+read('entry-boot.css');
 const recovery='<p class="entry-recovery">연결이 지연되고 있습니다. <a href="/">다시 불러오기</a></p>';
 const markup='<div id="entry-loader" class="personnel-booting" aria-busy="true">'+bootMarkup({entry:true}).replace('</section>',recovery+'</section>')+'</div>';
 return {
  name:'entry-loading-shell',
  transformIndexHtml(html) {
   return html.replace('<!--entry-critical-->',`<style>${critical}</style><script>try{document.documentElement.dataset.reducedMotion=localStorage.getItem('us:reduced-motion')||'false'}catch{}setTimeout(function(){var el=document.getElementById('entry-loader');if(el&&!el.hidden){el.classList.add('entry-stalled');var label=document.getElementById('entry-loading-phase');if(label)label.textContent='연결을 기다리고 있습니다'}},20000)</script>`)
    .replace('<!--entry-loader-->',markup);
  }
 };
}
