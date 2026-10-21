import {boardDefaults,boardActions,boardFields,boardGroups,boardMoveHint,moveBoardCard} from './kanban-domain.js';

export function createKanbanUI({getState,save,blocked,open,dialog,render,toast,esc,icon,bulk,context,groupHeader,isCollapsed}){
 let drag=null,move=null;
 const current=()=>context();
 const enabled=()=>!!current()?.board&&!!boardDefaults[current().scope];
 const groups=()=>boardGroups(getState(),current().scope,current().config,current().fields||current().columns,current().list,current().rows);
 const availableFields=()=>boardFields(current().fields||current().columns);
 function normalize(){if(!enabled())return;const c=current().config;if(c.layout==='board'&&!availableFields().some(f=>f.key===c.groupBy))c.groupBy=boardDefaults[current().scope];}
 function layoutControl(){if(!enabled())return '';return `<div class="layout-switch" aria-label="View layout">${[['table','Table'],['board','Board']].map(([layout,label])=>`<button data-action="board-layout" data-layout="${layout}" aria-label="${label} view" aria-pressed="${(current().config.layout||'table')===layout}">${icon(layout)}</button>`).join('')}</div>`;}
 function board({cell,actions}){
  const c=current(),field=availableFields().find(f=>f.key===c.config.groupBy),cols=c.columns.filter(f=>c.config.columns.includes(f.key)&&f.key!=='name'&&f.key!==c.config.groupBy),hint=boardMoveHint(c.scope,field);
  return `<div class="board-help"><span>${esc(hint)}</span>${c.config.sort?'<span>Sorted view · clear Sort for manual order</span>':''}</div><div class="crm-board kanban-board" aria-label="${esc(c.title)} board">${groups().map(g=>`<section class="board-column" data-board-column="${esc(g.key)}" aria-label="${esc(g.label)} column"><header>${groupHeader(g)}</header><div class="board-stack" role="list" aria-label="${esc(g.label)} cards">${isCollapsed(g)?'':g.rows.map(r=>`<article class="bulk-card-wrap kanban-card" role="listitem" draggable="true" data-board-id="${esc(r.id)}" data-board-group="${esc(g.key)}" data-bulk-row="${esc(r.id)}">${bulk.card(r.id,r.name)}<div class="board-card"><div class="board-card-title">${cell(r,'name')}${actions?actions(r):''}<button class="icon-btn board-move" data-action="board-move" data-id="${esc(r.id)}" aria-label="Move ${esc(r.name)}" title="Move card">${icon(actions?'arrow':'more')}</button></div>${cols.map(f=>`<div class="board-property"><span class="board-property-label">${esc(f.label)}</span><div>${cell(r,f.key)}</div></div>`).join('')}</div></article>`).join('')||'<div class="board-drop-empty">Drop a card here</div>'}</div></section>`).join('')||'<div class="crm-empty"><h3>No columns yet</h3><p>Add a record or choose another grouping.</p></div>'}</div>`;
 }
 function clearMarks(){globalThis.document?.querySelectorAll('.board-drop-target,.board-drop-before,.board-drop-after,.board-dragging').forEach(el=>el.classList.remove('board-drop-target','board-drop-before','board-drop-after','board-dragging'));}
 function reset(){drag=null;clearMarks();}
 function snapshot(id){const c=current(),g=groups().find(g=>g.rows.some(r=>r.id===id));if(!g)throw Error('This card is no longer visible.');return {scope:c.scope,config:structuredClone(c.config),fields:structuredClone(c.fields||c.columns),id,fromKey:g.key};}
 function focusCard(id){const card=[...document.querySelectorAll('[data-board-id]')].find(el=>el.dataset.boardId===id);card?.querySelector('.board-move')?.focus();}
 async function execute(request){
  if(blocked?.()){toast('Wait for the workspace to finish syncing before moving a card.');return;}
  const scrollLeft=document.querySelector('.kanban-board')?.scrollLeft||0;
  const restoreScroll=()=>{const board=document.querySelector('.kanban-board');if(board)board.scrollLeft=scrollLeft;};
  try{
   const changed=moveBoardCard(getState(),request);if(!changed)return;
   if(dialog.open)dialog.close();render();restoreScroll();await save();restoreScroll();
   if(!blocked?.()){toast(request.fromKey===request.toKey?'Card order saved.':'Card moved.');focusCard(request.id);}
  }catch(err){
   if(request.fromKey===request.toKey){toast(err.message);return;}
   open('Review move',`<div class="dialog-body"><p>${esc(err.message)}</p><p class="hint">The card has not moved.</p></div><div class="dialog-footer"><button class="btn" data-action="close">Cancel</button><button class="btn primary" data-action="${boardActions[request.scope]}" data-id="${esc(request.id)}">Open ${esc(({clients:'client',projects:'project',documents:'document',invoices:'invoice',forms:'form',workflows:'workflow'})[request.scope])}</button></div>`);
  }
 }
 function handleClick(action,el){if(!action.startsWith('board-')||!enabled())return false;
  if(action==='board-layout'){reset();current().config.layout=el.dataset.layout;normalize();render();return true;}
  if(action==='board-move'){
   move=snapshot(el.dataset.id);const c=current(),row=c.list.find(r=>r.id===move.id),gs=groups();
   open('Move card',`<div class="dialog-body"><p class="board-move-name">${esc(row.name)}</p><label class="field">Column<select id="board-destination" aria-label="Destination column">${gs.map(g=>`<option value="${esc(g.key)}" ${g.key===move.fromKey?'selected':''}>${esc(g.label)} · ${g.rows.length}</option>`).join('')}</select></label><label class="field">Position<select id="board-position" aria-label="Card position" ${c.config.sort?'disabled':''}><option value="last">Last in column</option><option value="first">First in column</option></select></label><p class="hint">${esc(boardMoveHint(c.scope,availableFields().find(f=>f.key===c.config.groupBy)))}${c.config.sort?' Cards follow the current sort.':''}</p></div><div class="dialog-footer"><button class="btn" data-action="close">Cancel</button><button class="btn primary" data-action="board-apply">Move card</button></div>`);return true;
  }
  if(action==='board-apply'&&move){const toKey=dialog.querySelector('#board-destination')?.value;if(!toKey)return true;const first=dialog.querySelector('#board-position')?.value==='first',g=groups().find(g=>g.key===toKey);execute({...move,toKey,beforeId:first?g?.rows.find(r=>r.id!==move.id)?.id||null:null,reorder:!current().config.sort});return true;}
  return false;
 }
 function dragStart(e){const card=e.target.closest('[data-board-id]');if(!card||!enabled())return;if(blocked?.()||e.target.closest('input,.board-move,.record-list-actions')){e.preventDefault();return;}try{drag={...snapshot(card.dataset.boardId),element:card};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-thrive-card',card.dataset.boardId);e.dataTransfer.setData('text/plain',card.dataset.boardId);requestAnimationFrame(()=>{if(drag)card.classList.add('board-dragging');});}catch(err){e.preventDefault();toast(err.message);}}
 function destination(e){const lane=e.target.closest('[data-board-column]');if(!lane)return null;const cards=[...lane.querySelectorAll('[data-board-id]')].filter(el=>el.dataset.boardId!==drag.id);const before=cards.find(el=>{const rect=el.getBoundingClientRect();return e.clientY<rect.top+rect.height/2;});return {lane,before,beforeId:before?.dataset.boardId||null,toKey:lane.dataset.boardColumn};}
 function dragOver(e){if(!drag)return;const target=destination(e);if(!target)return;e.preventDefault();e.dataTransfer.dropEffect='move';clearMarks();drag.element.classList.add('board-dragging');target.lane.classList.add('board-drop-target');if(!current().config.sort){if(target.before)target.before.classList.add('board-drop-before');else target.lane.querySelector('[data-board-id]:last-child')?.classList.add('board-drop-after');}const board=target.lane.closest('.kanban-board'),rect=board.getBoundingClientRect();if(e.clientX>rect.right-70)board.scrollBy({left:24});else if(e.clientX<rect.left+70)board.scrollBy({left:-24});}
 function drop(e){if(!drag)return;e.preventDefault();const target=destination(e);if(!target){reset();return;}const request={...drag,toKey:target.toKey,beforeId:current().config.sort?null:target.beforeId,reorder:!current().config.sort};delete request.element;reset();execute(request);}
 if(globalThis.document){document.addEventListener('dragstart',dragStart);document.addEventListener('dragover',dragOver);document.addEventListener('drop',drop);document.addEventListener('dragend',reset);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)reset();});}
 return {enabled,normalize,layoutControl,board,groups,availableFields,handleClick,reset};
}
