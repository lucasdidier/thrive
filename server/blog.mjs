// The Thrive blog on the public site: runonthrive.com/blog (English) and /blog/<language> (others).
//   /blog                 English index        /blog/<slug>            English article
//   /blog/fr              French index         /blog/fr/<slug>         French article
// Articles live in content/blog/<slug>/<language>.html: a meta comment with JSON, then the body
// (content/blog/BRIEF.md). <figure data-shot="name"> becomes that screenshot in the article's language
// (public/blog-shots/<language>/<name>.webp, from scripts/blog-shots.mjs), falling back to English.
import {LANGUAGES,languageFlag} from '../public/i18n.js';
import {blogArt} from './blog-art.mjs';

export const BLOG_LANGUAGES=LANGUAGES.map(l=>l.code);
export const ARTICLE_ORDER=['how-to-invoice-clients','proposals-and-contracts','generate-leads-with-forms','automate-busy-work','time-tracking-for-freelancers','how-to-price-freelance-work','client-portals','run-your-business-with-ai','onboard-new-clients','book-client-calls','manage-multiple-projects','weekly-admin-routine','simple-crm-for-freelancers'];
export const PUBLISHED='2026-11-11';

// The page around the articles, in each language.
const T={
 en:{blog:'Blog',home:'Thrive',indexTitle:'The Thrive blog',indexLede:'Practical guides for freelancers and small studios: winning clients, getting paid and spending less time on admin.',min:'{n} min read',read:'Read the article',all:'All articles',language:'Language',features:'Features',pricing:'Pricing',signIn:'Sign in',trial:'Start free trial',ctaTitle:'Run your client work in one place',ctaText:'Clients, proposals, contracts, invoices, time and workflows in one workspace. Try Thrive free for 7 days.',ctaButton:'Start your free trial',ctaNote:'No card needed · then $10/month or $100/year',tagline:'The workspace for freelancers and small studios.',privacy:'Privacy',terms:'Terms',more:'Keep reading',fictional:'Screens show fictional sample data.'},
 es:{blog:'Blog',home:'Thrive',indexTitle:'El blog de Thrive',indexLede:'Guías prácticas para freelancers y pequeños estudios: conseguir clientes, cobrar a tiempo y dedicar menos horas a la administración.',min:'{n} min de lectura',read:'Leer el artículo',all:'Todos los artículos',language:'Idioma',features:'Funciones',pricing:'Precios',signIn:'Iniciar sesión',trial:'Prueba gratis',ctaTitle:'Gestiona el trabajo con tus clientes en un solo lugar',ctaText:'Clientes, propuestas, contratos, facturas, tiempo y automatizaciones en un mismo espacio. Prueba Thrive gratis durante 7 días.',ctaButton:'Empieza tu prueba gratis',ctaNote:'Sin tarjeta · después 10 $/mes o 100 $/año',tagline:'El espacio de trabajo para freelancers y pequeños estudios.',privacy:'Privacidad',terms:'Condiciones',more:'Sigue leyendo',fictional:'Las pantallas muestran datos ficticios.'},
 'pt-BR':{blog:'Blog',home:'Thrive',indexTitle:'O blog da Thrive',indexLede:'Guias práticos para freelancers e pequenos estúdios: conquistar clientes, receber em dia e gastar menos tempo com burocracia.',min:'{n} min de leitura',read:'Ler o artigo',all:'Todos os artigos',language:'Idioma',features:'Recursos',pricing:'Preços',signIn:'Entrar',trial:'Teste grátis',ctaTitle:'Organize o trabalho com seus clientes em um só lugar',ctaText:'Clientes, propostas, contratos, faturas, horas e automações em um só espaço. Teste a Thrive grátis por 7 dias.',ctaButton:'Comece seu teste grátis',ctaNote:'Sem cartão · depois US$ 10/mês ou US$ 100/ano',tagline:'O espaço de trabalho para freelancers e pequenos estúdios.',privacy:'Privacidade',terms:'Termos',more:'Continue lendo',fictional:'As telas mostram dados fictícios.'},
 fr:{blog:'Blog',home:'Thrive',indexTitle:'Le blog de Thrive',indexLede:'Des guides pratiques pour freelances et petits studios : trouver des clients, être payé à temps et passer moins de temps sur l’administratif.',min:'{n} min de lecture',read:'Lire l’article',all:'Tous les articles',language:'Langue',features:'Fonctionnalités',pricing:'Tarifs',signIn:'Se connecter',trial:'Essai gratuit',ctaTitle:'Gérez votre travail client au même endroit',ctaText:'Clients, propositions, contrats, factures, temps et automatisations dans un seul espace. Essayez Thrive gratuitement pendant 7 jours.',ctaButton:'Commencer l’essai gratuit',ctaNote:'Sans carte bancaire · ensuite 10 $/mois ou 100 $/an',tagline:'L’espace de travail des freelances et des petits studios.',privacy:'Confidentialité',terms:'Conditions',more:'À lire aussi',fictional:'Les écrans montrent des données fictives.'},
 de:{blog:'Blog',home:'Thrive',indexTitle:'Der Thrive-Blog',indexLede:'Praktische Anleitungen für Freelancer und kleine Studios: Kunden gewinnen, pünktlich bezahlt werden und weniger Zeit mit Verwaltung verbringen.',min:'{n} Min. Lesezeit',read:'Artikel lesen',all:'Alle Artikel',language:'Sprache',features:'Funktionen',pricing:'Preise',signIn:'Anmelden',trial:'Kostenlos testen',ctaTitle:'Deine Kundenarbeit an einem Ort',ctaText:'Kunden, Angebote, Verträge, Rechnungen, Zeiten und Automationen in einem Workspace. Teste Thrive 7 Tage kostenlos.',ctaButton:'Kostenlos testen',ctaNote:'Ohne Kreditkarte · danach 10 $/Monat oder 100 $/Jahr',tagline:'Der Workspace für Freelancer und kleine Studios.',privacy:'Datenschutz',terms:'AGB',more:'Weiterlesen',fictional:'Die Screens zeigen fiktive Beispieldaten.'},
 it:{blog:'Blog',home:'Thrive',indexTitle:'Il blog di Thrive',indexLede:'Guide pratiche per freelance e piccoli studi: trovare clienti, farsi pagare in tempo e dedicare meno ore all’amministrazione.',min:'{n} min di lettura',read:'Leggi l’articolo',all:'Tutti gli articoli',language:'Lingua',features:'Funzionalità',pricing:'Prezzi',signIn:'Accedi',trial:'Prova gratis',ctaTitle:'Gestisci il lavoro con i clienti in un unico posto',ctaText:'Clienti, proposte, contratti, fatture, tempo e automazioni in un solo spazio. Prova Thrive gratis per 7 giorni.',ctaButton:'Inizia la prova gratuita',ctaNote:'Nessuna carta richiesta · poi 10 $/mese o 100 $/anno',tagline:'Lo spazio di lavoro per freelance e piccoli studi.',privacy:'Privacy',terms:'Termini',more:'Continua a leggere',fictional:'Le schermate mostrano dati di esempio fittizi.'},
 nl:{blog:'Blog',home:'Thrive',indexTitle:'De Thrive-blog',indexLede:'Praktische gidsen voor freelancers en kleine studio’s: klanten binnenhalen, op tijd betaald worden en minder tijd kwijt zijn aan administratie.',min:'{n} min lezen',read:'Lees het artikel',all:'Alle artikelen',language:'Taal',features:'Functies',pricing:'Prijzen',signIn:'Inloggen',trial:'Gratis proberen',ctaTitle:'Al je klantwerk op één plek',ctaText:'Klanten, voorstellen, contracten, facturen, uren en automatiseringen in één werkruimte. Probeer Thrive 7 dagen gratis.',ctaButton:'Start je gratis proefperiode',ctaNote:'Geen creditcard nodig · daarna $ 10 per maand of $ 100 per jaar',tagline:'De werkruimte voor freelancers en kleine studio’s.',privacy:'Privacy',terms:'Voorwaarden',more:'Lees verder',fictional:'De schermen tonen fictieve voorbeelddata.'},
 pl:{blog:'Blog',home:'Thrive',indexTitle:'Blog Thrive',indexLede:'Praktyczne poradniki dla freelancerów i małych studiów: zdobywanie klientów, terminowe płatności i mniej czasu na papierologię.',min:'{n} min czytania',read:'Przeczytaj artykuł',all:'Wszystkie artykuły',language:'Język',features:'Funkcje',pricing:'Cennik',signIn:'Zaloguj się',trial:'Wypróbuj za darmo',ctaTitle:'Cała praca z klientami w jednym miejscu',ctaText:'Klienci, oferty, umowy, faktury, czas pracy i automatyzacje w jednej przestrzeni. Wypróbuj Thrive za darmo przez 7 dni.',ctaButton:'Rozpocznij darmowy okres próbny',ctaNote:'Bez karty · potem 10 USD/mies. lub 100 USD/rok',tagline:'Przestrzeń robocza dla freelancerów i małych studiów.',privacy:'Prywatność',terms:'Regulamin',more:'Czytaj dalej',fictional:'Ekrany przedstawiają fikcyjne dane.'},
 tr:{blog:'Blog',home:'Thrive',indexTitle:'Thrive blogu',indexLede:'Serbest çalışanlar ve küçük stüdyolar için pratik rehberler: müşteri kazanmak, zamanında ödeme almak ve evrak işine daha az zaman ayırmak.',min:'{n} dk okuma',read:'Makaleyi oku',all:'Tüm makaleler',language:'Dil',features:'Özellikler',pricing:'Fiyatlar',signIn:'Giriş yap',trial:'Ücretsiz dene',ctaTitle:'Müşteri işlerinizi tek bir yerden yönetin',ctaText:'Müşteriler, teklifler, sözleşmeler, faturalar, zaman takibi ve otomasyonlar tek bir çalışma alanında. Thrive’ı 7 gün ücretsiz deneyin.',ctaButton:'Ücretsiz denemeyi başlat',ctaNote:'Kart gerekmez · sonrasında ayda 10 $ veya yılda 100 $',tagline:'Serbest çalışanlar ve küçük stüdyolar için çalışma alanı.',privacy:'Gizlilik',terms:'Koşullar',more:'Okumaya devam edin',fictional:'Ekranlar kurgusal örnek veriler gösterir.'},
 id:{blog:'Blog',home:'Thrive',indexTitle:'Blog Thrive',indexLede:'Panduan praktis untuk freelancer dan studio kecil: mendapatkan klien, dibayar tepat waktu, dan menghabiskan lebih sedikit waktu untuk administrasi.',min:'{n} menit baca',read:'Baca artikel',all:'Semua artikel',language:'Bahasa',features:'Fitur',pricing:'Harga',signIn:'Masuk',trial:'Coba gratis',ctaTitle:'Kelola pekerjaan klien di satu tempat',ctaText:'Klien, proposal, kontrak, faktur, waktu, dan otomatisasi dalam satu ruang kerja. Coba Thrive gratis selama 7 hari.',ctaButton:'Mulai uji coba gratis',ctaNote:'Tanpa kartu · lalu $10/bulan atau $100/tahun',tagline:'Ruang kerja untuk freelancer dan studio kecil.',privacy:'Privasi',terms:'Ketentuan',more:'Baca juga',fictional:'Layar menampilkan data contoh fiktif.'},
};
export const blogText=(lang,key,vars)=>String((T[lang]||T.en)[key]??T.en[key]).replace(/\{(\w+)\}/g,(m,k)=>vars&&k in vars?vars[k]:m);

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "/blog", "/blog/fr", "/blog/fr/some-slug", "/blog/some-slug" → {lang, slug} (slug '' for the index), else null.
export function blogPath(pathname){
 const parts=String(pathname).replace(/\/+$/,'').split('/').slice(1);
 if(parts[0]!=='blog'||parts.length>3)return null;
 let [,a='',b='']=parts;
 if(BLOG_LANGUAGES.includes(a)&&a!=='en')return b===''||SLUG.test(b)?{lang:a,slug:b}:null;
 if(parts.length===3)return null;
 return a===''||SLUG.test(a)?{lang:'en',slug:a}:null;
}
export const blogURL=(lang,slug='')=>'/blog'+(lang==='en'?'':'/'+lang)+(slug?'/'+slug:'');

// A file's meta comment and body.
export function parseArticle(source){
 const m=/^\s*<!--meta\s+([\s\S]*?)\s*-->\s*/.exec(String(source||''));
 if(!m)throw Error('Article is missing its meta comment.');
 const meta=JSON.parse(m[1]);
 if(!meta.title||!meta.description)throw Error('Article meta needs a title and a description.');
 return {meta:{title:String(meta.title),description:String(meta.description),minutes:Math.max(1,Number(meta.minutes)||5)},body:String(source).slice(m[0].length).trim()};
}

// Screenshot placeholders → images in the article's language, else English.
export function renderShots(body,lang,hasShot=()=>true){
 return body.replace(/<figure data-shot="([a-z0-9-]+)">\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/g,(all,name,caption)=>{
  const dir=hasShot(lang,name)?lang:hasShot('en',name)?'en':null;
  if(!dir)return '';
  const alt=caption.replace(/<[^>]+>/g,'').trim();
  return `<figure class="shot"><img src="/blog-shots/${dir}/${name}.webp" alt="${esc(alt)}" width="1800" height="1125" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure>`;
 });
}
const firstShot=body=>/<figure data-shot="([a-z0-9-]+)">/.exec(body)?.[1]||'overview';

const LOGO='<img src="/favicon.svg" width="28" height="28" alt="">';
const THEME_SCRIPT=`<script>(()=>{const d=document.documentElement,dark=matchMedia('(prefers-color-scheme: dark)');let p='system';try{p=localStorage.getItem('thrive-theme')||'system'}catch{}const apply=()=>{d.dataset.theme=p==='light'||p==='dark'?p:dark.matches?'dark':'light'};apply();dark.addEventListener('change',()=>{if(p!=='light'&&p!=='dark')apply()})})()</script>`;
const fmtDate=(lang,iso)=>new Intl.DateTimeFormat(lang,{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));

export function languageMenu(lang,hrefFor,available){
 const current=LANGUAGES.find(l=>l.code===lang);
 return `<details class="blog-lang"><summary aria-label="${esc(blogText(lang,'language'))}: ${esc(current.name)}"><span aria-hidden="true">${languageFlag(lang)}</span> ${esc(current.name)}</summary><ul>${LANGUAGES.filter(l=>available.includes(l.code)).map(l=>`<li><a href="${esc(hrefFor(l.code))}" hreflang="${l.code}" lang="${l.code}"${l.code===lang?' aria-current="true"':''}><span aria-hidden="true">${languageFlag(l.code)}</span> ${esc(l.name)}</a></li>`).join('')}</ul></details>`;
}

function page({lang,title,description,path,alternates,image,jsonld,body,origin,app,home='/'}){
 const t=k=>esc(blogText(lang,k));
 const url=origin+path;
 return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${Object.entries(alternates).map(([code,p])=>`<link rel="alternate" hreflang="${code}" href="${esc(origin+p)}">`).join('')}${alternates.en?`<link rel="alternate" hreflang="x-default" href="${esc(origin+alternates.en)}">`:''}
<meta property="og:type" content="${jsonld?'article':'website'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(origin+image)}"><meta property="og:locale" content="${lang.replace('-','_')}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/InterVariable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/typography.css"><link rel="stylesheet" href="/landing.css"><link rel="stylesheet" href="/blog.css">
${THEME_SCRIPT}
<script src="/visit.js" defer></script>
${jsonld?`<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g,'\\u003c')}</script>`:''}
</head>
<body class="blog">
<a class="skip" href="#main">Skip to content</a>
<header class="bar">
 <div class="wrap bar-row">
  <a class="mark" href="${home}" aria-label="Thrive home">${LOGO}thrive</a>
  <nav class="bar-links" aria-label="Thrive"><a href="${home}#features">${t('features')}</a><a href="${home}#pricing">${t('pricing')}</a><a href="${blogURL(lang)}" aria-current="page">${t('blog')}</a></nav>
  <div class="bar-act"><a href="${app}/auth/sign-in?lang=${lang}">${t('signIn')}</a><a class="btn sm" href="${app}/auth/sign-up?lang=${lang}">${t('trial')}</a></div>
 </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
 <div class="wrap foot-grid">
  <div class="foot-brand"><a class="mark" href="${home}" aria-label="Thrive home"><img src="/favicon.svg" width="28" height="28" alt="">thrive</a><p>${t('tagline')}</p></div>
  <nav class="foot-links" aria-label="Footer">
   <ul><li><a href="${home}#features">${t('features')}</a></li><li><a href="${home}#pricing">${t('pricing')}</a></li><li><a href="${blogURL(lang)}">${t('blog')}</a></li></ul>
   <ul><li><a href="${app}/auth/sign-up?lang=${lang}">${t('trial')}</a></li><li><a href="${app}/auth/sign-in?lang=${lang}">${t('signIn')}</a></li></ul>
   <ul><li><a href="https://github.com/lucasdidier/thrive">GitHub</a></li><li><a href="/privacy">${t('privacy')}</a></li><li><a href="/terms">${t('terms')}</a></li></ul>
  </nav>
 </div>
 <div class="wrap foot-legal"><span>© 2026 Thrive. ${t('fictional')}</span></div>
</footer>
</body>
</html>`;
}

function cta(lang,app){
 const t=k=>esc(blogText(lang,k));
 return `<aside class="blog-cta" aria-labelledby="blog-cta-title"><h2 id="blog-cta-title">${t('ctaTitle')}</h2><p>${t('ctaText')}</p><a class="btn" href="${app}/auth/sign-up?lang=${lang}">${t('ctaButton')}</a><p class="blog-cta-note">${t('ctaNote')}</p></aside>`;
}
function card(lang,slug,a){
 return `<li class="blog-card"><a href="${blogURL(lang,slug)}">${blogArt(slug)}<span class="blog-card-meta">${esc(blogText(lang,'min',{n:a.meta.minutes}))}</span><strong>${esc(a.meta.title)}</strong><span>${esc(a.meta.description)}</span></a></li>`;
}

// articles: {slug: {lang: source}}. Returns null when the page doesn't exist.
// homeFor(lang): the landing page in that language (runonthrive.com/fr…), so the logo and nav keep the reader's language.
export function renderBlog(pathname,{articles,origin='',app='',hasShot=()=>true,published=PUBLISHED,homeFor=l=>l==='en'?'/':'/'+l}){
 const route=blogPath(pathname);if(!route)return null;
 const {lang,slug}=route;
 const load=(s,l)=>{const src=articles[s]?.[l];if(!src)return null;const a=parseArticle(src);const cover=firstShot(a.body);return {...a,cover,shotLang:hasShot(l,cover)?l:'en'};};
 const order=ARTICLE_ORDER.filter(s=>articles[s]).concat(Object.keys(articles).filter(s=>!ARTICLE_ORDER.includes(s)).sort());
 if(!slug){
  const list=order.map(s=>[s,load(s,lang)]).filter(([,a])=>a);
  if(!list.length)return null;
  const available=BLOG_LANGUAGES.filter(l=>order.some(s=>articles[s]?.[l]));
  const alternates=Object.fromEntries(available.map(l=>[l,blogURL(l)]));
  const body=`<div class="wrap blog-index"><header class="blog-head"><div class="blog-head-row"><p class="blog-kicker">${esc(blogText(lang,'blog'))}</p>${languageMenu(lang,l=>blogURL(l),available)}</div><h1>${esc(blogText(lang,'indexTitle'))}</h1><p class="blog-lede">${esc(blogText(lang,'indexLede'))}</p></header><ul class="blog-cards">${list.map(([s,a])=>card(lang,s,a)).join('')}</ul>${cta(lang,app)}</div>`;
  return page({lang,title:blogText(lang,'indexTitle'),description:blogText(lang,'indexLede'),path:blogURL(lang),alternates,image:`/blog-shots/${list[0][1].shotLang}/${list[0][1].cover}.webp`,body,origin,app,home:homeFor(lang)});
 }
 const a=load(slug,lang);if(!a)return null;
 const available=BLOG_LANGUAGES.filter(l=>articles[slug]?.[l]);
 const alternates=Object.fromEntries(available.map(l=>[l,blogURL(l,slug)]));
 const others=order.filter(s=>s!==slug).map(s=>[s,load(s,lang)]).filter(([,x])=>x).slice(0,3);
 // An article can carry its own "date" in its meta (YYYY-MM-DD); otherwise the blog's launch date.
 const day=/^\d{4}-\d{2}-\d{2}$/.test(a.meta.date||'')?a.meta.date:published;
 const date=fmtDate(lang,day);
 const image=`/blog-shots/${a.shotLang}/${a.cover}.webp`;
 const jsonld={'@context':'https://schema.org','@type':'BlogPosting',headline:a.meta.title,description:a.meta.description,inLanguage:lang,datePublished:day,image:origin+image,mainEntityOfPage:origin+blogURL(lang,slug),author:{'@type':'Organization',name:'Thrive'},publisher:{'@type':'Organization',name:'Thrive',logo:{'@type':'ImageObject',url:origin+'/apple-touch-icon.png'}}};
 const body=`<article class="wrap blog-article"><header class="blog-head"><div class="blog-head-row"><a class="blog-kicker" href="${blogURL(lang)}">← ${esc(blogText(lang,'all'))}</a>${languageMenu(lang,l=>blogURL(l,slug),available)}</div><h1>${esc(a.meta.title)}</h1><p class="blog-meta"><time datetime="${day}">${esc(date)}</time> · ${esc(blogText(lang,'min',{n:a.meta.minutes}))}</p></header><div class="blog-body">${renderShots(a.body,lang,hasShot)}</div>${cta(lang,app)}${others.length?`<section class="blog-more" aria-labelledby="blog-more-title"><h2 id="blog-more-title">${esc(blogText(lang,'more'))}</h2><ul class="blog-cards">${others.map(([s,x])=>card(lang,s,x)).join('')}</ul></section>`:''}</article>`;
 return page({lang,title:`${a.meta.title} · Thrive`,description:a.meta.description,path:blogURL(lang,slug),alternates,image,jsonld,body,origin,app,home:homeFor(lang)});
}

// Every blog URL, for /sitemap.xml.
export function blogURLs(articles){
 const out=[];
 for(const l of BLOG_LANGUAGES){if(Object.values(articles).some(a=>a[l]))out.push(blogURL(l));}
 for(const [s,langs] of Object.entries(articles))for(const l of BLOG_LANGUAGES)if(langs[l])out.push(blogURL(l,s));
 return out;
}
