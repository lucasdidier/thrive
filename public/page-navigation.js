// Focus navigation content without scrolling the top bar out of the viewport.
// Call on navigation/initial load, never on background data refreshes.
export function resetPagePosition({focus=true}={}){
 const main=document.querySelector('#main');
 if(focus)main?.focus({preventScroll:true});
 main?.scrollTo({top:0,left:0,behavior:'instant'});
 window.scrollTo({top:0,left:0,behavior:'instant'});
}
