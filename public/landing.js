const $=s=>document.querySelector(s);
$('#year').textContent=new Date().getFullYear();
if(new URLSearchParams(location.search).get('access')==='pending'){$('#pending').hidden=false;history.replaceState(null,'','/');}
if(location.hash==='#request')$('#request input[name=name]')?.focus({preventScroll:true});
const form=$('#request-form');
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const error=form.querySelector('.error'),button=form.querySelector('button');
 const data=Object.fromEntries(new FormData(form));
 error.textContent='';
 if(!data.name.trim())return error.textContent='Enter your name.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))return error.textContent='Enter a valid email address.';
 button.disabled=true;
 try{
  const r=await fetch('/api/beta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(body.error||'Please try again.');
  form.hidden=true;$('.done').hidden=false;
 }catch(e){error.textContent=e.message;}
 finally{button.disabled=false;}
});
