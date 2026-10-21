import {uid,money as formatMoney,invoiceStatus,addActivity} from './domain.js';
import {deliveryStatus} from './workspace-domain.js';
export function initChat(s){s.chat??={threads:[],activeId:null};return s.chat;}
export function newConversation(s){initChat(s).activeId=null;}
export function deleteConversation(s,id){const chat=initChat(s);chat.threads=chat.threads.filter(t=>t.id!==id);if(chat.activeId===id)chat.activeId=null;}
const record=(action,id,label,detail)=>({action,id,label,detail});
export function answerWorkspace(s,prompt){const money=cents=>formatMoney(cents,s.settings.currency||'USD');
 const q=prompt.trim().toLowerCase(),response={text:'',records:[]};
 const deposit=q.match(/^(?:please )?(?:set|change) (?:my |the )?default deposit to (\d{1,3})\s*%[.!]?$/);
 if(deposit){const value=Number(deposit[1]);if(value<1||value>100)return {...response,text:'Choose a default deposit between 1% and 100%.'};if(value===s.settings.deposit)return {...response,text:`Your default deposit is already ${value}%.`};return {...response,text:'Review this change to your project defaults. Existing projects and agreed terms will stay as they are.',proposal:{kind:'deposit',before:s.settings.deposit,after:value,status:'pending'}};}
 if(/meeting|booking|schedule/.test(q)){const meetings=(s.scheduling?.meetings||[]).filter(m=>m.status==='scheduled').sort((a,b)=>a.start.localeCompare(b.start));return {...response,text:meetings.length?`${meetings.length} scheduled meeting${meetings.length===1?'':'s'} in your workspace.`:'No meetings are scheduled. Open Scheduling to configure availability and try a booking.',records:meetings.length?meetings.map(m=>record('meeting',m.id,m.typeName,`${s.clients.find(c=>c.id===m.clientId)?.name} · ${new Intl.DateTimeFormat('en-US',{timeZone:m.timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(m.start))} · ${m.timeZone}`)):[{action:'navigate',page:'scheduling',label:'Open scheduling',detail:'Meeting types and availability'}]};}
 if(/payment instructions|bank details|how.*pay/.test(q))return {...response,text:s.settings.paymentInstructions?'Your default payment instructions are shown below. New invoices copy these instructions; existing invoices keep their own copy.':'You have not added default payment instructions yet. Add the bank details or other instructions you want clients to see. Clients pay outside Thrive, and you record payments after receiving them.',quote:s.settings.paymentInstructions||'',records:[record('payment-settings',null,'Edit payment instructions','Workspace defaults')]};
 if(/overdue|unpaid|outstanding|owe|owed/.test(q)){
 const overdue=/overdue/.test(q),list=s.invoices.filter(i=>overdue?invoiceStatus(i)==='overdue':i.paid<i.amount),amount=list.reduce((a,i)=>a+i.amount-i.paid,0);
 return {...response,text:list.length?`${list.length} ${overdue?'overdue':'unpaid'} invoice${list.length===1?'':'s'}, with ${money(amount)} remaining. Open an invoice to check the payment instructions or record money you have received.`:`There are no ${overdue?'overdue':'unpaid'} invoices.`,records:list.map(i=>record('invoice',i.id,i.number,`${i.clientName} · ${money(i.amount-i.paid)} due`))};
 }
 const clients=s.clients.filter(c=>q.includes(c.name.toLowerCase())||q.includes(c.contact.toLowerCase()));
 if(clients.length){const c=clients[0],projects=s.projects.filter(p=>p.clientId===c.id&&!p.archived),bills=s.invoices.filter(i=>i.clientId===c.id||s.projects.some(p=>p.id===i.projectId&&p.clientId===c.id));return {...response,text:`${c.name}${c.archived?' (archived)':''} · ${c.contact}\n${projects.length} current project${projects.length===1?'':'s'} · ${money(bills.reduce((a,i)=>a+i.amount-i.paid,0))} outstanding.`,records:[record('client',c.id,c.name,c.email),...projects.map(p=>record('project',p.id,p.name,deliveryStatus(p)))]};}
 if(/project|work.*progress/.test(q)){
 const active=/active/.test(q),list=s.projects.filter(p=>!p.archived&&(active?deliveryStatus(p)==='active':!['completed','cancelled'].includes(deliveryStatus(p))));return {...response,text:list.length?`${list.length} ${active?'active':'current'} project${list.length===1?'':'s'}. Status and phase progress are shown below.`:'No projects match that view.',records:list.map(p=>record('project',p.id,p.name,`${deliveryStatus(p)} · ${p.phases.filter(f=>f.done).length}/${p.phases.length} phases complete`))};
 }
 if(/client|contact/.test(q))return {...response,text:'Here are your active clients. Ask about a client by their full name to see their projects and outstanding balance.',records:s.clients.filter(c=>!c.archived).map(c=>record('client',c.id,c.name,c.contact))};
 if(/workflow|setup|defaults|deposit/.test(q))return {...response,text:`Your default deposit is ${s.settings.deposit}%. Your project phases are ${s.settings.phases.join(', ')}.\nTo preview a change, try “Set the default deposit to 40%”. For phases and other defaults, open workspace setup.`,records:[record('setup',null,'Open workspace setup','Review project defaults')]};
 if(/help|what can|hello|^hi[!.]?$/.test(q))return {...response,text:'This prototype can look up clients, summarize current projects, list unpaid invoices, and propose a default deposit change. Try one of the suggested prompts. Live AI is not connected yet.'};
 return {...response,text:'That request is outside this chat preview. I can look up clients, summarize projects, list unpaid invoices, and propose a default deposit change. Live AI will support broader conversations when connected.'};
}
export function sendChat(s,prompt){
 prompt=String(prompt||'').trim();if(!prompt||prompt.length>2000)throw Error('Enter a message of 1–2,000 characters.');
 const chat=initChat(s);let thread=chat.threads.find(t=>t.id===chat.activeId);if(!thread){thread={id:uid(),title:prompt.slice(0,60),createdAt:new Date().toISOString(),messages:[]};chat.threads.unshift(thread);chat.activeId=thread.id;}
 const reply=answerWorkspace(s,prompt);thread.messages.push({id:uid(),role:'user',text:prompt},{id:uid(),role:'assistant',...reply});thread.updatedAt=new Date().toISOString();return thread;
}
export function decideChatProposal(s,threadId,messageId,apply){
 const msg=initChat(s).threads.find(t=>t.id===threadId)?.messages.find(m=>m.id===messageId),p=msg?.proposal;if(!p||p.status!=='pending')return false;
 if(!apply){p.status='cancelled';return true;}
 if(p.kind!=='deposit'||!Number.isInteger(p.after)||p.after<1||p.after>100)throw Error('This proposed change is invalid.');
 if(s.settings.deposit!==p.before){p.status='outdated';return false;}
 s.settings.deposit=p.after;p.status='applied';addActivity(s,'Default deposit updated',`${p.before}% → ${p.after}% · Future projects only`);return true;
}
