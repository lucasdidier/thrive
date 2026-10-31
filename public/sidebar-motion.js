// Commit layout once, then bridge the old and new positions using transforms.
// Read the currently painted positions before cancelling, so a second toggle
// reverses smoothly instead of jumping back to an animation's starting point.
export function createSidebarMotion(root){
 const active=new Set();
 const cancel=()=>{for(const animation of active)animation.cancel();active.clear();};
 const frameWidth=sidebar=>{
  const style=getComputedStyle(sidebar,'::before');
  const scale=style.transform.match(/^matrix\(([^,]+)/)?.[1]||1;
  return parseFloat(style.width)*Number(scale);
 };
 function run(change){
  const sidebar=document.getElementById?.('sidebar');
  const motion=sidebar?.animate&&root.dataset.inputModality==='pointer'&&matchMedia('(min-width:651px) and (prefers-reduced-motion:no-preference)').matches;
  if(!motion){cancel();change();return;}
  const elements=[...document.querySelectorAll('.workspace,body.record-expanded > .record-panel,#sidebar .thrive-wordmark,#sidebar .sidebar-toggle,#sidebar .sidebar-search,#sidebar .nav-group,#sidebar .sidebar-customize,#sidebar .sidebar-ai,#sidebar .getting-started-trigger,#sidebar .sidebar-theme button,#sidebar .sidebar-account')];
  const before=elements.map(el=>el.getBoundingClientRect());
  const width=frameWidth(sidebar);
  cancel();change();
  const style=getComputedStyle(root),duration=parseFloat(style.getPropertyValue('--duration-sidebar'))||260;
  const easing=style.getPropertyValue('--ease-drawer').trim();
  const play=(el,frames,extra={})=>{
   const animation=el.animate(frames,{duration,easing,...extra});active.add(animation);
   animation.finished.then(()=>active.delete(animation),()=>active.delete(animation));
  };
  // Read every final position before starting any animations.
  const after=elements.map(el=>el.getBoundingClientRect()),nextWidth=frameWidth(sidebar);
  elements.forEach((el,i)=>{
   const dx=before[i].left-after[i].left,dy=before[i].top-after[i].top;
   if(Math.abs(dx)>.5||Math.abs(dy)>.5)play(el,[{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}]);
  });
  if(width>0&&nextWidth>0&&Math.abs(width-nextWidth)>.5){
   play(sidebar,[{transform:`scaleX(${width/nextWidth})`},{transform:'scaleX(1)'}],{pseudoElement:'::before'});
  }
 }
 return {run,cancel};
}
