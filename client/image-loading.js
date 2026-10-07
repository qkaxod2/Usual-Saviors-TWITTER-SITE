// Observe the actual image request; never delay the page or restart its entrance effects.
export function watchImage(image,{pending,ready,failed},delay=180) {
 let disposed=false,decoding=false,timer;
 const finish=callback=>{if(disposed)return;clearTimeout(timer);callback()};
 const onError=()=>finish(failed);
 const onLoad=async()=>{
  if(disposed||decoding)return;
  decoding=true;
  try{await image.decode();finish(ready)}catch{finish(failed)}
  finally{decoding=false}
 };
 image.addEventListener('load',onLoad);image.addEventListener('error',onError);
 if(image.complete){finish(image.naturalWidth?ready:failed)}
 else timer=setTimeout(()=>{if(!disposed)pending()},delay);
 return ()=>{disposed=true;clearTimeout(timer);image.removeEventListener('load',onLoad);image.removeEventListener('error',onError)};
}

export function installImageLoading(root=document) {
 const selector='img.avatar[src^="/api/images/"]',records=new Map(),finished=new WeakMap(),anchors=new Map();
 function track(image) {
  const source=image.getAttribute('src');
  if(records.get(image)?.source===source)return;
  records.get(image)?.dispose();
  if(finished.get(image)===source&&image.complete&&image.naturalWidth)return;
  finished.delete(image);
  const anchor=image.parentElement;if(!anchor)return;
  let surface=null,resize=null,intersection=null,stop=null,disposed=false,visible=true;
  const record={source,dispose};records.set(image,record);
  function removeSurface(){
   if(!surface)return;
   surface.remove();surface=null;resize?.disconnect();intersection?.disconnect();
   image.removeAttribute('data-image-loading');
   const count=anchors.get(anchor);
   if(count===1){anchor.classList.remove('image-loading-anchor');anchors.delete(anchor)}
   else if(count)anchors.set(anchor,count-1);
  }
  function dispose(){disposed=true;stop?.();removeSurface();records.delete(image)}
  function position(){
   if(!surface||!image.isConnected)return;
   const width=image.offsetWidth,height=image.offsetHeight;
   Object.assign(surface.style,{left:image.offsetLeft+'px',top:image.offsetTop+'px',width:width+'px',height:height+'px',borderRadius:getComputedStyle(image).borderRadius});
   surface.dataset.large=String(width>=120&&height>=100);
   surface.dataset.visible=String(visible&&width>0&&height>0);
  }
  function show(state){
   if(disposed||!image.isConnected)return;
   if(!surface){
    if(anchors.has(anchor)||getComputedStyle(anchor).position==='static'){
     anchors.set(anchor,(anchors.get(anchor)||0)+1);anchor.classList.add('image-loading-anchor');
    }
    surface=document.createElement('span');surface.className='image-loading-surface';surface.setAttribute('role','img');
    const label=document.createElement('span');label.className='image-loading-label';surface.append(label);
    image.after(surface);
    resize=new ResizeObserver(position);resize.observe(image);resize.observe(anchor);
    intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;position()});intersection.observe(image);
   }
   image.dataset.imageLoading=state;surface.dataset.state=state;
   const message=state==='error'?'이미지를 불러오지 못했습니다':'이미지 불러오는 중';
   surface.setAttribute('aria-label',(image.alt?image.alt+' · ':'')+message);
   surface.querySelector('.image-loading-label').textContent=message;
   position();
  }
  stop=watchImage(image,{pending:()=>show('pending'),failed:()=>show('error'),ready:()=>{if(disposed)return;finished.set(image,source);dispose()}});
  // Cached images can finish synchronously before the disposer is assigned.
  if(disposed)stop();
 }
 function scan(node){if(node.nodeType!==1)return;if(node.matches(selector))track(node);node.querySelectorAll(selector).forEach(track)}
 const observer=new MutationObserver(changes=>{
  for(const [image,record] of records)if(!image.isConnected)record.dispose();
  for(const change of changes){
   if(change.type==='attributes'){
    if(change.target.matches(selector))track(change.target);else records.get(change.target)?.dispose();
   }else change.addedNodes.forEach(scan);
  }
 });
 observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 root.querySelectorAll(selector).forEach(track);
 return ()=>{observer.disconnect();for(const record of [...records.values()])record.dispose()};
}
