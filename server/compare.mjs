// Comparison pages on the public site: runonthrive.com/compare (the hub) and /compare/thrive-vs-<product>,
// with other languages under /compare/<language>/… like the blog. Pages live in
// content/compare/thrive-vs-<product>/<language>.html (content/compare/BRIEF.md): a meta comment with JSON
// (name, site, logo, title, description, lede, checked, date), then the body. The page around it, the logos,
// the buttons, the call to action and the trademark note come from here; the shell is the blog's.
import {BLOG_LANGUAGES,languageMenu,page,cta,renderShots,blogText} from './blog.mjs';

export const COMPARE_ORDER=['thrive-vs-honeybook','thrive-vs-dubsado','thrive-vs-plutio','thrive-vs-moxie','thrive-vs-17hats','thrive-vs-bloom','thrive-vs-suitedash','thrive-vs-freshbooks','thrive-vs-indy','thrive-vs-agiled'];

const T={
 en:{hubTitle:'Compare Thrive',hubLede:'Honest, side-by-side comparisons between Thrive and the other tools freelancers and small studios use. Where they do more than Thrive, we say so.',hubMeta:'Thrive compared with HoneyBook, Dubsado, Plutio and other client-management tools for freelancers: features, prices and limits, checked on each product’s website.',vs:'Thrive vs {name}',all:'All comparisons',checked:'Last checked: {date}. Prices and features of {name} come from its own website.',visit:'Visit {domain}',trial:'Start your free trial',read:'Read the comparison',more:'More comparisons',tm:'{name} and its logo are trademarks of their owner, shown only to identify the product. Thrive is not affiliated with or endorsed by {name}.',tmHub:'Product names and logos are trademarks of their owners, shown only to identify each product. Thrive is not affiliated with or endorsed by them.',logo:'{name} logo'},
 de:{hubTitle:"Thrive im Vergleich",hubLede:"Ehrliche Vergleiche zwischen Thrive und den anderen Tools, die Freelancer und kleine Studios nutzen. Wo sie mehr können als Thrive, sagen wir es.",hubMeta:"Thrive im Vergleich mit HoneyBook, Dubsado, Plutio und anderen Tools für Freelancer: Funktionen, Preise und Grenzen, geprüft auf der Website jedes Anbieters.",vs:"Thrive vs {name}",all:"Alle Vergleiche",checked:"Zuletzt geprüft: {date}. Preise und Funktionen von {name} stammen von der eigenen Website.",visit:"{domain} besuchen",trial:"Kostenlos testen",read:"Zum Vergleich",more:"Weitere Vergleiche",tm:"{name} und das Logo sind Marken ihres Inhabers und werden nur zur Kennzeichnung des Produkts gezeigt. Thrive ist nicht mit {name} verbunden und wird nicht von {name} unterstützt.",tmHub:"Produktnamen und Logos sind Marken ihrer Inhaber und werden nur zur Kennzeichnung der Produkte gezeigt. Thrive ist mit ihnen nicht verbunden und wird nicht von ihnen unterstützt.",logo:"Logo von {name}"},
 fr:{hubTitle:"Thrive face aux autres outils",hubLede:"Des comparatifs honnêtes entre Thrive et les autres outils des freelances et petits studios. Quand ils font plus que Thrive, nous le disons.",hubMeta:"Thrive comparé à HoneyBook, Dubsado, Plutio et d’autres outils pour freelances : fonctionnalités, prix et limites, vérifiés sur le site de chaque produit.",vs:"Thrive vs {name}",all:"Tous les comparatifs",checked:"Dernière vérification : {date}. Les prix et fonctionnalités de {name} viennent de son propre site.",visit:"Visiter {domain}",trial:"Essayer gratuitement",read:"Lire le comparatif",more:"Autres comparatifs",tm:"{name} et son logo sont des marques de leur propriétaire, montrées uniquement pour identifier le produit. Thrive n’est ni affilié à {name}, ni soutenu par {name}.",tmHub:"Les noms et logos des produits sont des marques de leurs propriétaires, montrées uniquement pour identifier chaque produit. Thrive n’est ni affilié à eux, ni soutenu par eux.",logo:"Logo de {name}"},
 es:{hubTitle:"Thrive frente a otras herramientas",hubLede:"Comparativas honestas entre Thrive y las otras herramientas que usan freelancers y pequeños estudios. Cuando hacen más que Thrive, lo decimos.",hubMeta:"Thrive comparado con HoneyBook, Dubsado, Plutio y otras herramientas para freelancers: funciones, precios y límites, revisados en la web de cada producto.",vs:"Thrive vs {name}",all:"Todas las comparativas",checked:"Última revisión: {date}. Los precios y funciones de {name} vienen de su propia web.",visit:"Visitar {domain}",trial:"Pruébalo gratis",read:"Leer la comparativa",more:"Más comparativas",tm:"{name} y su logo son marcas de su propietario, mostradas solo para identificar el producto. Thrive no está afiliado ni respaldado por {name}.",tmHub:"Los nombres y logos de los productos son marcas de sus propietarios, mostradas solo para identificar cada producto. Thrive no está afiliado ni respaldado por ellos.",logo:"Logo de {name}"},
 "pt-BR":{hubTitle:"Thrive comparado",hubLede:"Comparações honestas entre o Thrive e as outras ferramentas que freelancers e pequenos estúdios usam. Quando elas fazem mais que o Thrive, a gente diz.",hubMeta:"Thrive comparado com HoneyBook, Dubsado, Plutio e outras ferramentas para freelancers: recursos, preços e limites, conferidos no site de cada produto.",vs:"Thrive vs {name}",all:"Todas as comparações",checked:"Última verificação: {date}. Preços e recursos do {name} vêm do próprio site.",visit:"Visitar {domain}",trial:"Teste grátis",read:"Ler a comparação",more:"Mais comparações",tm:"{name} e seu logo são marcas do respectivo dono, exibidas só para identificar o produto. O Thrive não é afiliado nem endossado por {name}.",tmHub:"Nomes e logos de produtos são marcas dos respectivos donos, exibidos só para identificar cada produto. O Thrive não é afiliado nem endossado por eles.",logo:"Logo do {name}"},
 it:{hubTitle:"Thrive a confronto",hubLede:"Confronti onesti tra Thrive e gli altri strumenti usati da freelance e piccoli studi. Quando fanno più di Thrive, lo diciamo.",hubMeta:"Thrive a confronto con HoneyBook, Dubsado, Plutio e altri strumenti per freelance: funzioni, prezzi e limiti, verificati sul sito di ogni prodotto.",vs:"Thrive vs {name}",all:"Tutti i confronti",checked:"Ultima verifica: {date}. Prezzi e funzioni di {name} vengono dal suo sito.",visit:"Visita {domain}",trial:"Prova gratis",read:"Leggi il confronto",more:"Altri confronti",tm:"{name} e il suo logo sono marchi del rispettivo proprietario, mostrati solo per identificare il prodotto. Thrive non è affiliato né approvato da {name}.",tmHub:"I nomi e i loghi dei prodotti sono marchi dei rispettivi proprietari, mostrati solo per identificare ogni prodotto. Thrive non è affiliato né approvato da loro.",logo:"Logo di {name}"},
 nl:{hubTitle:"Thrive vergeleken",hubLede:"Eerlijke vergelijkingen tussen Thrive en de andere tools die freelancers en kleine studio’s gebruiken. Waar ze meer kunnen dan Thrive, zeggen we dat.",hubMeta:"Thrive vergeleken met HoneyBook, Dubsado, Plutio en andere tools voor freelancers: functies, prijzen en grenzen, gecontroleerd op de website van elk product.",vs:"Thrive vs {name}",all:"Alle vergelijkingen",checked:"Laatst gecontroleerd: {date}. Prijzen en functies van {name} komen van de eigen website.",visit:"Naar {domain}",trial:"Probeer gratis",read:"Lees de vergelijking",more:"Meer vergelijkingen",tm:"{name} en het logo zijn merken van hun eigenaar, alleen getoond om het product aan te duiden. Thrive is niet verbonden aan of goedgekeurd door {name}.",tmHub:"Productnamen en logo’s zijn merken van hun eigenaars, alleen getoond om elk product aan te duiden. Thrive is niet aan hen verbonden of door hen goedgekeurd.",logo:"Logo van {name}"},
 pl:{hubTitle:"Thrive w porównaniu",hubLede:"Uczciwe porównania Thrive z innymi narzędziami, z których korzystają freelancerzy i małe studia. Gdy potrafią więcej niż Thrive, mówimy o tym.",hubMeta:"Thrive w porównaniu z HoneyBook, Dubsado, Plutio i innymi narzędziami dla freelancerów: funkcje, ceny i ograniczenia sprawdzone na stronie każdego produktu.",vs:"Thrive vs {name}",all:"Wszystkie porównania",checked:"Ostatnio sprawdzone: {date}. Ceny i funkcje {name} pochodzą z jego własnej strony.",visit:"Odwiedź {domain}",trial:"Wypróbuj za darmo",read:"Przeczytaj porównanie",more:"Więcej porównań",tm:"{name} i jego logo są znakami towarowymi ich właściciela, pokazanymi tylko w celu identyfikacji produktu. Thrive nie jest powiązany z {name} ani przez niego wspierany.",tmHub:"Nazwy i logo produktów są znakami towarowymi ich właścicieli, pokazanymi tylko w celu identyfikacji produktów. Thrive nie jest z nimi powiązany ani przez nie wspierany.",logo:"Logo {name}"},
 tr:{hubTitle:"Thrive karşılaştırmaları",hubLede:"Thrive ile serbest çalışanların ve küçük stüdyoların kullandığı diğer araçların dürüst karşılaştırmaları. Thrive’dan fazlasını yaptıkları yerde bunu söylüyoruz.",hubMeta:"Thrive; HoneyBook, Dubsado, Plutio ve serbest çalışanlara yönelik diğer araçlarla karşılaştırıldı: özellikler, fiyatlar ve sınırlar, her ürünün kendi sitesinde kontrol edildi.",vs:"Thrive vs {name}",all:"Tüm karşılaştırmalar",checked:"Son kontrol: {date}. {name} fiyat ve özellikleri kendi sitesinden alınmıştır.",visit:"{domain} sitesine git",trial:"Ücretsiz dene",read:"Karşılaştırmayı oku",more:"Diğer karşılaştırmalar",tm:"{name} ve logosu sahibinin ticari markalarıdır ve yalnızca ürünü tanıtmak için gösterilir. Thrive’ın {name} ile bir bağlantısı yoktur ve {name} tarafından desteklenmez.",tmHub:"Ürün adları ve logolar sahiplerinin ticari markalarıdır ve yalnızca her ürünü tanıtmak için gösterilir. Thrive’ın onlarla bir bağlantısı yoktur ve onlar tarafından desteklenmez.",logo:"{name} logosu"},
 id:{hubTitle:"Thrive dibandingkan",hubLede:"Perbandingan jujur antara Thrive dan alat lain yang dipakai freelancer dan studio kecil. Jika mereka bisa lebih dari Thrive, kami bilang.",hubMeta:"Thrive dibandingkan dengan HoneyBook, Dubsado, Plutio dan alat lain untuk freelancer: fitur, harga dan batasan, dicek di situs masing-masing produk.",vs:"Thrive vs {name}",all:"Semua perbandingan",checked:"Terakhir dicek: {date}. Harga dan fitur {name} diambil dari situsnya sendiri.",visit:"Kunjungi {domain}",trial:"Coba gratis",read:"Baca perbandingannya",more:"Perbandingan lainnya",tm:"{name} dan logonya adalah merek dagang pemiliknya, ditampilkan hanya untuk mengenali produk. Thrive tidak berafiliasi dengan atau didukung oleh {name}.",tmHub:"Nama dan logo produk adalah merek dagang pemiliknya, ditampilkan hanya untuk mengenali tiap produk. Thrive tidak berafiliasi dengan atau didukung oleh mereka.",logo:"Logo {name}"}
};
export const compareText=(lang,key,vars)=>String((T[lang]||T.en)[key]??T.en[key]).replace(/\{(\w+)\}/g,(m,k)=>vars&&k in vars?vars[k]:m);

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SLUG=/^thrive-vs-[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "/compare", "/compare/fr", "/compare/fr/thrive-vs-x", "/compare/thrive-vs-x" → {lang, slug}, else null.
export function comparePath(pathname){
 const parts=String(pathname).replace(/\/+$/,'').split('/').slice(1);
 if(parts[0]!=='compare'||parts.length>3)return null;
 const [,a='',b='']=parts;
 if(BLOG_LANGUAGES.includes(a)&&a!=='en')return b===''||SLUG.test(b)?{lang:a,slug:b}:null;
 if(parts.length===3)return null;
 return a===''||SLUG.test(a)?{lang:'en',slug:a}:null;
}
export const compareURL=(lang,slug='')=>'/compare'+(lang==='en'?'':'/'+lang)+(slug?'/'+slug:'');

export function parseComparison(source){
 const m=/^\s*<!--meta\s+([\s\S]*?)\s*-->\s*/.exec(String(source||''));
 if(!m)throw Error('Comparison is missing its meta comment.');
 const meta=JSON.parse(m[1]);
 for(const k of ['name','site','logo','title','description','lede','checked'])if(!meta[k])throw Error(`Comparison meta needs "${k}".`);
 if(!/^https:\/\//.test(meta.site))throw Error('Comparison site must be an https URL.');
 if(!/^[a-z0-9-]+\.(svg|png|webp)$/.test(meta.logo))throw Error('Comparison logo must be a file in public/compare/logos.');
 return {meta,body:String(source).slice(m[0].length).trim()};
}

const domain=site=>new URL(site).hostname.replace(/^www\./,'');
// "logoText": for a product whose official mark is a symbol only, its name is set next to it.
const logoImg=(meta,lang)=>`<img src="/compare/logos/${esc(meta.logo)}?v=2" alt="${esc(compareText(lang,'logo',{name:meta.name}))}" loading="lazy" decoding="async">${meta.logoText?`<span class="vs-logo-text" aria-hidden="true">${esc(meta.logoText)}</span>`:''}`;
const thriveMark='<span class="vs-thrive"><img src="/favicon.svg" width="28" height="28" alt="">thrive</span>';

// FAQ section → schema.org FAQPage (questions are the <h3>s, answers the paragraphs after them).
function faq(body){
 const sec=/<section class="vs-faq">([\s\S]*?)<\/section>/.exec(body);if(!sec)return null;
 const text=h=>h.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
 const items=[...sec[1].matchAll(/<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g)].map(([,q,a])=>({'@type':'Question',name:text(q),acceptedAnswer:{'@type':'Answer',text:text(a)}})).filter(x=>x.name&&x.acceptedAnswer.text);
 return items.length?{'@type':'FAQPage',mainEntity:items}:null;
}

function card(lang,slug,c){
 return `<li class="vs-card"><a href="${compareURL(lang,slug)}"><span class="vs-card-logos">${thriveMark}<span class="vs-x" aria-hidden="true">vs</span><span class="vs-logo">${logoImg(c.meta,lang)}</span></span><strong>${esc(compareText(lang,'vs',{name:c.meta.name}))}</strong><span>${esc(c.meta.lede)}</span></a></li>`;
}

// pages: {slug: {lang: source}}. Returns null when the page doesn't exist.
export function renderCompare(pathname,{pages,origin='',app='',hasShot=()=>true,homeFor=l=>l==='en'?'/':'/'+l}){
 const route=comparePath(pathname);if(!route)return null;
 const {lang,slug}=route;
 const load=(s,l)=>{const src=pages[s]?.[l];return src?parseComparison(src):null;};
 const order=COMPARE_ORDER.filter(s=>pages[s]).concat(Object.keys(pages).filter(s=>!COMPARE_ORDER.includes(s)).sort());
 const home=homeFor(lang);
 if(!slug){
  const list=order.map(s=>[s,load(s,lang)]).filter(([,c])=>c);
  if(!list.length)return null;
  const available=BLOG_LANGUAGES.filter(l=>order.some(s=>pages[s]?.[l]));
  const body=`<div class="wrap blog-index vs-hub"><header class="blog-head"><div class="blog-head-row"><p class="blog-kicker">${esc(blogText(lang,'compare'))}</p>${languageMenu(lang,l=>compareURL(l),available)}</div><h1>${esc(compareText(lang,'hubTitle'))}</h1><p class="blog-lede">${esc(compareText(lang,'hubLede'))}</p></header><ul class="vs-cards">${list.map(([s,c])=>card(lang,s,c)).join('')}</ul>${cta(lang,app)}<p class="vs-tm">${esc(compareText(lang,'tmHub'))}</p></div>`;
  return page({lang,title:`${compareText(lang,'hubTitle')} · Thrive`,description:compareText(lang,'hubMeta'),path:compareURL(lang),alternates:Object.fromEntries(available.map(l=>[l,compareURL(l)])),image:'/blog-shots/en/overview.webp',body,origin,app,home,nav:'compare'});
 }
 const c=load(slug,lang);if(!c)return null;
 const {meta}=c;
 const available=BLOG_LANGUAGES.filter(l=>pages[slug]?.[l]);
 const others=order.filter(s=>s!==slug).map(s=>[s,load(s,lang)]).filter(([,x])=>x).slice(0,3);
 const signup=`${app}/auth/sign-up?lang=${lang}`;
 const url=origin+compareURL(lang,slug);
 const faqLd=faq(c.body);
 const jsonld={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':url,url,name:meta.title,description:meta.description,inLanguage:lang,...(meta.date?{datePublished:meta.date}:{}),about:[{'@type':'SoftwareApplication',name:'Thrive',applicationCategory:'BusinessApplication',url:origin+'/'},{'@type':'SoftwareApplication',name:meta.name,applicationCategory:'BusinessApplication',url:meta.site}]},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Thrive',item:origin+home},{'@type':'ListItem',position:2,name:blogText(lang,'compare'),item:origin+compareURL(lang)},{'@type':'ListItem',position:3,name:compareText(lang,'vs',{name:meta.name}),item:url}]},
  ...(faqLd?[faqLd]:[])]};
 const body=`<article class="wrap vs-page">
<header class="blog-head vs-hero"><div class="blog-head-row"><a class="blog-kicker" href="${compareURL(lang)}">← ${esc(compareText(lang,'all'))}</a>${languageMenu(lang,l=>compareURL(l,slug),available)}</div>
<div class="vs-logos">${thriveMark}<span class="vs-x" aria-hidden="true">vs</span><a class="vs-logo" href="${esc(meta.site)}" rel="noopener nofollow" target="_blank">${logoImg(meta,lang)}</a></div>
<h1>${esc(compareText(lang,'vs',{name:meta.name}))}</h1>
<p class="blog-lede">${esc(meta.lede)}</p>
<div class="vs-actions"><a class="btn" href="${signup}">${esc(compareText(lang,'trial'))}</a><a class="btn quiet" href="${esc(meta.site)}" rel="noopener nofollow" target="_blank">${esc(compareText(lang,'visit',{domain:domain(meta.site)}))} <span aria-hidden="true">↗</span></a></div>
<p class="blog-meta">${esc(compareText(lang,'checked',{date:meta.checked,name:meta.name}))}</p></header>
<div class="blog-body vs-body">${renderShots(c.body,lang,hasShot)}</div>
${cta(lang,app)}
${others.length?`<section class="blog-more" aria-labelledby="vs-more-title"><h2 id="vs-more-title">${esc(compareText(lang,'more'))}</h2><ul class="vs-cards">${others.map(([s,x])=>card(lang,s,x)).join('')}</ul></section>`:''}
<p class="vs-tm">${esc(compareText(lang,'tm',{name:meta.name}))}</p>
</article>`;
 return page({lang,title:`${meta.title} · Thrive`,description:meta.description,path:compareURL(lang,slug),alternates:Object.fromEntries(available.map(l=>[l,compareURL(l,slug)])),image:`/blog-shots/${hasShot(lang,'overview')?lang:'en'}/overview.webp`,jsonld,ogType:'website',body,origin,app,home,nav:'compare'});
}

// Every comparison URL, for /sitemap.xml.
export function compareURLs(pages){
 const out=[];
 for(const l of BLOG_LANGUAGES){if(Object.values(pages).some(p=>p[l]))out.push(compareURL(l));}
 for(const s of Object.keys(pages))for(const l of BLOG_LANGUAGES)if(pages[s][l])out.push(compareURL(l,s));
 return out;
}
