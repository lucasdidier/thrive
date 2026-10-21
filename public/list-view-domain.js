import {matchesFieldFilter} from './custom-fields-domain.js';

export const viewDefaults = columns => ({filters:{},sort:'',direction:'asc',groupBy:'',groupGranularity:'month',groupDirection:'asc',columns:columns.map(c=>c.key),density:'compact'});
export function queryList(rows, config, search='') {
 const q=search.trim().toLocaleLowerCase();
 const result=rows.filter(row=>Object.entries(config.filters||{}).every(([key,value])=>{
  if(value===''||value==null)return true;
  if(typeof value==='object'&&value.op==='between')return (!value.from||String(row[key]||'').slice(0,10)>=value.from)&&(!value.to||String(row[key]||'').slice(0,10)<=value.to)&&!!row[key];
  return typeof value==='object'?matchesFieldFilter(row[key],value):key==='status'&&value==='unpaid'?['overdue','outstanding'].includes(row.status):String(row[key]??'')===String(value);
 })&&(!q||Object.entries(row).some(([key,value])=>!['raw','id'].includes(key)&&['string','number'].includes(typeof value)&&String(value).toLocaleLowerCase().includes(q))));
 if(!config.sort)return result;
 return result.sort((a,b)=>{const av=a[config.sort],bv=b[config.sort],empty=v=>v==null||v==='';if(empty(av)||empty(bv))return empty(av)?empty(bv)?0:1:-1;return (typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'}))*(config.direction==='desc'?-1:1);});
}
export function groupRecords(rows, config, fields) {
 const field=fields.find(f=>f.key===config.groupBy);
 if(!field)return [{key:'all',label:'',rows}];
 const groups=new Map();
 for(const row of rows){
  let value=row[field.key],label;
  const empty=value==null||value===''||Array.isArray(value)&&!value.length;
  if(empty){value=null;label=`No ${field.label.toLowerCase()}`;}
  else if(field.type==='date'){
   const day=String(value).slice(0,10),d=new Date(day+'T12:00:00Z');
   if(Number.isNaN(d.getTime())){value=null;label=`No ${field.label.toLowerCase()}`;}
   else if(config.groupGranularity==='day'){value=day;label=day;}
   else if(config.groupGranularity==='week'){d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));value=d.toISOString().slice(0,10);label='Week of '+value;}
   else{value=day.slice(0,7);label=d.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',year:'numeric'});}
  }else {value=Array.isArray(value)?[...value].sort().join(', '):String(value);label=value;}
  // Relationships with the same display name still represent distinct records.
  const key=JSON.stringify([field.key,value===null?null:field.relationKey?row[field.relationKey]??value:value]);
  if(!groups.has(key))groups.set(key,{key,label,empty:value===null,sortValue:value,rows:[]});
  groups.get(key).rows.push(row);
 }
 return [...groups.values()].sort((a,b)=>a.empty?b.empty?0:1:b.empty?-1:String(a.sortValue).localeCompare(String(b.sortValue),undefined,{numeric:true,sensitivity:'base'})*(config.groupDirection==='desc'?-1:1));
}
