// CSS transitions retarget smoothly. Native close still restores focus immediately.
export function initDrawerMotion(dialog){
 let pointer=false;
 document.addEventListener('pointerdown',()=>{pointer=true;},true);
 document.addEventListener('keydown',()=>{pointer=false;dialog.removeAttribute('data-pointer-motion');},true);
 const show=dialog.showModal.bind(dialog),close=dialog.close.bind(dialog);
 dialog.showModal=(...args)=>{
  dialog.toggleAttribute('data-pointer-motion',pointer&&dialog.classList.contains('drawer')&&/^(New |Create |Compose |Log time)/.test(dialog.querySelector('#dialog-title')?.textContent||''));
  return show(...args);
 };
 dialog.close=(...args)=>{
  if(!pointer)dialog.removeAttribute('data-pointer-motion');
  return close(...args);
 };
}
