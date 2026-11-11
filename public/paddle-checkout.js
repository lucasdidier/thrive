// Thrive's checkout page (app/checkout/route.ts). Two ways in:
// - from the app: /checkout#price=pri_…&owner=…&email=…&theme=dark. The fragment never reaches a server; it is
//   cleared from the address bar once read. After payment, the app confirms it (?paid=txn_… on its plan page).
// - Paddle's default payment link: /checkout?_ptxn=txn_…, which Paddle.js opens by itself.
export function readCheckout(hash){
 const q=new URLSearchParams(String(hash||'').replace(/^#/,''));
 const price=q.get('price')||'',owner=q.get('owner')||'',email=q.get('email')||'';
 if(!/^pri_[a-z0-9]{10,60}$/i.test(price)||!/^supabase:[\w-]{1,100}$/.test(owner))return null;
 return {price,owner,email:/^[^\s@]{1,64}@[^\s@]{1,190}$/.test(email)?email:'',theme:q.get('theme')==='dark'?'dark':'light'};
}
export function returnURL(app,transactionId){
 const base=app||location.origin;
 return base+'/'+(transactionId&&/^txn_[a-z0-9]{10,60}$/i.test(transactionId)?'?paid='+encodeURIComponent(transactionId):'')+'#account/plan';
}
if(globalThis.document?.body?.dataset.paddleToken!==undefined){
 const body=document.body,token=body.dataset.paddleToken,app=body.dataset.appUrl||'';
 const heading=document.querySelector('#checkout-heading'),detail=document.querySelector('#checkout-detail'),back=document.querySelector('#checkout-back');
 back.href=returnURL(app);
 const say=(title,text='')=>{heading.textContent=title;detail.textContent=text;detail.hidden=!text;};
 const order=readCheckout(location.hash);
 if(order)history.replaceState(null,'',location.pathname+location.search);
 if(!token||!window.Paddle)say('Checkout is unavailable right now.','Please try again in a few minutes.');
 else{
  if(token.startsWith('test_'))Paddle.Environment.set('sandbox');
  Paddle.Initialize({token,eventCallback:e=>{
   if(e.name==='checkout.completed'){say('Payment received. Opening Thrive…');setTimeout(()=>location.replace(returnURL(app,e.data?.transaction_id)),1200);}
   else if(e.name==='checkout.closed')say('Checkout closed.','Nothing was charged. Go back to Thrive to choose a plan again.');
  }});
  if(order){say('Opening checkout…');Paddle.Checkout.open({items:[{priceId:order.price,quantity:1}],customer:order.email?{email:order.email}:undefined,customData:{thrive_owner:order.owner},settings:{displayMode:'overlay',theme:order.theme}});}
  else if(!new URLSearchParams(location.search).has('_ptxn'))say('Nothing to pay here.');
 }
}
