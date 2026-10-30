// Account-scoped session storage keeps private drafts in this browser tab.
export function createNoteDrafts(key, storage) {
 let data={drafts:{},selected:{}};
 try {const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.drafts&&saved?.selected)data=saved;} catch {}
 let durable=true;
 const id=(client,note='')=>JSON.stringify([client,note]);
 function persist(){try{if(!storage)throw Error();storage.setItem(key,JSON.stringify(data));durable=true;}catch{durable=false;}}
 return {
  read:(client,note='',fallback='')=>data.drafts[id(client,note)]?.body??fallback,
  selected:client=>data.selected[client]||'',
  select(client,note=''){data.selected[client]=note;persist();},
  write(client,note,body,original=''){
   if(body===original)delete data.drafts[id(client,note)];
   else data.drafts[id(client,note)]={...data.drafts[id(client,note)],body};
   data.selected[client]=note;persist();
  },
  has:(client,note='')=>Object.hasOwn(data.drafts,id(client,note)),
  pendingId:(client,note='')=>data.drafts[id(client,note)]?.pendingId,
  attachId(client,note,recordId){const entry=data.drafts[id(client,note)];if(entry){entry.pendingId=recordId;persist();}},
  clear(client,note=''){delete data.drafts[id(client,note)];persist();},
  // Only needed when session storage is unavailable; ordinary navigation retains memory.
  atRisk:()=>!durable&&Object.keys(data.drafts).length>0,
 };
}
