// Hover and keyboard-focus tooltips for icon-only controls, and for every sidebar item while the
// sidebar is collapsed to its rail (like Harvest). One shared element; native titles are moved
// aside so the browser doesn't show a second tooltip.
const SHOW_DELAY=350,WARM_MS=400;

// Text to show for el, or '' for none. Pure, so it can be tested without a browser.
export function tooltipText(el,{collapsed=false}={}){
 if(!el)return '';
 const label=(el.dataset?.tip||el.getAttribute('title')||el.dataset?.tipTitle||el.getAttribute('aria-label')||'').trim();
 if(!label)return '';
 if(el.dataset?.tip)return label;
 if(collapsed&&el.closest?.('.app-nav'))return label;
 return el.textContent.trim()?'':label;
}
export const tooltipPlacement=el=>el.closest?.('.app-nav')?'right':'bottom';

export function installTooltips(doc=document){
 const tip=doc.createElement('div');tip.className='tooltip';tip.setAttribute('role','tooltip');tip.id='app-tooltip';tip.hidden=true;doc.body.append(tip);
 let target=null,timer=0,hiddenAt=0;
 const collapsed=()=>doc.documentElement.dataset.sidebarCollapsed==='true';
 const candidate=node=>node?.closest?.('button,a,[role=button],[data-tip],summary');
 function place(el){
  const r=el.getBoundingClientRect(),t=tip.getBoundingClientRect(),vw=innerWidth,vh=innerHeight,gap=8;
  let side=tooltipPlacement(el),x,y;
  if(side==='right'){x=r.right+gap;y=r.top+r.height/2-t.height/2;if(x+t.width>vw-8)side='bottom';}
  if(side==='bottom'){x=r.left+r.width/2-t.width/2;y=r.bottom+gap;if(y+t.height>vh-8){y=r.top-gap-t.height;side='top';}}
  tip.dataset.side=side;
  tip.style.left=Math.round(Math.max(8,Math.min(x,vw-t.width-8)))+'px';tip.style.top=Math.round(Math.max(8,Math.min(y,vh-t.height-8)))+'px';
 }
 function show(el){
  const text=tooltipText(el,{collapsed:collapsed()});if(!text)return;
  target=el;tip.textContent=text;tip.hidden=false;tip.classList.remove('is-on');place(el);
  el.setAttribute('aria-describedby',tip.id);requestAnimationFrame(()=>tip.classList.add('is-on'));
 }
 function hide(){
  clearTimeout(timer);if(!target)return;
  target.removeAttribute('aria-describedby');target=null;tip.hidden=true;tip.classList.remove('is-on');hiddenAt=Date.now();
 }
 function arm(el){
  if(el===target)return;hide();
  if(el.hasAttribute('title')){el.dataset.tipTitle=el.getAttribute('title');if(!el.getAttribute('aria-label')&&!el.textContent.trim())el.setAttribute('aria-label',el.dataset.tipTitle);el.removeAttribute('title');}
  if(!tooltipText(el,{collapsed:collapsed()}))return;
  const warm=Date.now()-hiddenAt<WARM_MS;timer=setTimeout(()=>show(el),warm?0:SHOW_DELAY);
 }
 doc.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=candidate(e.target);if(el)arm(el);else hide();});
 doc.addEventListener('pointerout',e=>{const el=candidate(e.target);if(el&&!el.contains(e.relatedTarget))hide();});
 doc.addEventListener('focusin',e=>{const el=candidate(e.target);if(el&&el.matches(':focus-visible'))arm(el);});
 doc.addEventListener('focusout',hide);
 doc.addEventListener('pointerdown',hide,true);
 doc.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 addEventListener('scroll',hide,true);addEventListener('resize',hide);
 return {hide};
}
