import {uid} from './domain.js';
export const emailTemplates=[['blank','Blank email'],['update','Project update'],['document','Share a document'],['followup','Follow-up']];
export const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
export function validateEmailDraft(s,d){
 if(!d||typeof d.id!=='string'||!/^[\w-]{1,100}$/.test(d.id))throw Error('Invalid email draft.');
 if(!s.clients.some(c=>c.id===d.clientId))throw Error('Choose a client.');
 if(d.projectId&&!s.projects.some(p=>p.id===d.projectId&&p.clientId===d.clientId))throw Error('Choose a project belonging to this client.');
 if(!validEmail(d.to))throw Error('Enter one valid recipient email address.');
 if(typeof d.subject!=='string'||!d.subject.trim()||d.subject.length>200||/[\r\n\x00-\x1f\x7f]/.test(d.subject))throw Error('Enter a subject of 1–200 characters without line breaks.');
 if(typeof d.body!=='string'||!d.body.trim()||d.body.length>30000)throw Error('Enter a message of 1–30,000 characters.');
 if(d.threadId&&!/^[a-f0-9]{1,64}$/.test(d.threadId))throw Error('Invalid email thread.');
 return d;
}
export function saveEmailDraft(s,data,id){
 s.emailDrafts??=[];const old=id?s.emailDrafts.find(d=>d.id===id):null;if(id&&!old)throw Error('Email draft not found.');
 const d={id:id||uid(),clientId:String(data.clientId||''),projectId:String(data.projectId||''),to:String(data.to||'').trim(),subject:String(data.subject||'').trim(),body:String(data.body||'').trim(),threadId:String(data.threadId||''),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};validateEmailDraft(s,d);
 if(old)Object.assign(old,d);else s.emailDrafts.unshift(d);return old||d;
}
export function emailTemplate(s,type,clientId,projectId){const c=s.clients.find(c=>c.id===clientId),p=s.projects.find(p=>p.id===projectId&&p.clientId===clientId),hello=`Hi ${c?.contact||c?.name||'there'},`,sign=s.settings.name;return {clientId:c?.id||'',projectId:p?.id||'',to:c?.email||'',subject:type==='update'?`${p?.name||'Project'} — update`:type==='document'?'Document for your review':type==='followup'?`Following up${p?' — '+p.name:''}`:'',body:type==='update'?`${hello}\n\nHere’s the latest on ${p?.name||'your project'}:\n\nCompleted:\n\nNext steps:\n\nWhat I need from you:\n\n${sign}`:type==='document'?`${hello}\n\nPlease review the document at the link below.\n\n\nLet me know if you have any questions.\n\n${sign}`:type==='followup'?`${hello}\n\nFollowing up on our last conversation.\n\n\n${sign}`:''};}
