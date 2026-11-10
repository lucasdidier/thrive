// Paddle's default payment link (/checkout?_ptxn=txn_…): Paddle.js opens that transaction's checkout by itself.
(()=>{
 const token=document.body.dataset.paddleToken,heading=document.querySelector('#checkout-heading');
 if(!token||!window.Paddle){heading.textContent='Checkout is unavailable right now.';return;}
 if(token.startsWith('test_'))Paddle.Environment.set('sandbox');
 Paddle.Initialize({token,eventCallback:e=>{
  if(e.name==='checkout.completed'){heading.textContent='Payment received. Opening Thrive…';setTimeout(()=>location.replace('/'),1500);}
  else if(e.name==='checkout.closed')heading.textContent='Checkout closed.';
 }});
 if(!new URLSearchParams(location.search).has('_ptxn'))heading.textContent='Nothing to pay here.';
})();
