// A small, clickable Thrive for the landing page hero: the app's layout at 1440×900 with fictional
// data, scaled to fit the browser window. Each view has one or two things to try, marked with a
// soft pulse until they're used. Nothing here talks to a server.
import {icon} from '/app-icons.js';

const I=name=>icon(name,'m-i');
// Sidebar: the app's own groups and icons. Sections without a view here are shown, not clickable.
const nav=[['',[['home','Home','home']]],['Work',[['projects','Projects','projects'],['clients','Clients','clients'],['time','Time','time']]],['Business',[['proposals','Proposals','documents'],['contracts','Contracts','signature'],['invoices','Invoices','invoices']]],['Communication',[['emails','Emails','messages'],['scheduling','Scheduling','scheduling']]],['Tools',[['forms','Forms','forms'],['workflows','Workflows','workflows']]]];
const chip=(tone,text)=>`<span class="m-chip ${tone}">${text}</span>`;
const top=(glyph,title,actions='')=>`<div class="m-top"><span class="m-title">${I(glyph)}${title}</span><div class="m-actions">${actions}</div></div>`;
const ghost=(glyph,text)=>`<span class="m-ghost">${I(glyph)}${text}</span>`;
const primary=(glyph,text,attrs='')=>`<span class="m-primary"${attrs}>${I(glyph)}${text}</span>`;
const av=(initials,color)=>`<span class="m-av" style="--c:${color}">${initials}</span>`;
const drawer=(name,title,body,foot='')=>`<aside class="m-drawer" data-drawer="${name}" aria-hidden="true"><div class="m-dhead"><b>${title}</b><button type="button" class="m-x" data-act="close" aria-label="Close">${I('close')}</button></div><div class="m-dbody">${body}</div>${foot?`<div class="m-dfoot">${foot}</div>`:''}</aside>`;

const views={
 home:()=>`${top('home','Home',ghost('settings','Widgets')+ghost('play','Timer')+primary('plus','Create'))}
 <div class="m-body m-home">
  <div class="m-hello"><h4>Good morning, Alex</h4><p>Monday, November 9</p></div>
  <div class="m-card"><div class="m-card-head"><b>Business totals</b><span class="m-select">All time${I('down')}</span></div>
   <div class="m-stats"><div><span>Billable time</span><b>38:15</b></div><div><span>Paid invoices</span><b>€8,250</b></div><div><span>Completed projects</span><b>1</b></div><div><span>Signed contracts</span><b>2</b></div><div><span>Accepted proposals</span><b>3</b></div></div></div>
  <div class="m-cols">
   <div class="m-card"><div class="m-card-head"><b>Calendar</b><span class="m-link">View all${I('arrow')}</span></div>
    <div class="m-dayline"><span class="m-seg">${I('chevron')}</span><span class="m-seg wide">${I('calendar')}Mon, Nov 9</span><span class="m-seg">${I('chevron')}</span><span class="m-seg">Today</span></div>
    <div class="m-list">
     <div class="m-row">${I('calendar')}<span class="m-two"><b>Weekly planning</b><span>9:00 AM – 9:30 AM</span></span></div>
     <button type="button" class="m-row is-btn hot" data-act="open" data-target="event">${I('calendar')}<span class="m-two"><b>Brand review · Juniper Studio</b><span>10:30 AM – 11:15 AM</span></span>${I('chevron')}</button>
     <div class="m-row">${I('calendar')}<span class="m-two"><b>Discovery call · Northstar Labs</b><span>2:00 PM – 2:30 PM</span></span></div>
    </div></div>
   <div class="m-card"><div class="m-card-head"><b>Open projects <em>13</em></b><span class="m-link">View all${I('arrow')}</span></div>
    <div class="m-list">
     <div class="m-row">${I('projects')}<span class="m-two"><b>Orbit website</b><span>Delivery in progress · Target Oct 24</span></span>${chip('info','In progress')}</div>
     <div class="m-row">${I('projects')}<span class="m-two"><b>Juniper brand identity</b><span>Delivery in progress · Target Oct 28</span></span>${chip('info','In progress')}</div>
     <div class="m-row">${I('projects')}<span class="m-two"><b>Paper &amp; Pine brand refresh</b><span>Finish the billing agreement · Target Nov 14</span></span>${chip('','Planned')}</div>
     <div class="m-row">${I('projects')}<span class="m-two"><b>Sunday brand strategy</b><span>Finish the billing agreement · Target Nov 20</span></span>${chip('','Planned')}</div>
    </div></div>
  </div>
  <div class="m-dock"><span class="m-live"></span><span class="m-two"><b>Development</b><span>Orbit website</span></span><b class="m-clock" data-clock>01:12:13</b><button type="button" class="m-btn hot" data-act="timer">${I('stop')}<span>Stop</span></button></div>
 </div>
 ${drawer('event','Brand review · Juniper Studio',`<p class="m-when">Mon, Nov 9 · 10:30 AM – 11:15 AM</p>${primary('video','Join Google Meet')}
  <p class="m-sub">Details</p><dl class="m-dl"><dt>${I('clock')}Duration</dt><dd>45 min</dd><dt>${I('video')}Meeting</dt><dd class="m-a">Google Meet</dd><dt>${I('user')}Organizer</dt><dd>Alex Morgan</dd><dt>${I('clients')}Client</dt><dd><span class="m-pill">Juniper Studio</span></dd></dl>
  <p class="m-sub">Guests <em>3</em></p><div class="m-people"><div>${av('AM','#3d63ee')}<span class="m-two"><b>Alex Morgan</b><span>alex@morgan.example</span></span><em>Organizer</em></div><div>${av('SC','#2f6b4f')}<span class="m-two"><b>Sophie Chen</b><span>sophie@juniper.example</span></span>${chip('ok','Going')}</div><div>${av('ME','#8a5cf6')}<span class="m-two"><b>Mark Ellis</b><span>mark@juniper.example</span></span>${chip('warn','Maybe')}</div></div>
  <p class="m-sub">Description</p><p class="m-desc">Agenda: final logo lockups, colour palette sign-off and next steps for the brand guide.</p>`)}`,

 clients:()=>{
  const card=(name,initial,color,contact,email,id='')=>`<${id?'button type="button" data-act="open" data-target="client"':'div'} class="m-ccard${id?' is-btn hot':''}"><span class="m-cname">${av(initial,color)}<b>${name}</b>${I('arrow')}</span><span class="m-kv"><span>Contact</span><span>${contact}</span></span><span class="m-kv"><span>Email</span><span>${email}</span></span><span class="m-kv"><span>Projects</span><span>${I('projects')}1</span></span></${id?'button':'div'}>`;
  const col=(name,n,cards)=>`<div class="m-col"><p class="m-colhead">${I('down')}${name} <em>${n}</em></p>${cards}</div>`;
  const row=(name,initial,color,contact,email,service)=>`<div class="m-tr">${av(initial,color)}<b>${name}</b><span>${contact}</span><span>${email}</span><span>${service}</span><span>1</span></div>`;
  const data=[['Juniper Studio','J','#2f6b4f','Sophie Chen','sophie@juniper.example','Branding'],['Paper &amp; Pine','P','#1f7a5a','Oliver Reed','oliver@paperpine.example','Branding'],['Forma','F','#c0632b','Emma Davis','emma@forma.example','Editorial'],['Willow Interiors','W','#5b8a3c','Clara Jensen','clara@willow.example','Interiors'],['Ember Coffee','E','#b5562c','Leo Marchetti','leo@embercoffee.example','Packaging'],['Sunday Goods','S','#d39b1f','Mia Taylor','mia@sunday.example','Strategy'],['Orbit','O','#6750c9','James Wilson','james@orbit.example','Web design']];
  return `${top('clients','Clients',ghost('play','Timer')+ghost('download','Import clients')+primary('plus','New client'))}
 <div class="m-body m-flush">
  <div class="m-viewbar"><span class="m-viewname">${I('board')}By service ${I('down')}<em>14</em></span><span class="m-switch"><button type="button" class="hot" data-act="layout" data-layout="table" aria-label="Table">${I('table')}</button><button type="button" class="is-on" data-act="layout" data-layout="board" aria-label="Board">${I('board')}</button></span></div>
  <div class="m-tools"><span class="m-search">${I('search')}Search clients…</span><span class="m-tool">${I('filter')}Filter</span><span class="m-tool">${I('sort')}Sort</span><span class="m-tool on">${I('board')}Group by</span><span class="m-tool">${I('table')}Columns</span></div>
  <div class="m-layouts" data-layout="board">
   <div class="m-board">${col('Branding',2,card(...data[0].slice(0,5),'c1')+card(...data[1].slice(0,5)))}${col('Editorial',1,card(...data[2].slice(0,5)))}${col('Interiors',1,card(...data[3].slice(0,5)))}${col('Packaging',1,card(...data[4].slice(0,5)))}${col('Strategy',1,card(...data[5].slice(0,5)))}</div>
   <div class="m-table"><div class="m-th"><span></span><span>Client</span><span>Contact</span><span>Email</span><span>Service</span><span>Projects</span></div>${data.map(d=>row(...d)).join('')}</div>
  </div>
 </div>
 ${drawer('client',`${av('J','#2f6b4f')}Juniper Studio`,`<p class="m-meta">Company · <span class="m-pill">Branding</span> <span class="m-pill">Paid</span></p>
  <div class="m-btnrow">${ghost('mail','Email')}${ghost('note','Add note')}${ghost('plus','New')}</div>
  <p class="m-sub">Company details</p><dl class="m-dl"><dt>Contact</dt><dd>Sophie Chen</dd><dt>Email</dt><dd>sophie@juniper.example</dd><dt>Currency</dt><dd>EUR · Workspace default</dd></dl>
  <div class="m-tabs"><span class="on">Activity</span><span>Emails</span><span>Client portal</span><span>Notes</span><span>Related</span></div>
  <div class="m-feed"><div>${I('signature')}<span class="m-two"><b>Signed Brand identity agreement</b><span>By Sophie Chen</span></span><em>Nov 9</em></div><div>${I('documents')}<span class="m-two"><b>Published Juniper brand identity</b><span>Version 1</span></span><em>Nov 8</em></div><div>${I('note')}<span class="m-two"><b>Note added</b><span>2.5 hours logged on logo refinements</span></span><em>Nov 8</em></div><div>${I('money')}<span class="m-two"><b>Payment recorded · INV-001</b><span>€3,000 deposit</span></span><em>Oct 2</em></div></div>`)}`;
 },

 proposals:()=>`${top('documents','Proposals',ghost('play','Timer')+primary('plus','New proposal'))}
 <div class="m-body m-editor" data-step="1">
  <div class="m-card m-wb">
   <div class="m-wbhead"><b>Edit proposal</b>${chip('','Draft')}</div>
   <div class="m-steps"><button type="button" data-act="step" data-step="1"><i>1</i>Content</button><button type="button" class="hot" data-act="step" data-step="2"><i>2</i>Pricing</button><span><i>3</i>Design</span><span><i>4</i>Review</span></div>
   <div class="m-wbbody">
    <div class="m-form">
     <div class="m-pane" data-pane="1">
      <label>Proposal title<span class="m-input">Paper &amp; Pine brand refresh</span></label>
      <label>Content<span class="m-input tall">Develop the creative direction, refine the logo, and define colours and typography.</span></label>
      <label>Deliverables<span class="m-input tall m-delivs"><span class="m-dv">Brand strategy workshop</span></span></label>
      <div class="m-suggest"><span>Add</span><button type="button" class="hot" data-act="deliv" data-text="Logo and wordmark">${I('plus')}Logo and wordmark</button><button type="button" data-act="deliv" data-text="Colour palette">${I('plus')}Colour palette</button><button type="button" data-act="deliv" data-text="Brand guidelines">${I('plus')}Brand guidelines</button></div>
     </div>
     <div class="m-pane" data-pane="2">
      <label>Project fee (EUR)<span class="m-input">4,000</span></label>
      <p class="m-sub">Billing schedule</p>
      <div class="m-sched"><div><b>Deposit</b><span>On acceptance or signature</span><em>50%</em></div><div><b>Final payment</b><span>Issued from the project</span><em>50%</em></div></div>
      <p class="m-note">${I('check')}100% allocated · €4,000. The deposit invoice is created when the client accepts.</p>
     </div>
    </div>
    <div class="m-preview"><p class="m-sub">Document preview</p>
     <div class="m-paper"><span class="m-logo">M</span><b class="m-biz">Morgan Studio</b><p class="m-kick">Proposal</p><p class="m-doctitle">Paper &amp; Pine brand refresh</p><p class="m-for"><span>Prepared for <b>Paper &amp; Pine</b></span><span>Draft</span></p>
      <p class="m-h">Overview</p><p class="m-p">Develop the creative direction, refine the logo, and define colours and typography.</p>
      <p class="m-h">Deliverables</p><ul class="m-ul m-pdelivs"><li>Brand strategy workshop</li></ul>
      <div class="m-fee"><p class="m-h">Fee &amp; payment schedule</p><div><span>Total fee</span><b>€4,000</b></div><div><span>Deposit<small>On acceptance</small></span><b>€2,000</b></div><div><span>Final payment<small>On delivery</small></span><b>€2,000</b></div></div>
     </div></div>
   </div>
   <div class="m-wbfoot"><span class="m-stepof">Step <b data-stepn>1</b> of 4</span><span class="m-ghostbtn">Cancel</span><span class="m-ghostbtn">Save draft</span><button type="button" class="m-primary" data-act="step" data-step="2">Continue</button></div>
  </div>
 </div>`,

 contracts:()=>`${top('signature','Contracts',ghost('play','Timer')+primary('plus','New contract'))}
 <div class="m-body m-split">
  <div class="m-card m-side-list">
   <div class="m-lrow">${I('signature')}<span class="m-two"><b>Brand identity agreement</b><span>Juniper Studio</span></span>${chip('ok','Signed')}</div>
   <div class="m-lrow is-on">${I('signature')}<span class="m-two"><b>Website development agreement</b><span>Orbit</span></span><span class="m-swap" data-signed-chip>${chip('warn','Awaiting signature')}</span></div>
   <div class="m-lrow">${I('signature')}<span class="m-two"><b>Packaging terms</b><span>Ember Coffee</span></span>${chip('','Draft')}</div>
  </div>
  <div class="m-docwrap">
   <div class="m-docbar"><span class="m-viewas">Client view</span><span class="m-url">${I('external')}app.runonthrive.com/share/website-agreement</span><button type="button" class="m-ghostbtn" data-act="copy">${I('copy')}<span>Copy link</span></button></div>
   <div class="m-paper m-contract">
    <span class="m-logo">M</span><b class="m-biz">Morgan Studio</b><p class="m-kick">Contract</p><p class="m-doctitle">Website development agreement</p><p class="m-for"><span>Between <b>Morgan Studio</b> and <b>Orbit</b></span><span>Version 1</span></p>
    <ol class="m-terms"><li><b>Scope.</b> Design and build of the Orbit marketing website, as described in the accepted proposal.</li><li><b>Payment.</b> A 30% deposit on signature, then the milestones in the payment schedule.</li><li><b>Changes.</b> Work outside the scope is quoted separately before it starts.</li><li><b>Ownership.</b> The site and its files belong to Orbit once paid in full.</li></ol>
    <div class="m-signbox"><div class="m-sigline"><span>Client signature</span><b class="m-sig" data-sig>James Wilson</b></div>
     <div class="m-signrow" data-sign-row><span class="m-input" data-sign-input><span class="m-ph">Type your full name to sign</span></span><button type="button" class="m-primary hot" data-act="sign">${I('signature')}Sign contract</button></div>
     <p class="m-signed" data-signed>${I('check')}Signed by James Wilson on Nov 9, 2026 at 14:32</p></div>
   </div>
  </div>
 </div>`,

 invoices:()=>{
  const r=(n,client,initial,color,project,tone,status,amount,balance,due,extra='')=>`<div class="m-tr${extra}">${I('invoices')}<button type="button" class="m-inv" data-act="open" data-target="invoice">${n}</button><span class="m-pill">${av(initial,color)}${client}</span><span>${project}</span><span class="m-status">${chip(tone,status)}</span><span>${amount}</span><span class="m-bal">${balance}</span><span>${due}</span></div>`;
  return `${top('invoices','Invoices',ghost('play','Timer')+ghost('download','Export CSV')+primary('plus','New invoice'))}
 <div class="m-body m-flush">
  <div class="m-viewbar"><span class="m-viewname">${I('table')}All invoices ${I('down')}<em>6</em></span></div>
  <div class="m-tools"><span class="m-search">${I('search')}Search invoices…</span><span class="m-tool">${I('filter')}Filter</span><span class="m-tool">${I('sort')}Sort</span><span class="m-tool">${I('board')}Group by</span><span class="m-tool">${I('table')}Columns</span></div>
  <div class="m-table m-invtable"><div class="m-th"><span></span><span>Invoice</span><span>Client</span><span>Project</span><span>Status</span><span>Amount</span><span>Balance</span><span>Due date</span></div>
   ${r('INV-006','Orbit','O','#6750c9','Orbit website','warn','Outstanding','€8,831.40','€8,831.40','Nov 23',' m-target')}
   ${r('INV-001','Juniper Studio','J','#2f6b4f','Juniper brand identity','ok','Paid','€3,000','€0','Oct 2')}
   ${r('INV-002','Orbit','O','#6750c9','Orbit website','ok','Paid','€3,250','€0','Oct 4')}
   ${r('INV-003','Forma','F','#c0632b','The autumn edition','ok','Paid','€2,000','€0','Oct 8')}
   ${r('INV-004','Juniper Studio','J','#2f6b4f','Juniper brand identity','bad','Overdue','€1,800','€1,800','Oct 15')}
   ${r('INV-005','Orbit','O','#6750c9','Orbit website','bad','Overdue','€3,000','€3,000','Oct 24')}
  </div>
  <div class="m-tfoot"><span>6 invoices</span><span>Outstanding in view <b data-outstanding>€13,631.40</b></span><button type="button" class="m-primary hot" data-act="pay">${I('money')}Record payment on INV-006</button></div>
 </div>
 ${drawer('invoice','INV-006 · Client view',`<div class="m-paper m-invpaper"><div class="m-invtop"><span class="m-logo">M</span><span class="m-invlabel">Invoice<b>INV-006</b><em data-inv-state>Outstanding</em></span></div><b class="m-biz">Morgan Studio</b>
  <div class="m-billto"><div><span>Bill to</span><b>Orbit</b><span>james@orbit.example</span></div><div><span>Issued</span><b>Nov 9, 2026</b><span>Due Nov 23, 2026</span></div></div>
  <div class="m-lines"><div class="m-lh"><span>Description</span><span>Amount</span></div><div><span>Website design</span><span>€4,500.00</span></div><div><span>Development</span><span>€2,680.00</span></div><div><span>VAT 23%</span><span>€1,651.40</span></div><div class="m-ltotal"><span>Total · EUR</span><b>€8,831.40</b></div></div>
  <p class="m-h">How to pay</p><p class="m-p">Bank transfer to Morgan Studio, IBAN PT50 0000 0000 0000 0000 0000 0, reference INV-006.</p></div>`)}`;
 },

 time:()=>`${top('time','Time',ghost('money','Hourly rates')+ghost('plus','Log time')+primary('play','Start timer'))}
 <div class="m-body">
  <div class="m-tabs2"><span class="on">Day</span><span>Week</span><span>All entries</span></div>
  <div class="m-running"><span class="m-live"></span><span class="m-two"><b>Development</b><span>Orbit website · <span data-timer-label>Timer running</span></span></span><b class="m-clock big" data-clock>01:12:13</b><button type="button" class="m-btn hot" data-act="timer">${I('stop')}<span>Stop</span></button></div>
  <div class="m-week">${[['Mon',9,'5:45',1],['Tue',10,'0:00'],['Wed',11,'0:00'],['Thu',12,'0:00'],['Fri',13,'0:00'],['Sat',14,'0:00'],['Sun',15,'0:00']].map(([d,n,h,on])=>`<div class="${on?'on':''}"><span>${d} <i>${n}</i></span><b>${h}</b></div>`).join('')}</div>
  <div class="m-stat3"><div><span>Day total</span><b>5:45</b></div><div><span>Billable</span><b>5:45</b></div><div><span>Unbilled</span><b data-unbilled>5:45</b><button type="button" class="m-a hot" data-act="open" data-target="bill">Invoice unbilled time${I('arrow')}</button></div></div>
  <p class="m-sec">Entries <em>2 entries</em></p>
  <div class="m-card m-list">
   <div class="m-row">${I('clock')}<span class="m-two"><b>Development</b><span>Orbit · Orbit website · Navigation and responsive layout</span></span><span class="m-unb">${chip('warn','Unbilled')}</span><b>3:15</b></div>
   <div class="m-row">${I('clock')}<span class="m-two"><b>Design</b><span>Juniper Studio · Juniper brand identity · Logo refinements and lockups</span></span><span class="m-unb" data-drafted>${chip('warn','Unbilled')}</span><b>2:30</b></div>
  </div>
 </div>
 ${drawer('bill','Invoice unbilled time',`<label class="m-lab">Project<span class="m-input">Juniper brand identity · Juniper Studio${I('down')}</span></label>
  <p class="m-sub">Unbilled entries</p>
  <div class="m-checks"><div><i class="m-cb"></i><span class="m-two"><b>Logo refinements and lockups</b><span>Nov 9 · 2h 30m · €90 / hour</span></span><b>€225</b></div><div><i class="m-cb"></i><span class="m-two"><b>Creative direction and identity exploration</b><span>Oct 16 · 18h 30m · €90 / hour</span></span><b>€1,665</b></div></div>
  <p class="m-strong">2 selected · 21h · €1,890</p>
  <label class="m-lab">Add time to<span class="m-input">New invoice draft${I('down')}</span></label>`,
  `<span class="m-ghostbtn">Cancel</span><button type="button" class="m-primary hot" data-act="draft">Create invoice draft</button>`)}`,

 emails:()=>{
  const threads=[['t1','Juniper Studio','Nov 9, 8:27 AM','Logo lockups · final round','Hi Alex, Love them! Could we see the wordmark in the darker green too?','Juniper brand identity'],['t2','Northstar Labs','Nov 9, 5:27 AM','Seed-round launch site','Hi Alex, Thanks for the call today. Sharing our pitch deck and the two sites we like.','Northstar Labs website'],['t3','Ember Coffee','Nov 7, 11:27 AM','Seasonal packaging moodboard','Hi Alex, The winter moodboard is perfect. Can we add a version with the copper foil?','Ember seasonal packaging'],['t4','Bloom Florals','Nov 7, 8:27 AM','Subscription shop scope','Hi Alex, Looking forward to our call. We’d like weekly and monthly plans.','Bloom Florals shop']];
  const read={t1:['Sophie Chen','sophie@juniper.example','Juniper Studio','Juniper brand identity','Hi Alex,<br><br>Love them! Could we see the wordmark in the darker green too? Then we’re ready to sign off.<br><br>Sophie'],t2:['Priya Shah','priya@northstar.example','Northstar Labs','Northstar Labs website','Hi Alex,<br><br>Thanks for the call today. Sharing our pitch deck and the two sites we like. Could you send a proposal by Friday?<br><br>Priya'],t3:['Leo Marchetti','leo@embercoffee.example','Ember Coffee','Ember seasonal packaging','Hi Alex,<br><br>The winter moodboard is perfect. Can we add a version with the copper foil? Happy to pay for the extra round.<br><br>Leo'],t4:['Hana Ito','hana@bloom.example','Bloom Florals','Bloom Florals shop','Hi Alex,<br><br>Looking forward to our call. We’d like weekly and monthly plans, plus gift cards.<br><br>Hana']};
  const pane=id=>{const [name,email,client,project,body]=read[id];const t=threads.find(x=>x[0]===id);return `<div class="m-reader${id==='t1'?' is-on':''}" data-reader="${id}"><div class="m-rhead"><span class="m-two"><span>${client}</span><b class="m-subject">${t[3]}</b></span><button type="button" class="m-primary${id==='t2'?' hot':''}" data-act="reply">Reply</button><span class="m-ghostbtn">Archive</span></div><div class="m-linkbar"><span class="m-pill">${client}</span><span>Project</span><span class="m-select">${project}${I('down')}</span></div><div class="m-msg"><p class="m-from"><b>${name}</b><span>${email}</span><em>${t[2]}</em></p><p>${body}</p></div></div>`;};
  return `${top('messages','Emails',ghost('play','Timer')+primary('plus','Compose email'))}
 <div class="m-body m-flush">
  <div class="m-tabs2 pad"><span class="on">Inbox</span><span>Needs reply</span><span>All conversations</span><span>Sent</span><span>Drafts</span><span>Archived</span></div>
  <div class="m-mail">
   <div class="m-threads">${threads.map(([id,from,when,subject,snippet,project],i)=>`<button type="button" class="m-thread${i===0?' is-on':''}${id==='t2'?' hot':''}" data-act="thread" data-thread="${id}"><span class="m-tline"><b>${from}</b><em>${when}</em></span><b class="m-tsub">${subject}</b><span class="m-tsnip">${snippet}</span><span class="m-tproj">${project}</span></button>`).join('')}</div>
   <div class="m-readers">${Object.keys(read).map(pane).join('')}
    <div class="m-compose" aria-hidden="true"><div class="m-chead"><b>Reply to Priya Shah</b><span>Re: Seed-round launch site</span></div><p class="m-ctext"><span data-typed></span><i class="m-caret"></i></p><div class="m-cfoot"><span class="m-pill">Northstar Labs</span><span class="m-pill">Northstar Labs website</span><span class="m-ghostbtn">Save draft</span><span class="m-primary">Review &amp; send</span></div></div>
   </div>
  </div>
 </div>`;
 },

 scheduling:()=>`${top('scheduling','Scheduling',ghost('play','Timer')+primary('plus','New booking page'))}
 <div class="m-body m-split wide">
  <div>
   <p class="m-sec">Booking pages <em>3</em></p>
   <div class="m-card m-list">
    <div class="m-row">${I('video')}<span class="m-two"><b>Discovery call</b><span>30 min · Google Meet · Mon–Fri, 9:00–18:00</span></span><button type="button" class="m-ghostbtn hot" data-act="copy">${I('copy')}<span>Copy link</span></button></div>
    <div class="m-row">${I('location')}<span class="m-two"><b>Brand workshop</b><span>2 hours · In person, Lisbon</span></span><span class="m-ghostbtn">${I('copy')}<span>Copy link</span></span></div>
    <div class="m-row">${I('video')}<span class="m-two"><b>Project check-in</b><span>45 min · Google Meet</span></span><span class="m-ghostbtn">${I('copy')}<span>Copy link</span></span></div>
   </div>
   <p class="m-sec">Upcoming <em data-upcoming>4</em></p>
   <div class="m-card m-list m-upcoming">
    <div class="m-row m-new">${av('PS','#6750c9')}<span class="m-two"><b>Priya Shah · Discovery call</b><span>Thu, Nov 12 · 14:00 – 14:30 · Northstar Labs</span></span>${chip('ok','New')}</div>
    <div class="m-row">${av('SC','#2f6b4f')}<span class="m-two"><b>Sophie Chen · Project check-in</b><span>Tue, Nov 10 · 10:00 – 10:45 · Juniper Studio</span></span></div>
    <div class="m-row">${av('LM','#b5562c')}<span class="m-two"><b>Leo Marchetti · Brand workshop</b><span>Wed, Nov 11 · 9:30 – 11:30 · Ember Coffee</span></span></div>
    <div class="m-row">${av('HI','#b0457a')}<span class="m-two"><b>Hana Ito · Discovery call</b><span>Fri, Nov 13 · 11:00 – 11:30 · Bloom Florals</span></span></div>
   </div>
  </div>
  <div class="m-card m-bookwrap"><p class="m-sub">Booking page preview</p>
   <div class="m-paper m-booking">
    <div class="m-bhead"><span class="m-logo">M</span><span class="m-two"><b>Discovery call</b><span>30 minutes with Alex Morgan · Google Meet</span></span></div>
    <div class="m-days">${[['Mon','9'],['Tue','10'],['Wed','11'],['Thu','12',1],['Fri','13']].map(([d,n,on])=>`<span class="${on?'on':''}">${d}<b>${n}</b></span>`).join('')}</div>
    <p class="m-h">Thursday, November 12</p>
    <div class="m-slots"><button type="button" data-act="slot">9:00</button><span class="busy">10:30</span><button type="button" class="hot" data-act="slot">14:00</button><button type="button" data-act="slot">16:00</button><span class="busy">17:30</span></div>
    <p class="m-only">${I('calendar')}Only times you’re free in Google Calendar are offered.</p>
    <div class="m-booked">${I('check')}<span class="m-two"><b>You’re booked</b><span data-booked-at>Thursday, November 12 at 14:00</span></span></div>
   </div>
  </div>
 </div>`,

 workflows:()=>`${top('workflows','Workflows',ghost('play','Timer')+primary('plus','New workflow'))}
 <div class="m-body m-flow">
  <div class="m-canvas">
   <div class="m-node" data-node="1"><span class="m-nk">When</span><span class="m-two"><b>Proposal accepted</b><span>Any proposal, any client</span></span><i class="m-ok">${I('check')}</i></div>
   <span class="m-wire" data-wire="1"></span>
   <div class="m-node" data-node="2"><span class="m-nk">Then</span><span class="m-two"><b>Create a contract draft</b><span>From your standard terms, for the linked client</span></span><i class="m-ok">${I('check')}</i></div>
   <span class="m-wire" data-wire="2"></span>
   <div class="m-node" data-node="3"><span class="m-nk">Then</span><span class="m-two"><b>Draft a welcome email</b><span>Saved for your review, never sent on its own</span></span><i class="m-ok">${I('check')}</i></div>
  </div>
  <div class="m-card m-wfpanel">
   <label class="m-lab">Workflow name<span class="m-input">Contract after acceptance</span></label>
   <div class="m-toggle-row"><button type="button" class="m-toggle hot" data-act="toggle" aria-label="Active"><i></i></button><b data-active-label>Active</b><span>Runs on future matching changes</span></div>
   <p class="m-sub">Test with a record</p>
   <label class="m-lab">Sample record<span class="m-input">Juniper brand identity · Juniper Studio${I('down')}</span></label>
   <button type="button" class="m-primary hot" data-act="test">${I('play')}Test workflow</button>
   <p class="m-testres" data-test-result>${I('check')}Test passed: a contract draft and a welcome email draft for Juniper Studio. Nothing was saved.</p>
   <p class="m-note">77 triggers and 43 actions. One workflow can chain up to 20 actions.</p>
  </div>
 </div>`,
};

export const viewIds=Object.keys(views);

// Scale a fixed-size app to its window. On a phone it stays readable and scrolls sideways instead.
function fitWindow(root,width,panTo=0){
 const fit=()=>{const w=root.clientWidth,k=Math.max(w/width,w<700?.42:0);root.style.setProperty('--k',k.toFixed(4));root.classList.toggle('is-panned',k*width>w+1);};
 new ResizeObserver(fit).observe(root);fit();
 if(root.classList.contains('is-panned'))root.scrollLeft=panTo*parseFloat(root.style.getPropertyValue('--k'));
}

export function mountMiniApp(root,{onNavigate=()=>{}}={}){
 const app=root.querySelector('.m-app'),side=root.querySelector('.m-side'),panels=[...root.querySelectorAll('.m-view')];
 side.innerHTML=`<div class="m-brand"><img src="/favicon.svg" width="26" height="26" alt=""><span>thrive</span>${I('sidebar')}</div>
  <div class="m-searchbox">${I('search')}<span>Search</span><kbd>⌘ K</kbd></div>
  <nav class="m-nav">${nav.map(([group,items])=>`${group?`<p class="m-group">${group}</p>`:''}${items.map(([id,label,glyph])=>views[id]?`<button type="button" class="m-item" data-go="${id}" tabindex="-1">${I(glyph)}<span>${label}</span></button>`:`<span class="m-item">${I(glyph)}<span>${label}</span></span>`).join('')}`).join('')}
   <span class="m-dash"></span><span class="m-item m-custom">${I('settings')}<span>Customize</span></span></nav>
  <div class="m-sidefoot"><span class="m-item">${I('sparkles')}<span>Use with AI</span></span><span class="m-item">${I('gear')}<span>Settings</span></span><span class="m-gs"><b>Getting started</b><span>4/6</span></span><span class="m-me">${av('AM','#3d63ee')}<span class="m-two"><b>Alex Morgan</b><span>Morgan Studio</span></span>${I('notifications')}</span></div>`;
 panels.forEach(p=>{p.innerHTML=views[p.id.slice(2)]();});
 root.classList.add('is-live');

 fitWindow(root,1440,232);

 // Shared timer: the dock on Home and the Time page show the same running entry.
 let seconds=4333,running=true;
 const pad=n=>String(n).padStart(2,'0');
 const paint=()=>{const t=`${pad(Math.floor(seconds/3600))}:${pad(Math.floor(seconds/60)%60)}:${pad(seconds%60)}`;root.querySelectorAll('[data-clock]').forEach(c=>{c.textContent=t;});};
 setInterval(()=>{if(!running||document.hidden||!root.classList.contains('in-view'))return;seconds++;paint();},1000);

 let current=null;
 const used=el=>{el.closest('.hot')?.classList.remove('hot');el.classList.remove('hot');};
 const toast=(view,text)=>{const t=document.createElement('div');t.className='m-toast';t.innerHTML=`${I('check')}<span>${text}</span>`;view.append(t);setTimeout(()=>t.classList.add('out'),2400);setTimeout(()=>t.remove(),2800);};
 const open=(view,name)=>{view.querySelectorAll('.m-drawer').forEach(d=>{const on=d.dataset.drawer===name;d.classList.toggle('is-open',on);d.setAttribute('aria-hidden',String(!on));});view.classList.toggle('has-drawer',!!name);};
 function typeInto(el,text){let i=0;el.textContent='';const step=()=>{if(i>text.length)return;el.textContent=text.slice(0,i++);setTimeout(step,28+(i%5)*9);};step();}

 const acts={
  open:(b,view)=>open(view,b.dataset.target),
  close:(b,view)=>open(view,null),
  timer:(b,view)=>{running=!running;root.querySelectorAll('[data-act=timer]').forEach(t=>{t.innerHTML=running?`${I('stop')}<span>Stop</span>`:`${I('play')}<span>Start</span>`;t.classList.remove('hot');});root.classList.toggle('timer-stopped',!running);root.querySelectorAll('[data-timer-label]').forEach(l=>{l.textContent=running?'Timer running':'Stopped, 5:45 saved today';});},
  layout:(b,view)=>{const l=b.dataset.layout;view.querySelector('.m-layouts').dataset.layout=l;view.querySelectorAll('[data-act=layout]').forEach(x=>x.classList.toggle('is-on',x===b));},
  step:(b,view)=>{const s=b.dataset.step;const ed=view.querySelector('.m-editor');ed.dataset.step=s;view.querySelector('[data-stepn]').textContent=s;view.querySelectorAll('.m-steps [data-act=step]').forEach(x=>x.classList.remove('hot'));},
  deliv:(b,view)=>{const text=b.dataset.text;b.disabled=true;const add=(list,tag)=>{const el=document.createElement(tag);el.className='m-dv m-in';el.textContent=text;list.append(el);};add(view.querySelector('.m-delivs'),'span');add(view.querySelector('.m-pdelivs'),'li');},
  sign:(b,view)=>{b.disabled=true;const doc=view.querySelector('.m-contract');typeInto(view.querySelector('[data-sign-input]'),'James Wilson');setTimeout(()=>doc.classList.add('is-signing'),520);setTimeout(()=>{doc.classList.add('is-signed');view.querySelector('[data-signed-chip]').innerHTML=chip('ok','Signed');},1500);},
  copy:(b)=>{const label=b.querySelector('span');label.textContent='Copied';b.classList.add('is-done');setTimeout(()=>{label.textContent='Copy link';b.classList.remove('is-done');},1600);},
  pay:(b,view)=>{const row=view.querySelector('.m-target');row.querySelector('.m-status').innerHTML=chip('ok','Paid');row.querySelector('.m-bal').textContent='€0';row.classList.add('is-paid');view.querySelector('[data-outstanding]').textContent='€4,800.00';const state=view.querySelector('[data-inv-state]');state.textContent='Paid';state.style.color='var(--ok)';b.disabled=true;b.innerHTML=`${I('check')}Payment recorded`;toast(view,'Payment of €8,831.40 recorded on INV-006');},
  draft:(b,view)=>{open(view,null);view.querySelector('[data-unbilled]').textContent='3:15';view.querySelector('[data-drafted]').innerHTML=chip('info','In draft');view.querySelector('[data-target=bill]')?.classList.remove('hot');toast(view,'Invoice draft created for Juniper Studio, €1,890');},
  thread:(b,view)=>{view.querySelectorAll('.m-thread').forEach(t=>t.classList.toggle('is-on',t===b));view.querySelectorAll('.m-reader').forEach(r=>r.classList.toggle('is-on',r.dataset.reader===b.dataset.thread));view.querySelector('.m-compose').classList.remove('is-open');},
  reply:(b,view)=>{const reader=b.closest('.m-reader');if(reader.dataset.reader!=='t2'){view.querySelector('[data-thread=t2]').click();}const c=view.querySelector('.m-compose');c.classList.add('is-open');typeInto(c.querySelector('[data-typed]'),'Hi Priya, great talking today! The proposal is on its way, you’ll have it before Friday.');},
  slot:(b,view)=>{view.querySelectorAll('[data-act=slot]').forEach(s=>s.classList.toggle('is-on',s===b));view.querySelector('[data-booked-at]').textContent=`Thursday, November 12 at ${b.textContent}`;view.querySelector('.m-booking').classList.add('is-booked');const row=view.querySelector('.m-new');row.querySelector('.m-two span').textContent=`Thu, Nov 12 · ${b.textContent} · Northstar Labs`;view.querySelector('.m-upcoming').classList.add('has-new');view.querySelector('[data-upcoming]').textContent='5';},
  toggle:(b,view)=>{const off=b.classList.toggle('is-off');view.querySelector('[data-active-label]').textContent=off?'Paused':'Active';},
  test:(b,view)=>{const flow=view.querySelector('.m-flow');flow.classList.remove('is-tested');void flow.offsetWidth;flow.classList.add('is-testing');b.disabled=true;setTimeout(()=>{flow.classList.add('is-tested');flow.classList.remove('is-testing');b.disabled=false;},2300);},
 };
 root.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');if(go){onNavigate(go.dataset.go);return;}
  // A click on the dimmed page behind a drawer closes it.
  if(e.target.classList.contains('m-view')&&e.target.classList.contains('has-drawer')){open(e.target,null);return;}
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  const view=b.closest('.m-view');used(b);acts[b.dataset.act]?.(b,view);
 });
 return {
  show(id){current=id;side.querySelectorAll('[data-go]').forEach(b=>b.classList.toggle('is-on',b.dataset.go===id));},
  setInView(on){root.classList.toggle('in-view',on);},
  get current(){return current;},
 };
}

// ---- What clients see: the pages a client opens from a private link, at 1120×900. ----
// One status per document, shared by every place that shows it (the page, the portal and the
// cards beside the window). Colours follow meaning: waiting yellow, late red, done green.
const tone={'Awaiting response':'warn','Awaiting acceptance':'warn','Awaiting signature':'warn',Outstanding:'warn',Overdue:'bad',Declined:'bad',Paid:'ok',Signed:'ok',Accepted:'ok'};
const status=(doc,text)=>`<span class="m-chip ${tone[text]||''}" data-status="${doc}">${text}</span>`;
const chead=`<header class="c-head"><span class="c-biz"><b>Morgan Studio</b><span><svg class="m-i" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2"/><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/></svg>Private link for Juniper Studio</span></span><span class="m-logo">M</span></header>`;
const savePdf=`<span class="m-ghostbtn">${I('download')}Save PDF</span>`;
const paperHead=(kind,title)=>`<div class="c-brand"><span class="m-logo">M</span><b>Morgan Studio</b></div><p class="c-kick">${kind}</p><h3 class="c-title">${title}</h3><p class="c-for"><span>Prepared for <b>Juniper Studio</b></span><span>Version 1</span></p>`;
const go=(target,label)=>`<span class="c-go">${label}${I('arrow')}</span>`;
const clientViews={
 proposal:()=>`${chead}<div class="c-scroll"><div class="c-main">
  <div class="c-bar">${status('proposal','Awaiting response')}<span class="c-btns">${savePdf}</span></div>
  <article class="c-paper c-proposal">${paperHead('Proposal','Juniper brand identity')}
   <p class="c-h">Overview</p><p class="c-p">A visual identity for Juniper Studio: creative direction, a primary logo and supporting marks, a colour palette, typography and a short brand guide.</p>
   <p class="c-h">Payment schedule</p>
   <div class="c-rows"><div><span>Deposit<small>On acceptance · 50%</small></span><b>€3,000</b></div><div><span>Milestone payment<small>When the logo is approved · 30%</small></span><b>€1,800</b></div><div><span>Final payment<small>On delivery · 20%</small></span><b>€1,200</b></div></div>
   <div class="c-total"><span>Total</span><b>€6,000</b></div>
   <div class="c-respond"><p>Ready to go ahead?</p><span class="m-ghostbtn">Decline</span><button type="button" class="m-primary hot" data-act="accept">Accept proposal</button></div>
   <p class="c-done">${I('check')}Accepted by Sophie Chen on Nov 9, 2026. The deposit invoice is on its way.</p>
  </article></div></div>`,
 contract:()=>`${chead}<div class="c-scroll"><div class="c-main">
  <div class="c-bar">${status('contract','Awaiting response')}<span class="c-btns">${savePdf}</span></div>
  <article class="c-paper c-contract">${paperHead('Contract','Brand identity agreement')}
   <p class="c-h">Deliverables</p><ul class="c-ul"><li>Primary logo and supporting marks</li><li>Colour palette and typography</li><li>Brand guide (PDF)</li></ul>
   <p class="c-h">Terms</p><p class="c-p">€6,000 in three payments: €3,000 on signature, €1,800 when the logo is approved and €1,200 on delivery. Two rounds of revisions at each stage. The final files belong to Juniper Studio once paid in full.</p>
   <div class="c-sign"><div class="c-sigline"><span>Signature</span><b class="c-sig">Sophie Chen</b></div>
    <div class="c-signrow"><span class="m-input" data-sign-input><span class="m-ph">Type your full name</span></span><button type="button" class="m-primary hot" data-act="csign">Sign contract</button></div>
    <p class="c-done">${I('check')}Signed by Sophie Chen on Nov 9, 2026 at 14:32</p></div>
  </article></div></div>`,
 invoice:()=>`${chead}<div class="c-scroll"><div class="c-main">
  <div class="c-bar">${status('invoice','Outstanding')}<span class="c-btns">${savePdf}<button type="button" class="m-primary hot" data-act="paylink">Pay invoice</button></span></div>
  <article class="c-paper c-invoice">
   <div class="c-invtop"><div class="c-brand"><span class="m-logo">M</span><b>Morgan Studio</b></div><p class="c-invno"><span>Invoice</span><b>INV-001</b></p></div>
   <div class="c-rule"></div>
   <div class="c-meta"><div><span class="c-label">Bill to</span><b>Juniper Studio</b><span>sophie@juniper.example</span></div><dl><dt>Issued</dt><dd>Nov 9, 2026</dd><dt>Due</dt><dd>Nov 23, 2026</dd><dt>Project</dt><dd>Juniper brand identity</dd></dl></div>
   <div class="c-lines"><div class="c-lh"><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span></div><div><span>Deposit, brand identity<small>50% of the €6,000 fee</small></span><span>1</span><span>€3,000</span><span>€3,000</span></div></div>
   <div class="c-sum"><div><span>Subtotal</span><span>€3,000</span></div><div><span>Tax</span><span>€0</span></div><div class="c-grand"><span>Total · EUR</span><b>€3,000</b></div></div>
   <div class="c-pay" data-pay><p class="c-h">Payment instructions</p><p class="c-p">Bank transfer to Morgan Studio<br>IBAN PT50 0000 0000 0000 0000 0000 0<br>Reference INV-001</p></div>
  </article></div></div>`,
 portal:()=>`${chead}<div class="c-scroll"><div class="c-main">
  <p class="c-ptitle">Juniper Studio × Morgan Studio</p>
  <p class="c-sec">Needs your attention <em data-count="todo">3</em></p>
  <div class="c-list" data-list="todo">
   <button type="button" class="c-item hot" data-act="go" data-target="proposal"><span class="c-ic">${I('documents')}</span><span class="m-two"><b>Juniper brand identity</b><span>Proposal · Version 1</span></span>${status('proposal','Awaiting acceptance')}${go('proposal','Review')}</button>
   <button type="button" class="c-item" data-act="go" data-target="contract"><span class="c-ic">${I('signature')}</span><span class="m-two"><b>Brand identity agreement</b><span>Contract · Version 1</span></span>${status('contract','Awaiting signature')}${go('contract','Review')}</button>
   <button type="button" class="c-item" data-act="go" data-target="invoice"><span class="c-ic">${I('invoices')}</span><span class="m-two"><b>INV-001</b><span>€3,000 outstanding</span></span>${status('invoice','Outstanding')}${go('invoice','Pay invoice')}</button>
  </div>
  <p class="c-sec">Projects <em>1</em></p>
  <div class="c-list"><div class="c-item"><span class="c-ic">${I('projects')}</span><span class="m-two"><b>Juniper brand identity</b><span>In progress · Target Oct 28, 2026</span></span></div></div>
  <div class="c-done-sec" hidden><p class="c-sec">Other shared items <em data-count="done">0</em></p><div class="c-list" data-list="done"></div></div>
 </div></div>`,
};

export function mountClientPages(root,{onNavigate=()=>{},onStatus=()=>{}}={}){
 const views=[...root.querySelectorAll('.c-view')];
 views.forEach(v=>{v.innerHTML=clientViews[v.id.replace('sheet-','')]();});
 root.classList.add('is-live');
 fitWindow(root,1120);
 const set=(doc,text)=>{root.querySelectorAll(`[data-status="${doc}"]`).forEach(c=>{c.className=`m-chip ${tone[text]||''}`;c.textContent=text;});onStatus(doc,text,tone[text]||'');};
 function typeInto(el,text,done){let i=0;el.textContent='';const step=()=>{el.textContent=text.slice(0,i++);i<=text.length?setTimeout(step,32):done?.();};step();}
 // A document the client has answered leaves "Needs your attention" for "Other shared items".
 const settle=doc=>{const row=root.querySelector(`.c-item[data-target="${doc}"]`);if(!row)return;row.querySelector('.c-go').firstChild.textContent='View';row.classList.remove('hot');
  root.querySelector('[data-list=done]').append(row);root.querySelector('.c-done-sec').hidden=false;
  for(const name of ['todo','done'])root.querySelector(`[data-count=${name}]`).textContent=root.querySelector(`[data-list=${name}]`).children.length;};
 const acts={
  accept:(b,view)=>{view.querySelector('.c-paper').classList.add('is-done');set('proposal','Accepted');settle('proposal');},
  csign:(b,view)=>{b.disabled=true;const paper=view.querySelector('.c-paper');typeInto(view.querySelector('[data-sign-input]'),'Sophie Chen',()=>{paper.classList.add('is-signing');setTimeout(()=>{paper.classList.add('is-done');set('contract','Signed');settle('contract');},900);});},
  // Clients can't pay online yet: "Pay invoice" takes them to how to pay.
  paylink:(b,view)=>{const box=view.querySelector('[data-pay]'),scroller=view.querySelector('.c-scroll');scroller.scrollTo({top:box.offsetTop-24,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});box.classList.remove('is-flash');void box.offsetWidth;box.classList.add('is-flash');},
  go:b=>onNavigate(b.dataset.target),
 };
 root.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;b.classList.remove('hot');acts[b.dataset.act]?.(b,b.closest('.c-view'));});
 return {setInView(on){root.classList.toggle('in-view',on);}};
}
