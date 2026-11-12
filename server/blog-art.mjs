// Blog card illustrations: one small scene per article, drawn as inline SVG (no text, so every language
// shares it). Colors come from CSS custom properties (public/blog.css), so they follow light and dark mode;
// --c is the article's accent.
const ART={
 'how-to-invoice-clients':{color:'#3d63ee',draw:invoice},
 'proposals-and-contracts':{color:'#7c5cff',draw:proposal},
 'generate-leads-with-forms':{color:'#f08a3c',draw:leads},
 'automate-busy-work':{color:'#12a594',draw:workflows},
 'time-tracking-for-freelancers':{color:'#e5a000',draw:time},
 'how-to-price-freelance-work':{color:'#22a06b',draw:pricing},
 'client-portals':{color:'#0b93d6',draw:portal},
 'run-your-business-with-ai':{color:'#d9468f',draw:ai},
 'onboard-new-clients':{color:'#9b51e0',draw:onboarding},
 'book-client-calls':{color:'#0fa5b8',draw:booking},
 'manage-multiple-projects':{color:'#5b5bd6',draw:board},
 'weekly-admin-routine':{color:'#e5484d',draw:routine},
 'simple-crm-for-freelancers':{color:'#65a30d',draw:crm},
};
const FALLBACK={color:'#3d63ee',draw:proposal};

const paper=(x,y,w,h,r=12,extra='')=>`<rect x="${x+3}" y="${y+6}" width="${w}" height="${h}" rx="${r}" fill="var(--art-shadow)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="var(--art-paper)" stroke="var(--art-line)"${extra}/>`;
const line=(x,y,w,h=6,o='.16')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" fill="var(--art-ink)" opacity="${o}"/>`;
const accent=(x,y,w,h=6,r=h/2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="var(--c)"/>`;
const tint=(x,y,w,h,r=8)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="var(--c)" opacity=".14"/>`;
const badge=(cx,cy,r,inner,fill='var(--c)')=>`<circle cx="${cx}" cy="${cy+3}" r="${r}" fill="var(--art-shadow)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/><g transform="translate(${cx} ${cy})" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
const CHECK='<path d="M-8 0l5 5 10-11"/>';
const sparkle=(x,y,s,fill='var(--c)')=>`<path transform="translate(${x} ${y}) scale(${s})" fill="${fill}" d="M0-16C2-5 5-2 16 0 5 2 2 5 0 16-2 5-5 2-16 0-5-2-2-5 0-16Z"/>`;
const person=(cx,cy,r,o)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--c)" opacity="${o}"/><circle cx="${cx}" cy="${cy-r*.22}" r="${r*.3}" fill="#fff"/><path d="M${cx-r*.52} ${cy+r*.55}a${r*.52} ${r*.42} 0 0 1 ${r*1.04} 0" fill="#fff"/>`;

function invoice(){
 const rows=[0,1,2,3].map(i=>line(138,112+i*19,78)+line(232,112+i*19,30,6,'.24')).join('');
 return `<g transform="rotate(-4 200 135)">${paper(118,38,164,196)}${accent(136,58,26,26,7)}${line(172,61,74)}${line(172,74,46)}${line(136,96,48,5,'.1')}${rows}<rect x="136" y="190" width="128" height="1.5" fill="var(--art-line)"/>${line(136,203,40)}${accent(212,201,52,11,5.5)}</g>${badge(292,70,26,CHECK,'#1f9d63')}<circle cx="100" cy="183" r="24" fill="var(--c)"/><text x="100" y="192" text-anchor="middle" font-size="26" font-weight="700" fill="#fff" font-family="Inter,system-ui,sans-serif">&#8364;</text>`;
}
function proposal(){
 return `<g transform="rotate(6 230 140)">${paper(168,52,140,176)}${line(186,74,70)}${line(186,92,100)}${line(186,108,86)}${line(186,124,94)}</g><g transform="rotate(-3 180 130)">${paper(104,36,156,190)}${accent(122,56,64,9)}${line(122,78,112)}${line(122,94,98)}${line(122,110,108)}${tint(122,128,118,30,7)}${line(130,139,56,5,'.22')}<path d="M126 196c8-20 16-22 20-4s10 12 16-4 12-10 18 2 8 4 14-6" fill="none" stroke="var(--c)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="122" y="204" width="118" height="1.5" fill="var(--art-line)"/></g>${badge(282,66,24,CHECK,'#1f9d63')}`;
}
function leads(){
 const fields=[0,1,2].map(i=>line(150,70+i*38,40,5,'.22')+`<rect x="150" y="${80+i*38}" width="132" height="20" rx="6" fill="var(--art-bg)" stroke="var(--art-line)"/>`).join('');
 return `<path d="M96 78C122 82 122 104 146 108M86 140h56M104 196c22-6 26-28 42-34" fill="none" stroke="var(--c)" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round" opacity=".7"/>${person(88,74,20,'.95')}${person(72,140,17,'.7')}${person(98,200,15,'.5')}${paper(134,30,168,200)}${accent(150,48,74,9)}${fields}${accent(150,196,84,20,7)}${badge(304,52,20,'<path d="M0-8v16M-8 0h16"/>')}`;
}
function workflows(){
 const node=(x,y,w,icon)=>`${paper(x,y,w,58,12)}<rect x="${x+12}" y="${y+14}" width="30" height="30" rx="8" fill="var(--c)"/><g transform="translate(${x+27} ${y+29})" fill="#fff">${icon}</g>${line(x+52,y+20,w-70)}${line(x+52,y+33,w-90,5,'.1')}`;
 return `<path d="M164 125h20c18 0 18-46 36-46h6M184 125c18 0 18 46 36 46h6" fill="none" stroke="var(--c)" stroke-width="2.5" stroke-linecap="round"/><circle cx="164" cy="125" r="4" fill="var(--c)"/><circle cx="226" cy="79" r="4" fill="var(--c)"/><circle cx="226" cy="171" r="4" fill="var(--c)"/>${node(54,96,112,'<path d="M3-11-6 2h6l-3 10 9-14H0z"/>')}${node(226,50,124,'<path d="M-7-6h14v12H-7z" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M-7-6l7 6 7-6" fill="none" stroke="#fff" stroke-width="2.4"/>')}${node(226,142,124,'<path d="M-6-9h9l4 4v14h-13z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>')}`;
}
function time(){
 const ticks=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,r1=58,r2=i%3?52:47;return `<line x1="${(140+Math.sin(a)*r1).toFixed(1)}" y1="${(132-Math.cos(a)*r1).toFixed(1)}" x2="${(140+Math.sin(a)*r2).toFixed(1)}" y2="${(132-Math.cos(a)*r2).toFixed(1)}" stroke="var(--art-ink)" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>`;}).join('');
 const bars=[34,58,46,74,52].map((h,i)=>`<rect x="${252+i*20}" y="${196-h}" width="12" height="${h}" rx="4" fill="var(--c)" opacity="${i===3?1:.35}"/>`).join('');
 return `<rect x="130" y="44" width="20" height="16" rx="4" fill="var(--c)"/><rect x="136" y="56" width="8" height="10" fill="var(--c)"/><circle cx="140" cy="135" r="72" fill="var(--art-shadow)"/><circle cx="140" cy="132" r="72" fill="var(--art-paper)" stroke="var(--art-line)"/>${ticks}<path d="M140 74a58 58 0 0 1 55 41" fill="none" stroke="var(--c)" stroke-width="8" stroke-linecap="round"/><line x1="140" y1="132" x2="140" y2="94" stroke="var(--art-ink)" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/><line x1="140" y1="132" x2="170" y2="146" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><circle cx="140" cy="132" r="6" fill="var(--c)"/>${paper(238,64,124,150)}${line(252,82,56)}${line(252,96,34,5,'.1')}${bars}`;
}
function pricing(){
 const card=(x,y,h,hi)=>`${paper(x,y,84,h,12,hi?' stroke-width="2.5" style="stroke:var(--c)"':'')}${hi?accent(x+14,y+18,30,8):line(x+14,y+18,30)}${line(x+14,y+36,50,10,hi?'.5':'.26')}${[0,1,2].map(i=>`<circle cx="${x+18}" cy="${y+66+i*18}" r="4" fill="var(--c)" opacity="${hi?1:.4}"/>${line(x+28,y+63+i*18,40)}`).join('')}${hi?accent(x+14,y+h-30,56,16,6):`<rect x="${x+14}" y="${y+h-30}" width="56" height="16" rx="6" fill="none" stroke="var(--art-line)"/>`}`;
 return `${card(62,92,128,false)}${card(254,96,124,false)}${card(158,56,166,true)}${badge(242,58,18,'',`var(--c)`)}${sparkle(242,58,.55,'#fff')}`;
}
function portal(){
 const tile=(x,y,kind)=>`<rect x="${x}" y="${y}" width="66" height="48" rx="9" fill="var(--art-bg)" stroke="var(--art-line)"/>${kind==='folder'?`<path d="M${x+18} ${y+14}h10l4 4h16v16h-30z" fill="var(--c)" opacity=".85"/>`:`<path d="M${x+24} ${y+11}h12l6 6v20h-18z" fill="var(--art-paper)" stroke="var(--c)" stroke-width="2" stroke-linejoin="round"/>${accent(x+28,y+24,10,3)}`}`;
 return `${paper(64,36,272,190,14)}<rect x="64" y="36" width="272" height="34" rx="14" fill="var(--c)" opacity=".1"/>${[0,1,2].map(i=>`<circle cx="${84+i*14}" cy="53" r="4" fill="var(--art-ink)" opacity=".25"/>`).join('')}<rect x="140" y="44" width="150" height="18" rx="9" fill="var(--art-paper)" stroke="var(--art-line)"/><path d="M152 52v-2a4 4 0 0 1 8 0v2" fill="none" stroke="var(--c)" stroke-width="2"/><rect x="150" y="52" width="12" height="7" rx="2" fill="var(--c)"/>${line(168,50,90)}${tile(84,88,'folder')}${tile(160,88,'doc')}${tile(236,88,'doc')}${tile(84,150,'doc')}${tile(160,150,'folder')}${tile(236,150,'doc')}${badge(330,190,20,CHECK,'#1f9d63')}`;
}
function ai(){
 return `${paper(56,52,184,62,16)}${line(76,72,120)}${line(76,88,84)}<path d="M78 114l-6 16 22-16z" fill="var(--art-paper)" stroke="var(--art-line)"/><rect x="74" y="112" width="24" height="4" fill="var(--art-paper)"/><rect x="153" y="139" width="190" height="68" rx="16" fill="var(--art-shadow)"/><rect x="150" y="133" width="190" height="68" rx="16" fill="var(--c)"/><path d="M314 201l10 16-24-16z" fill="var(--c)"/>${[0,1,2].map(i=>`<rect x="170" y="${152+i*15}" width="${[132,150,96][i]}" height="6" rx="3" fill="#fff" opacity="${[.95,.7,.7][i]}"/>`).join('')}${sparkle(292,70,1.5)}${sparkle(330,104,.7)}${sparkle(96,176,.8)}${sparkle(260,46,.5)}`;
}
const tick=(cx,cy,on)=>on?`<circle cx="${cx}" cy="${cy}" r="9" fill="var(--c)"/><path d="M${cx-4} ${cy}l3 3 5-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`:`<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="var(--art-line)" stroke-width="2"/>`;
const CLOCK='<circle r="9" stroke-width="3"/><path d="M0-5v5l4 3" stroke-width="3"/>';
// A welcome checklist: three steps done, one to go, and the new client waving in.
function onboarding(){
 const rows=[0,1,2,3].map(i=>`${tick(156,94+i*32,i<3)}${line(176,91+i*32,[96,74,108,62][i],6,i<3?'.22':'.12')}`).join('');
 return `${paper(130,38,176,190,14)}${accent(148,56,70,9)}${line(148,72,44,5,'.1')}${rows}${person(96,92,26,'.95')}${badge(306,48,20,'<path d="M0-8v16M-8 0h16"/>')}`;
}
// A week of slots with one booked, and a clock.
function booking(){
 const slots=[0,1,2,3,4].flatMap(c=>[0,1,2].map(r=>{const x=126+c*36,y=104+r*30,on=c===2&&r===1;return on?`<rect x="${x}" y="${y}" width="28" height="22" rx="6" fill="var(--c)"/><path d="M${x+9} ${y+11}l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`:`<rect x="${x}" y="${y}" width="28" height="22" rx="6" fill="var(--c)" opacity="${(c+r)%3?'.12':'.24'}"/>`;})).join('');
 return `${paper(108,40,200,180,14)}<rect x="108" y="40" width="200" height="40" rx="14" fill="var(--c)" opacity=".12"/>${line(126,56,70,7,'.22')}${[0,1,2,3,4].map(i=>line(132+i*36,88,16,5,'.14')).join('')}${slots}${badge(306,190,22,CLOCK)}`;
}
// A board: three stage columns with project cards, one card mid-move.
function board(){
 const card=(x,y,w,o)=>`<rect x="${x}" y="${y}" width="${w}" height="34" rx="8" fill="var(--art-paper)" stroke="var(--art-line)"/>${accent(x+10,y+10,22,6)}${line(x+10,y+21,w-36,5,o)}`;
 const col=(x,n)=>`<rect x="${x}" y="58" width="92" height="160" rx="12" fill="var(--c)" opacity=".12"/>${line(x+12,70,40,6,'.22')}${Array.from({length:n},(_,i)=>card(x+8,88+i*42,76,'.14')).join('')}`;
 return `${col(62,3)}${col(162,2)}${col(262,1)}<g transform="rotate(-6 262 160)"><rect x="232" y="143" width="78" height="36" rx="8" fill="var(--art-shadow)"/>${card(228,138,78,'.18')}</g>`;
}
// The week with Friday picked out, and a short routine ticked off.
function routine(){
 const days=[0,1,2,3,4].map(i=>i===4?`<rect x="${70+i*30}" y="56" width="24" height="34" rx="8" fill="var(--c)"/><circle cx="${82+i*30}" cy="80" r="3" fill="#fff"/>`:`<rect x="${70+i*30}" y="56" width="24" height="34" rx="8" fill="var(--c)" opacity=".14"/>`).join('');
 const rows=[0,1,2].map(i=>`${tick(214,126+i*30,i<2)}${line(232,123+i*30,[78,64,88][i],6,i<2?'.22':'.12')}`).join('');
 return `${days}${paper(190,92,150,128,14)}${accent(206,106,52,7)}${rows}${badge(110,166,34,`<g transform="scale(1.6)" stroke-width="2.2">${CLOCK.replaceAll(' stroke-width="3"','')}</g>`)}`;
}
// Client cards in a stack, with a returning client highlighted.
function crm(){
 const cardRow=(x,y,o,hi)=>`${paper(x,y,190,52,12,hi?' stroke-width="2" style="stroke:var(--c)"':'')}${person(x+26,y+26,16,hi?'.95':'.4')}${line(x+52,y+16,hi?96:80,7,hi?'.26':'.16')}${line(x+52,y+31,60,5,o)}${hi?accent(x+140,y+28,34,10,5):`<rect x="${x+140}" y="${y+28}" width="34" height="10" rx="5" fill="var(--art-ink)" opacity=".1"/>`}`;
 return `${cardRow(96,48,'.1',false)}${cardRow(116,104,'.14',true)}${cardRow(96,160,'.1',false)}${badge(316,108,20,'<path d="M0 7C-9 1-9-6-4-7c2 0 3 1 4 3 1-2 2-3 4-3 5 1 5 8-4 14z" fill="#fff" stroke="none"/>')}`;
}

export function blogArt(slug){
 const {color,draw}=ART[slug]||FALLBACK;
 const id='dots-'+slug.replace(/[^a-z0-9-]/g,'');
 return `<span class="blog-art" style="--c:${color}" aria-hidden="true"><svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" focusable="false"><defs><pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="var(--c)" opacity=".18"/></pattern></defs><rect width="400" height="250" fill="var(--art-bg)"/><rect width="400" height="250" fill="url(#${id})"/><circle cx="360" cy="10" r="110" fill="var(--c)" opacity=".12"/><circle cx="20" cy="250" r="90" fill="var(--c)" opacity=".08"/>${draw()}</svg></span>`;
}
export const blogArtColor=slug=>(ART[slug]||FALLBACK).color;
