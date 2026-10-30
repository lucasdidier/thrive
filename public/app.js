import {resetPagePosition} from './page-navigation.js';
import {createWorkspaceManager,workspaceRequest} from './workspace-manager.js';
import {readImageUpload} from './image-upload.js';
import {sidebarHeader,sidebarFooter} from './sidebar-content.js';
import {gettingStartedSteps,rememberGettingStarted,skipGettingStarted} from './getting-started.js';
import {initDrawerMotion} from './drawer-motion.js';
import {createDialogDraftGuard} from './dialog-draft-guard.js';
import {toggleMoreActions} from './more-actions.js';
import {displayInitials} from './attention-domain.js';
import {documentLabel} from './document-labels.js';
import {icon} from './app-icons.js';
import {initSidebarUI} from './sidebar-ui.js';
import {createNotificationsUI} from './notifications-ui.js';
import {createDashboard} from './dashboard-ui.js';
import {workspaceSections,sidebarGroups} from './sidebar-sections.js';
import {initDatePicker} from './date-picker.js';
import {createSettingsPage,settingsSection} from './settings-page.js';
import {initFluid} from './fluid/bridge.js?v=workflow-pickers-1';
import {createSettingsUI} from './settings-ui.js';
import {createTagsUI} from './tags-ui.js';


import {currencyCode,moneyGroups} from './currency.js';
import {createClientImportUI} from './client-import-ui.js';
import {createRecordPanel} from './record-panel-ui.js';
import {createListViewUI} from './list-view-ui.js';
import {createBulkUI} from './bulk-ui.js';
import {createPortalUI} from './portal-ui.js';
import {loadAccount,signOut} from './account.js';
import {initSelects} from './select-ui.js';
import {createTimeUI} from './time-ui.js';
import {verticals,inferVertical,populateCatalog,starterServices} from './catalog-starters.js';
import {createFormsUI} from './forms-ui.js';
import {createCommunicationsUI} from './communications-ui.js';
import {createShareUI} from './share-ui.js';
import {createWorkspaceSync} from './workspace-sync.js';
import {createCustomFieldsUI} from './custom-fields-ui.js';
import {createCatalogUI} from './services-ui.js';
import {initWorkflows,snapshotWorkspace,runWorkflows} from './workflow-domain.js';
import {createWorkflowUI} from './workflow-ui.js';
import {initCreateMenu} from './create-menu.js';
import {initScheduling} from './scheduling-domain.js';
import {createSchedulingUI} from './scheduling-ui.js';
import {createChatUI} from './chat-ui.js';
import {createBillingUI} from './billing-ui.js';
import {createCRM} from './crm-ui.js';
import {upgradeWorkspace,deliveryStatus} from './workspace-domain.js';
import {createWorkspaceUI} from './workspace-ui.js';
import {createJourneyUI} from './journey-ui.js';
import {initBilling,seed,uid,money,today,totals,projectClient,invoiceStatus,createProject,acceptProposal,generateDeposit,suggestSetup,addActivity,migrate} from './domain.js';
history.scrollRestoration='manual';
initSelects();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let account;try{account=await loadAccount();}catch(error){document.querySelector('#main').textContent=error.message;throw error;}
const storageKey='thrive-workspace-v1'+(account.enabled?':'+account.user.owner:'')+(account.workspaceId!=='default'?':workspace:'+account.workspaceId:'');
const sidebarUI=initSidebarUI(storageKey);
let state;try{state=upgradeWorkspace(migrate(JSON.parse(localStorage.getItem(storageKey))))}catch{state=upgradeWorkspace(seed())}
initBilling(state);initScheduling(state,Intl.DateTimeFormat().resolvedOptions().timeZone);
initWorkflows(state);
const workspaceSync=createWorkspaceSync(account);
try{state=upgradeWorkspace(await workspaceSync.connect(state));}catch(err){document.querySelector('#main').innerHTML=`<div class="crm-empty"><h2>Workspace unavailable</h2><p>Your browser data has been preserved. Reload to reconnect.</p><a class="btn" href="${account.enabled?'/auth/sign-in':'/signin-with-chatgpt?return_to=%2F'}">Sign in</a></div>`;throw err;}
try{Object.assign(account,await workspaceRequest());Object.assign(state.settings,account.profile);}catch{account.workspaces=[];}
let workflowSnapshot=snapshotWorkspace(state);
let page=location.hash.slice(1)||'overview',filter='all',query='',setupDraft,toastTimer;
const dialog=document.querySelector('#dialog');
initDrawerMotion(dialog);
const draftGuard=createDialogDraftGuard(dialog);
let settingsPage;
const settingsSurface=new Proxy(dialog,{get(target,key){const surface=!target.open&&settingsPage?.isActive()?document.querySelector('#settings-content')||target:target;if(key==='close')return ()=>{if(target.open)target.close();};const value=Reflect.get(surface,key,surface);return typeof value==='function'?value.bind(surface):value;}});
initCreateMenu();initDatePicker();
let checklistConnection=null;
function save(){rememberGettingStarted(state,checklistConnection);return workspaceSync.save();}
async function saveThen(after){try{await save();if(workspaceSync.isBlocked())return;after();}catch(err){error(err.message);}}
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500)}
function btn(text,action,extra='',cls=''){return `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`}
const sentence=v=>{v=String(v??'');return v?v[0].toUpperCase()+v.slice(1):v;};
const badge=(status,label,style='')=>`<span class="badge ${String(status).replaceAll(' ','-')}"${style?` style="${style}"`:''}><i></i>${esc(label??sentence(status))}</span>`;
const avatar=c=>`<span class="avatar ${c?.color||'sage'}">${c?.logo&&/^data:image\/(png|jpeg|webp);base64,/.test(c.logo)?`<img src="${esc(c.logo)}" alt="">`:esc(displayInitials(c))}</span>`;
const date=s=>s?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')):'No date';
function go(p){if(page===p){filter='all';query='';render()}else location.hash=p}
function open(title,html,{drawer=!/[?]$|^Approve milestone$|^Search workspace$/.test(title),footer=''}={}){if(settingsPage?.present(title,html,{footer}))return;if(!dialog.open)draftGuard.clear();dialog.className=drawer?'drawer':'';dialog.scrollTop=0;dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-btn" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>${html}${footer?`<div class="dialog-footer">${footer}</div>`:''}`;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;draftGuard.track()}
function error(message){const e=(dialog.open?dialog:document.querySelector('#settings-content')||dialog).querySelector('.form-error');if(e)e.textContent=message;else toast(message)}
function heading(title,description,action,eyebrow=''){return `<div class="page-heading"><div>${eyebrow?`<div class="eyebrow">${eyebrow}</div>`:''}<h1>${title}</h1><p>${description}</p></div>${action||''}</div>`}
function projectCrumb(){const p=state.projects.find(p=>p.id===decodeURIComponent(page.split('/')[1]||''));return p?`<nav class="topbar-crumbs" aria-label="Breadcrumb"><a href="#projects">Projects</a>${icon('chevron')}<span aria-current="page">${esc(p.name)}</span></nav>`:'';}
function shell(){
 const openPopover=document.querySelector('#sidebar [popover]:popover-open')?.id;
 const focused=document.activeElement?.closest('#sidebar')?{action:document.activeElement.dataset.action,step:document.activeElement.dataset.step}:null;
 const navScroll=document.querySelector('#sidebar .nav')?.scrollLeft||0;
 const nav=workspaceSections.filter(([id])=>state.settings.sidebarSections?.[id]!==false);
 document.querySelector('#sidebar').innerHTML=`${sidebarHeader(state,{esc,icon,account,shortcut:/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ K':'Ctrl K'})}<div class="nav-label">Workspace<a href="#settings/sidebar" aria-label="Customize sidebar" title="Customize sidebar">${icon('settings')}</a></div><nav class="nav" aria-label="Main navigation">${sidebarGroups.map(([label,items])=>{const shown=items.filter(([id])=>nav.some(n=>n[0]===id));return shown.length?`<div class="nav-group">${shown.map(([id,label])=>`<a href="#${id}" title="${label}" aria-label="${label}" class="${(page===id||page.startsWith(id+'/'))?'active':''}" ${page===id||page.startsWith(id+'/')?'aria-current="page"':''}>${icon(id==='overview'?'home':id==='proposals'?'documents':id==='contracts'?'signature':id)}<span class="nav-item-label">${label}</span></a>`).join('')}</div>`:'';}).join('')}</nav>${sidebarFooter(state,{esc,icon,account,connection:checklistConnection})}`;
 sidebarUI.sync();
 if(openPopover)document.getElementById(openPopover)?.showPopover();
 if(focused?.action){const buttons=[...document.querySelectorAll('#sidebar [data-action]')];(buttons.find(b=>b.dataset.action===focused.action&&b.dataset.step===focused.step)||document.querySelector('[popovertarget=getting-started-menu]'))?.focus();}
 const navStrip=document.querySelector('#sidebar .nav');if(navStrip&&matchMedia('(max-width:650px)').matches){navStrip.scrollLeft=navScroll;const selected=navStrip.querySelector('[aria-current=page]');if(selected){const a=selected.getBoundingClientRect(),b=navStrip.getBoundingClientRect();if(a.left<b.left)navStrip.scrollLeft+=a.left-b.left;else if(a.right>b.right)navStrip.scrollLeft+=a.right-b.right;}}
 const primary={proposals:['New proposal','new-proposal'],contracts:['New contract','new-contract'],time:['Log time','log-time'],messages:['Compose email','mail-new'],clients:['New client','new-client'],projects:['New project','new-project'],forms:['New form','new-form'],workflows:['New workflow','wf-new'],scheduling:['New event type','meeting-type-new']};
 document.querySelector('#topbar').innerHTML=`<div class="topbar-title">${icon((page.startsWith('settings')||page.startsWith('account/'))?'settings':page==='overview'?'home':page==='proposals'?'documents':page==='contracts'?'signature':page)}${page.startsWith('projects/')?projectCrumb():''}<h1>${(page.startsWith('settings')||page.startsWith('account/'))?(page.startsWith('account/')?'Account settings':'Workspace settings'):page==='chat'?(chatUI.active()?esc(chatUI.active().title):'New chat'):page.startsWith('projects/')?'Projects':nav.find(n=>n[0]===page)?.[1]||'Home'}</h1>${page==='chat'?'<span class="chat-preview-label">Preview</span>':''}</div><div class="top-actions">${page==='chat'?btn(icon('plus')+'New chat','chat-new')+(chatUI.active()?btn('Delete','chat-delete','','subtle'):''):''}${page==='time'?btn('Hourly rates','time-rates'):''}${page==='clients'?btn('Import clients','ci-start'):''}${page==='projects'?btn(icon('clock')+'Log time','log-time','','subtle'):''}${primary[page]?btn(icon('plus')+primary[page][0],primary[page][1],'','primary'):page==='invoices'?btn(icon('download')+'Export CSV','export')+btn(icon('plus')+'New invoice','new-invoice','','primary'):''}</div>`;
}
function overview(){return dashboard.page();}

function controls(tabs,placeholder,extra=''){return `<div class="toolbar"><div class="tabs" aria-label="Filter">${tabs.map(([id,label])=>`<button class="tab ${filter===id?'active':''}" data-action="filter" data-filter="${id}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div><div class="filter-row"><label class="search-field">${icon('search')}<input class="filter-input" id="list-search" placeholder="${placeholder}" aria-label="${placeholder}" value="${esc(query)}"><kbd>/</kbd></label>${extra}</div></div>`}
function workflowsPage(){return workflowUI.page();}
function render(){if(page==='onboarding'){page='overview';history.replaceState(null,'',location.pathname+location.search+'#overview');queueMicrotask(()=>document.querySelector('#getting-started-menu')?.showPopover());}if(['settings/profile','settings/appearance'].includes(page)){page=page.replace('settings/','account/');history.replaceState(null,'',location.pathname+location.search+'#'+page);}if(page==='documents'){page='proposals';history.replaceState(null,'',location.pathname+location.search+'#proposals');}const isSettings=(page.startsWith('settings')||page.startsWith('account/'));if(page==='chat')page='overview';document.documentElement.dataset.currency=currencyCode(state);if(!['clients','projects','documents','proposals','contracts','forms','invoices','time','scheduling','workflows','messages'].includes(page)){bulk.reset();listView.reset();}if(!isSettings&&!page.startsWith('projects/')&&!page.startsWith('clients/')&&!['overview','notifications','chat','clients','projects','documents','proposals','contracts','forms','messages','scheduling','invoices','workflows','time'].includes(page))page='overview';shell();const main=document.querySelector('#main'),isList=['clients','projects','documents','proposals','contracts','forms','invoices'].includes(page);main.classList.toggle('crm-main',isList||page==='time'||page==='scheduling'||page==='workflows'||page==='messages');main.classList.toggle('settings-main',isSettings);main.classList.toggle('chat-main',page==='chat');main.innerHTML=page.startsWith('clients/')?'':page.startsWith('projects/')?journey.page(decodeURIComponent(page.split('/')[1]),page.split('/')[2]):isSettings?settingsPage.page():isList?crm.page():page==='notifications'?notificationsUI.page():page==='time'?timeUI.page():page==='messages'?messagesUI.page():page==='scheduling'?scheduleUI.page():page==='chat'?chatUI.page():({overview,workflows:workflowsPage}[page])();if(page.startsWith('clients/')){const id=decodeURIComponent(page.split('/')[1]);if(state.clients.some(c=>c.id===id))crm.clientDetail(id,recordPanel.active()?.id!==id);else{recordPanel.close(false);main.innerHTML='<div class="crm-empty"><h2>Client not found</h2><a class="btn" href="#clients">Back to clients</a></div>';}}const record=page.startsWith('projects/')?state.projects.find(r=>r.id===decodeURIComponent(page.split('/')[1])):page.startsWith('clients/')?state.clients.find(r=>r.id===decodeURIComponent(page.split('/')[1])):null;document.title=record?`Thrive — ${record.name}${page.split('/')[2]?' · '+page.split('/')[2]:''}`:isSettings?`Thrive — ${page.startsWith('account/')?'Account settings':'Workspace settings'} · ${settingsSection().name}`:`Thrive — ${page[0].toUpperCase()+page.slice(1)}`;if(isSettings)void settingsPage.mount();bulk.sync()}

function projectDetail(id){return journey.projectDetail(id);}
function clientDetail(id){return crm.clientDetail(id);}
function proposalDetail(id){return workspaceUI.openProjectDocument(id);}
function invoiceDetail(id){return billingUI.detail(id);}

function clientForm(id){return journey.clientForm(id);}

function setup(){open('Configure defaults',`<div class="dialog-body"><div class="setup-intro">${icon('sparkles')}<h1>Configure your workspace</h1><p>Describe your services and payment terms.</p></div><label class="field">Tell us about your business<textarea id="setup-prompt" rows="5">${esc(state.settings.description)}</textarea></label><div class="prompt-examples"><button data-action="example" data-kind="design">I’m a brand designer</button><button data-action="example" data-kind="web">I build websites</button><button data-action="example" data-kind="consult">I’m a consultant</button></div><div class="notice"><strong>Guided setup preview</strong><br>This prototype recognizes a deposit percentage and a few service types. You’ll review and edit the suggested setup. Live AI is part of the next build.</div><div class="form-error" role="alert"></div></div>`,{footer:btn('Preview my setup '+icon('arrow'),'suggest','','accent')})}

function workflowDetail(id){const w=state.workflows.find(w=>w.id===id);open('Workflow details',`<div class="dialog-body"><span class="flow-icon" style="width:fit-content">${icon('workflows')}</span><h1>${esc(w.name)}</h1><p>${esc(w.description)}</p>${(id==='w1'?['A billing document is accepted or signed','Create one deposit invoice using the project’s saved terms','Record the deposit received outside Thrive','Move the project into active delivery after the full deposit is recorded']:['Mark the discovery call complete','Use the inquiry and meeting notes to draft a proposal','Prepare an accompanying email','Wait for your review before sending']).map((s,i)=>`<div class="preview-step"><span>0${i+1}</span>${s}</div>`).join('')}<div class="section notice">${id==='w1'?'Try this with a project proposal or contract. Repeating an acceptance or payment action won’t create duplicates.':'Complete a meeting in Scheduling, then choose Draft proposal & email. Drafts use fixed templates and stay in this workspace for review. Review email drafts in Emails and connect Google in Connections.'}</div></div>`,{footer:id==='w1'?btn('View proposals '+icon('arrow'),'navigate',`data-page="proposals"`,'primary'):btn('Open scheduling '+icon('arrow'),'navigate',`data-page="scheduling"`,'primary')})}
function business(){open('Your workspace',`<form id="business-form"><div class="dialog-body"><label class="field">Your name<input name="name" value="${esc(state.settings.name)}" required maxlength="80"></label><label class="field">Business name (optional)<input name="business" value="${esc(state.settings.businessName??state.settings.business)}" maxlength="80"></label><div class="notice">Workspace · ${currencyCode(state)} · Changes synced to your account.</div>${btn('Workspace settings','workspace-settings')}${btn('Connections','mail-connections')}${btn('Services & packages','services')}${btn('Payment instructions','payment-settings')}${account.enabled?`<div class="section"><p class="hint">Signed in as ${esc(account.user.email)}</p>${btn('Sign out','signout')}</div>`:`<button type="button" class="text-btn" data-action="reset-preview">Reset sample data</button><a class="text-btn" href="/auth/sign-up">Account signup</a>`}</div><div class="dialog-footer">${btn('Close','close')}<button class="btn primary" type="submit">Save details</button></div></form>`)}
function search(){if(fluidUI){fluidUI.search();return;}open('Search workspace',`<div class="dialog-body"><input id="global-search" class="filter-input full-width" placeholder="Search clients, projects, documents, or invoices…" aria-label="Search clients, projects, documents, or invoices" autofocus></div><div id="search-results" class="search-results"></div>`);searchResults('')}
function searchResults(q){const needle=q.toLowerCase();const results=[...state.clients.map(c=>({name:c.name,type:'Client',action:'client',id:c.id})),...state.projects.map(p=>({name:p.name,type:'Project',action:'project',id:p.id})),...state.documents.map(d=>({name:d.title,type:documentLabel(d),action:'document',id:d.id})),...state.forms.map(f=>({name:f.name,type:'Form',action:'edit-form',id:f.id})),...state.invoices.map(i=>({name:i.number+' · '+money(i.amount),type:'Invoice',action:'invoice',id:i.id}))].filter(r=>r.name.toLowerCase().includes(needle)).slice(0,10);document.querySelector('#search-results').innerHTML=results.map(r=>`<button class="search-result" data-action="${r.action}" data-id="${r.id}">${icon(r.action==='client'?'clients':r.action==='invoice'?'invoices':r.action==='document'?'documents':r.action==='edit-form'?'forms':'projects')}${esc(r.name)}<small>${r.type}</small></button>`).join('')||'<div class="empty">No matches. Try a client or project name.</div>'}
const clientImport=createClientImportUI({getState:()=>state,open,dialog:settingsSurface,btn,esc,icon,save,render,toast,blocked:workspaceSync.isPending});
const bulk=createBulkUI({getState:()=>state,render,save,blocked:workspaceSync.isBlocked,open,dialog,esc,icon,toast,onTimeInvoice:ids=>timeUI.review(ids)});
const listView=createListViewUI({render,esc,icon,bulk,dialog,getState:()=>state,save,blocked:workspaceSync.isPending,open,toast});
const formsUI=createFormsUI({getState:()=>state,open,dialog,btn,icon,esc,save,render,toast,blocked:workspaceSync.isBlocked});
const messagesUI=createCommunicationsUI({refreshClient:()=>{if(recordPanel.active()?.entity==='client')crm.refreshEmails();},bulk,listView,getState:()=>state,getPage:()=>page,open,dialog:settingsSurface,btn,icon,esc,save,render,toast,go,blocked:workspaceSync.isBlocked});
const shareUI=createShareUI({getState:()=>state,save,blocked:workspaceSync.isBlocked,open,dialog,btn,esc,toast});
document.addEventListener('thrive-share-form',e=>shareUI.show('form',e.detail.id,'embed'));
const portalUI=createPortalUI({getState:()=>state,open,dialog,btn,esc,save,blocked:workspaceSync.isBlocked,toast,share:shareUI.show});
const chatUI=createChatUI({getState:()=>state,render,save,toast,icon,esc,btn,open,dialog,go});
const catalogUI=createCatalogUI({blocked:workspaceSync.isBlocked,getState:()=>state,open,btn,icon,esc,dialog:settingsSurface,save,render,toast});
const billingUI=createBillingUI({blocked:workspaceSync.isBlocked,getState:()=>state,open,btn,icon,esc,badge,date,dialog:settingsSurface,save,render,toast});
const timeUI=createTimeUI({blocked:workspaceSync.isBlocked,bulk,listView,getState:()=>state,open,dialog,btn,icon,esc,save,render,toast,go,invoiceDetail:billingUI.detail});
const scheduleUI=createSchedulingUI({createClient:prefill=>journey.clientForm(undefined,prefill),viewClient:id=>journey.clientDetail(id),getPage:()=>page,bulk,listView,calendarAvailability:messagesUI.calendarAvailability,cancelCalendar:messagesUI.cancelCalendar,blocked:workspaceSync.isBlocked,getState:()=>state,render,save,toast,open,dialog:settingsSurface,btn,icon,esc,badge,avatar});
const notificationsUI=createNotificationsUI({getState:()=>state,getPage:()=>page,render,save,open,btn,icon,esc,toast});
const dashboard=createDashboard({recentActivity:emptyHTML=>notificationsUI.recent(4,emptyHTML),getState:()=>state,getPage:()=>page,render,icon,esc,btn});
const tagsUI=createTagsUI({getState:()=>state,esc,save,toast});
function openClientRoute(id){const target='clients/'+encodeURIComponent(id);if(page.startsWith('clients/')){history.replaceState(history.state,'','#'+target);page=target;render();}else{const origin=location.hash||'#clients';history.pushState({thriveClientReturn:origin},'','#'+target);window.dispatchEvent(new HashChangeEvent('hashchange',{oldURL:location.origin+location.pathname+origin,newURL:location.href}));}}
const recordPanel=createRecordPanel({expand:openClientRoute,exitExpanded:()=>{if(history.state?.thriveClientReturn)history.back();else go('clients');},blocked:workspaceSync.isBlocked,tags:tagsUI,getState:()=>state,esc,icon,btn,avatar,save,render,toast,dialog,detail:(entity,id,opening=true)=>entity==='client'?crm.clientDetail(id,opening):journey.projectDetail(id,opening)});
const customFields=createCustomFieldsUI({blocked:workspaceSync.isBlocked,getState:()=>state,open,dialog,esc,icon,btn,save,render,toast,recordDetail:(e,id)=>e==='client'?crm.clientDetail(id):journey.projectDetail(id),refresh:()=>recordPanel.refresh(true),showColumn:(e,id)=>crm.showColumn(e,id)});
const crm=createCRM({storageKey,blocked:workspaceSync.isBlocked,clientEmails:messagesUI.clientEmails,mountClientPortal:portalUI.mountClient,recordPanel,bulk,listView,communicationActions:messagesUI.contextActions,customFields,clientMeetings:scheduleUI.clientMeetings,getState:()=>state,getPage:()=>page,render,save,toast,open,dialog,icon,esc,badge,avatar,date,btn});
const workspaceUI=createWorkspaceUI({blocked:workspaceSync.isBlocked,getState:()=>state,getView:()=>({filter,query}),clearList:()=>{filter='all';query='';},open,btn,icon,esc,badge,avatar,date,save,render,toast,dialog,heading,controls,go});
const workflowUI=createWorkflowUI({blocked:workspaceSync.isBlocked,bulk,listView,getState:()=>state,open,dialog,btn,icon,esc,save,render,toast});
const journey=createJourneyUI({blocked:workspaceSync.isBlocked,projectEmails:messagesUI.projectEmails,projectEmailCount:messagesUI.projectEmailCount,projectEmailActivity:messagesUI.projectEmailActivity,recordPanel,communicationActions:messagesUI.contextActions,customFields,clientDetail:crm.clientDetail,projectDocuments:workspaceUI.projectDocuments,getState:()=>state,open,btn,icon,esc,badge,avatar,date,save,render,toast,dialog});

const settingsUI=createSettingsUI({blocked:workspaceSync.isBlocked,getState:()=>state,open,dialog,esc,btn,icon,save,render,toast,tags:tagsUI,email:account.user?.email,go,projectDetail:id=>journey.projectDetail(id),clientDetail:id=>crm.clientDetail(id)});
const workspaceManager=createWorkspaceManager({account,getState:()=>state,open,esc,btn,toast,isPending:workspaceSync.isPending,onCreated:()=>{draftGuard.clear();dialog.close();},canLeave:()=>!dialog.open||draftGuard.canLeave()});
async function saveProfile(profile){const result=await workspaceRequest('PATCH',profile);account.profile=result.profile;Object.assign(state.settings,result.profile);}
settingsPage=createSettingsPage({saveProfile,getState:()=>state,esc,icon,btn,save,render,toast,isBlocked:workspaceSync.isBlocked,email:account.user?.email,accountEnabled:account.enabled,closeDialog:()=>dialog.close(),load:async id=>{if(id==='services')catalogUI.handleClick('services',{dataset:{}});else if(id==='payments')billingUI.handleClick('payment-settings',{dataset:{}});else if(id==='invoices')billingUI.handleClick('invoice-templates',{dataset:{}});else if(id==='connections')await messagesUI.connections();else if(id==='mcp')clientImport.handleClick('mcp-guide',{dataset:{}});else if(id==='scheduling')document.querySelector('#settings-content').innerHTML=scheduleUI.settingsPage();}});
const fluidUI=initFluid({getState:()=>state,save,toast,open,dialog});
workspaceSync.bind(()=>state,next=>{state=upgradeWorkspace(next);workflowSnapshot=snapshotWorkspace(state);},close=>{if(close){dialog.close();crm.resetAll();}render();recordPanel.refresh();});
document.addEventListener('click',e=>{
 const el=e.target.closest('button[data-action],a[href]');if(!el||!dialog.open)return;
 const leaving=el.matches('a[href]')||['signout','navigate'].includes(el.dataset.action)||(el.closest('#dialog')&&/^(Cancel|Back to (invoice|draft)|Close|Done)$/.test(el.textContent.trim()));
 if(leaving&&el.dataset.action!=='close'&&!draftGuard.canLeave()){e.preventDefault();e.stopImmediatePropagation();}
},true);
document.addEventListener('click',e=>{
 if(e.target.closest('.skip')){e.preventDefault();document.querySelector('#main').focus();return;}
 const el=e.target.closest('[data-action]');if(!el){listView.outsideClick(e);crm.outsideClick(e);return;}const a=el.dataset.action,id=el.dataset.id;
 try{
 if(workspaceManager.click(a,el))return;
 if(a==='sidebar-theme'){const theme=el.dataset.theme;document.documentElement.dataset.theme=theme;localStorage.setItem('thrive-theme',theme);document.querySelectorAll('[data-action=sidebar-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));return;}
 if(a==='gs-open'){const step=gettingStartedSteps.find(x=>x.id===el.dataset.step);document.querySelector('#getting-started-menu')?.hidePopover();if(step?.page)go(step.page);else if(step){const b=document.createElement('button');b.dataset.action=step.action;document.body.append(b);b.click();b.remove();}return;}
 if(a==='gs-skip'||a==='gs-undo'){skipGettingStarted(state,el.dataset.step,a==='gs-undo');void saveThen(()=>{toast(a==='gs-undo'?'Step restored.':'Step skipped. You can come back to it anytime.');});return;}
 if(a==='more-actions'){toggleMoreActions(el);return;}
 if(notificationsUI.click(a,el)||settingsPage.click(a,el)||settingsUI.click(a,el)||clientImport.handleClick(a,el)||recordPanel.handleClick(a,el)||listView.handleClick(a,el)||bulk.handleClick(a,el)||portalUI.handleClick(a,el)||timeUI.handleClick(a,el)||formsUI.handleClick(a,el)||messagesUI.handleClick(a,el)||shareUI.handleClick(a,el)||customFields.handleClick(a,el)||catalogUI.handleClick(a,el)||workflowUI.handleClick(a,el)||scheduleUI.handleClick(a,el)||chatUI.handleClick(a,el)||billingUI.handleClick(a,el)||crm.handleClick(a,el)||workspaceUI.handleClick(a,el)||journey.handleClick(a,el))return;
 if(a==='signout'){if(workspaceSync.isPending())throw Error('Finish syncing your changes before signing out.');signOut().catch(err=>toast(err.message));return;}
 if(account.enabled&&['reset-preview','reset-data'].includes(a))throw Error('Sample data reset is only available in the demo.');
 if(a==='close'){if(draftGuard.canLeave())dialog.close();}
 else if(a==='theme'){const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('thrive-theme',t)}catch{}}
 else if(a==='project')projectDetail(id);else if(a==='client')clientDetail(id);else if(a==='invoice')invoiceDetail(id);else if(a==='proposal')proposalDetail(id);
 else if(a==='new-project')projectForm(el.dataset.client);else if(a==='new-client')clientForm();else if(a==='setup')setup();else if(a==='business')business();
 else if(a==='filter'){filter=el.dataset.filter;render()}
 else if(a==='navigate'){if(draftGuard.canLeave()){dialog.close();go(el.dataset.page)}}
 else if(a==='deposit'){const invoice=generateDeposit(state,id);void saveThen(()=>{render();invoiceDetail(invoice.id);toast('Deposit invoice ready.');})}
 else if(a==='toggle-workflow'){const w=state.workflows.find(w=>w.id===id);w.enabled=!w.enabled;void saveThen(()=>{render();toast(w.enabled?'Deposit workflow enabled.':'Deposit workflow paused. You can still create invoices manually.');})}
 else if(a==='workflow')workflowDetail(id);
 else if(a==='suggest'){const text=document.querySelector('#setup-prompt').value.trim();if(text.length<10)throw new Error('Describe your services and payment terms.');setupDraft=suggestSetup(text);setupPreview()}
 else if(a==='example'){document.querySelector('#setup-prompt').value=({design:'I’m a brand designer. I take 50% upfront, work in discovery, design, and handoff, and review every proposal.',web:'I build websites. I take a 40% deposit and work through discovery, design, development, and launch.',consult:'I’m a strategy consultant. I take 30% upfront, then move through discovery, strategy, and recommendations.'})[el.dataset.kind]}
 else if(a==='search')search();
 else if(a==='reset-preview')open('Reset the demo?', '<div class="dialog-body"><p>This restores the original sample workspace and removes changes made in this browser. Your appearance preference is kept.</p></div>',{footer:btn('Keep my changes','close')+btn('Reset sample data','reset-data','','primary')});
 else if(a==='reset-data'){state=initBilling(upgradeWorkspace(seed()));initScheduling(state,Intl.DateTimeFormat().resolvedOptions().timeZone);scheduleUI.reset();crm.resetAll();chatUI.reset();workflowUI.reset();initWorkflows(state);workflowSnapshot=snapshotWorkspace(state);void saveThen(()=>{dialog.close();render();toast('Sample data restored.');})}
 else if(a==='export'){const rows=[['Invoice','Client','Project',`Amount ${currencyCode(state)}`,`Paid ${currencyCode(state)}`,'Due','Status'],...state.invoices.map(i=>{const p=state.projects.find(p=>p.id===i.projectId);return [i.number,i.clientName||projectClient(state,p)?.name||'',i.projectName||p?.name||'',(i.amount/100).toFixed(2),(i.paid/100).toFixed(2),i.due,invoiceStatus(i)]})];const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='thrive-invoices.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your invoice export is ready.')}
 }catch(err){error(err.message)}
});
document.addEventListener('invalid',e=>{if(!e.target.form)return;e.preventDefault();const form=e.target.form;let box=form.querySelector('.form-error');if(!box){box=document.createElement('div');box.className='form-error';box.setAttribute('role','alert');form.append(box);}const label=e.target.labels?.[0]?.textContent.trim().split('\n')[0]||'This field';box.textContent=label+': '+e.target.validationMessage;e.target.setAttribute('aria-invalid','true');},true);
document.addEventListener('input',e=>{if(e.target.validity?.valid)e.target.removeAttribute('aria-invalid');});
document.addEventListener('submit',e=>{
 if(!e.target.closest('dialog,#client-panel,#settings-content,.project-page')&&!e.target.id.startsWith('crm-')&&!e.target.id.startsWith('cf-')&&e.target.id!=='chat-form'&&e.target.id!=='availability-form')return;e.preventDefault();const f=new FormData(e.target),values=Object.fromEntries(f);
 try{
 if(settingsPage.handleSubmit(e.target,values)||settingsUI.handleSubmit(e.target,values)||clientImport.handleSubmit(e.target,values)||recordPanel.handleSubmit(e.target,values)||portalUI.handleSubmit(e.target,e.submitter)||timeUI.handleSubmit(e.target,values)||formsUI.handleSubmit(e.target,e.submitter?.value)||messagesUI.handleSubmit(e.target,values,e.submitter?.value)||customFields.handleSubmit(e.target,values)||catalogUI.handleSubmit(e.target,values)||workflowUI.handleSubmit(e.target)||scheduleUI.handleSubmit(e.target,values)||chatUI.handleSubmit(e.target,values)||billingUI.handleSubmit(e.target,values,e.submitter?.value)||crm.handleSubmit(e.target,values)||workspaceUI.handleSubmit(e.target,values,e.submitter?.value)||journey.handleSubmit(e.target,values,e.submitter?.value))return;
 if(e.target.id==='project-form'){const p=state.projects.find(p=>p.id===e.target.dataset.createdId)||createProject(state,{...values,budget:Math.round(Number(values.budget)*100)});e.target.dataset.createdId=p.id;void saveThen(()=>{render();projectDetail(p.id);toast('Project created.');})}

 if(e.target.id==='business-form'){if(!values.name.trim())throw new Error('Enter your name.');state.settings={...state.settings,name:values.name.trim(),business:values.business.trim()||values.name.trim(),businessName:values.business.trim()};void saveThen(()=>{render();dialog.close();toast('Workspace details saved.');})}
 }catch(err){error(err.message)}
});
document.addEventListener('input',e=>{if(settingsPage.input(e.target))return;if(listView.handleInput(e.target)||messagesUI.handleInput(e.target)||customFields.handleInput(e.target)||workflowUI.handleInput(e.target)||billingUI.handleInput(e.target)||scheduleUI.handleInput(e.target)||chatUI.handleInput(e.target)||crm.handleInput(e.target))return;workspaceUI.handleInput(e.target);journey.handleInput(e.target);if(e.target.id==='list-search'){const cursor=e.target.selectionStart;query=e.target.value;render();const input=document.querySelector('#list-search');input.focus();input.setSelectionRange(cursor,cursor)}if(e.target.id==='global-search')searchResults(e.target.value)});
document.addEventListener('change',e=>{settingsPage.input(e.target);try{if(!settingsUI.change(e.target)&&!clientImport.handleChange(e.target)&&!recordPanel.handleChange(e.target)&&!journey.handleChange(e.target)&&!listView.handleChange(e.target)&&!bulk.handleChange(e.target)&&!timeUI.handleChange(e.target)&&!catalogUI.handleChange(e.target)&&!formsUI.handleChange(e.target)&&!messagesUI.handleChange(e.target)&&!customFields.handleChange(e.target)&&!workflowUI.handleChange(e.target)&&!billingUI.handleChange(e.target)&&!scheduleUI.handleChange(e.target)&&!crm.handleChange(e.target))workspaceUI.handleChange(e.target)}catch(err){error(err.message)}});
document.addEventListener('keydown',e=>{if(listView.keyboard(e)||bulk.keyboard(e)||recordPanel.keyboard(e))return;chatUI.keyboard(e);crm.keyboard(e);if(e.key==='/'&&!dialog.open&&!e.target.closest('input,textarea,select,[contenteditable]')){const search=document.querySelector('#crm-search, #list-search, #meeting-search');e.preventDefault();if(search)search.focus();else if(draftGuard.canLeave())window.setTimeout(()=>document.querySelector('.sidebar-search')?.click(),0);}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(draftGuard.canLeave())search()}});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(draftGuard.canLeave())dialog.close()}}});
window.addEventListener('hashchange',event=>{if(!recordPanel.canLeaveInline()){history.replaceState(null,'',event.oldURL);return;}if(document.querySelector('#rp-inline-form,#cf-value-form,#crm-inline-form')){history.replaceState(null,'',event.oldURL);toast('Save or cancel the current edit before navigating.');return;}if(!draftGuard.canLeave()){history.replaceState(null,'',event.oldURL);return;}if(!settingsPage.guardHash())return;clearTimeout(toastTimer);document.querySelector('#toast').classList.remove('show');document.querySelector('#toast').textContent='';dialog.close();recordPanel.close(false);listView.reset();bulk.reset();page=location.hash.slice(1)||'overview';filter='all';query='';workspaceUI.reset();crm.reset();render();if(!page.startsWith('clients/'))resetPagePosition()});
let checkingConnection=false;
document.addEventListener('toggle',async event=>{
 if(event.target.id!=='getting-started-menu'||event.newState!=='open'||checkingConnection)return;
 checkingConnection=true;
 try{const response=await fetch('/api/communications',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const data=await response.json();checklistConnection=data.connection;
 if(checklistConnection?.account?.gmail&&checklistConnection.account.calendar&&!state.settings.gettingStarted?.completed?.includes('connections')&&!workspaceSync.isPending()&&!document.body.hasAttribute('data-settings-dirty'))await save();
 }catch{const message=document.querySelector('.getting-started-message');if(message){message.hidden=false;message.textContent='Connection status is unavailable. Open Email & calendar to retry.';}}
 finally{checkingConnection=false;}
},true);
render();
resetPagePosition({focus:false});

const googleResult=new URLSearchParams(location.search);if(googleResult.has('google_connected')||googleResult.has('google_error')||googleResult.has('nylas_connected')||googleResult.has('nylas_error')){toast(googleResult.get('nylas_error')||googleResult.get('google_error')||'Account connected. Refresh Emails to load client conversations.');for(const key of ['google_connected','google_error','nylas_connected','nylas_error'])googleResult.delete(key);history.replaceState(null,'',location.pathname+(googleResult.size?'?'+googleResult:'')+location.hash);}

document.addEventListener('submit',e=>{if(e.target.id==='create-workspace-form'){e.preventDefault();e.stopImmediatePropagation();workspaceManager.submit(e.target);}},true);
document.addEventListener('change',e=>{if(e.target.id!=='sidebar-profile-photo'||!e.target.files[0])return;if(document.body.hasAttribute('data-settings-dirty')){toast('Save or reset your settings before updating your photo here.');e.target.value='';return;}const input=e.target;input.disabled=true;void(async()=>{try{await saveProfile({name:state.settings.name,profilePhoto:await readImageUpload(input.files[0],{square:true})});await save();shell();toast('Profile photo updated.');}catch(error){toast(error.message);}finally{input.disabled=false;input.value='';}})();});
