// Thrive's email layout for messages Thrive itself sends (summaries, notices). Tables and inline
// styles so Gmail, Outlook and Apple Mail render it alike. Pure: returns HTML; every value is escaped here.
const C={canvas:'#f6f7f9',card:'#ffffff',line:'#e3e6eb',rule:'#edf0f3',text:'#20242d',muted:'#626a78',link:'#3154d5',action:'#3d63ee',negative:'#b33b37',negativeBg:'#fff0ed',warning:'#925d15',warningBg:'#fff7e8'};
const FONT="Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const TONES={negative:[C.negative,C.negativeBg],warning:[C.warning,C.warningBg]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=v=>/^https?:\/\/[^\s"'<>]+$/i.test(String(v||''))?esc(v):'';
const type=(size,line,weight=400,color=C.text)=>`font-family:${FONT};font-size:${size}px;line-height:${line}px;font-weight:${weight};color:${color};`;
const table=(inner,style='')=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${style}">${inner}</table>`;

function badge(label,tone){const [fg,bg]=TONES[tone]||[C.muted,C.canvas];return `<span style="display:inline-block;margin-right:8px;padding:1px 6px;border-radius:4px;background:${bg};${type(11,16,500,fg)}">${esc(label)}</span>`;}

function row(r){
 const cell=`padding:10px 0;border-top:1px solid ${C.rule};vertical-align:middle;`;
 return `<tr><td style="${cell}${type(13,18,500)}">${esc(r.title)}${r.detail?`<div style="margin-top:2px;${type(12,16,400,C.muted)}">${esc(r.detail)}</div>`:''}</td>`
  +`<td align="right" style="${cell}padding-left:16px;white-space:nowrap;font-variant-numeric:tabular-nums;${type(13,18)}">${r.flag?badge(r.flag,r.tone):''}${esc(r.value||'')}</td></tr>`;
}

function section(s){
 const link=url(s.href)?`<a href="${url(s.href)}" style="text-decoration:none;${type(13,20,500,C.link)}">View all&nbsp;&rarr;</a>`:'';
 const more=s.more?`<tr><td colspan="2" style="padding:10px 0 0;border-top:1px solid ${C.rule};${type(12,16,400,C.muted)}">and ${esc(s.more)} more</td></tr>`:'';
 return `<tr><td style="padding-top:28px;">${table(`<tr><td style="padding:0 0 8px;${type(14,20,600)}">${esc(s.title)}${s.count?`<span style="padding-left:6px;${type(14,20,400,C.muted)}">${esc(s.count)}</span>`:''}</td><td align="right" style="padding:0 0 8px;">${link}</td></tr>${(s.rows||[]).map(row).join('')}${more}`)}</td></tr>`;
}

export function emailLayout({origin='',title,meta='',preheader='',sections=[],action=null,footer=''}={}){
 const home=url(origin),logo=home?`${home}/apple-touch-icon.png`:'',settings=home?`${home}/#settings/notifications`:'';
 const brand=`<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${logo?`<td style="padding-right:8px;vertical-align:middle;"><img src="${logo}" width="26" height="26" alt="" style="display:block;border:0;border-radius:7px;"></td>`:''}<td style="vertical-align:middle;letter-spacing:-0.02em;${type(19,26,650)}">thrive</td></tr></table>`;
 const button=action&&url(action.href)?`<tr><td style="padding-top:32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:6px;background:${C.action};"><a href="${url(action.href)}" style="display:inline-block;padding:9px 16px;border-radius:6px;text-decoration:none;${type(13,18,600,'#ffffff')}">${esc(action.label)}</a></td></tr></table></td></tr>`:'';
 const card=`<h1 style="margin:0;letter-spacing:-0.02em;${type(22,28,600)}">${esc(title)}</h1>${meta?`<p style="margin:4px 0 0;${type(13,18,400,C.muted)}">${esc(meta)}</p>`:''}${table(sections.map(section).join('')+button)}`;
 const foot=`${esc(footer)}${settings?`${footer?' · ':''}<a href="${settings}" style="color:${C.muted};text-decoration:underline;">Notification settings</a>`:''}`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title><style>@media (max-width:600px){.thrive-card{padding:24px 20px!important}.thrive-outer{padding:20px 12px!important}}</style></head>`
  +`<body style="margin:0;padding:0;background:${C.canvas};-webkit-text-size-adjust:100%;">`
  +(preheader?`<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;font-size:1px;line-height:1px;color:${C.canvas};">${esc(preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>`:'')
  +table(`<tr><td align="center" class="thrive-outer" style="padding:32px 16px;">${table(`<tr><td style="padding:0 2px 20px;">${home?`<a href="${home}" style="text-decoration:none;">${brand}</a>`:brand}</td></tr><tr><td class="thrive-card" style="background:${C.card};border:1px solid ${C.line};border-radius:10px;padding:32px;">${card}</td></tr><tr><td style="padding:20px 2px 0;${type(12,18,400,C.muted)}">${foot}</td></tr>`,'max-width:560px;')}</td></tr>`,`background:${C.canvas};`)
  +`</body></html>`;
}
