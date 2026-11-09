import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {titleFonts,titleFontFamily} from '../public/title-fonts.js';
import {validateInvoiceDesign,defaultInvoiceDesign} from '../public/invoice-design.js';
import {invoicePaper} from '../public/invoice-paper.js';
import {documentPaper} from '../public/document-paper.js';
import {statusTone,statusLabel} from '../public/status-tone.js';
import {portalView} from '../public/portal-view.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('every title font is bundled with both subsets, declared once and licensed',()=>{
 const css=read('public/title-fonts.css'),licenses=read('public/fonts/titles/LICENSES.txt');
 assert.equal(titleFonts.length,15);assert.equal(new Set(titleFonts.map(f=>f.id)).size,15);
 for(const f of titleFonts.filter(f=>f.id!=='inter')){
  for(const sub of ['latin','latin-ext'])assert.ok(existsSync(new URL(`../public/fonts/titles/${f.id}-${sub}.woff2`,import.meta.url)),`${f.id} ${sub}`);
  assert.equal(css.split(`font-family:'Thrive ${f.name}'`).length-1,2,f.name);
  assert.ok(licenses.includes(f.id),`${f.id} license`);
 }
 assert.ok(!/Reserved Font Name "|with Reserved Font Name/i.test(licenses),'no reserved font names');
 assert.equal(titleFontFamily('inter'),'var(--system-font)');assert.match(titleFontFamily('fraunces'),/^'Thrive Fraunces',Georgia,serif$/);
});

test('the title font is optional design data: Inter is not stored, unknown fonts are rejected',()=>{
 assert.deepEqual(validateInvoiceDesign(defaultInvoiceDesign()),defaultInvoiceDesign());
 assert.equal(validateInvoiceDesign({...defaultInvoiceDesign(),titleFont:'inter'}).titleFont,undefined);
 assert.equal(validateInvoiceDesign({...defaultInvoiceDesign(),titleFont:'fraunces'}).titleFont,'fraunces');
 assert.throws(()=>validateInvoiceDesign({...defaultInvoiceDesign(),titleFont:'comic-sans'}),/title font/);
});

test('invoice and document titles use the chosen font; the payment section is addressable',()=>{
 const invoice={business:'Morgan Studio',number:'INV-006',amount:10000,paid:0,items:[{description:'Work',quantity:1,rate:10000,amount:10000}],design:{...defaultInvoiceDesign(),titleFont:'young-serif'}};
 const html=invoicePaper(invoice);assert.match(html,/class="invoice-sheet template-minimal has-title-font"/);assert.ok(html.includes("--title-font:'Thrive Young Serif',Georgia,serif"));assert.match(html,/<section class="sheet-payment"><h3>Payment instructions<\/h3>/);
 assert.ok(!invoicePaper({...invoice,design:defaultInvoiceDesign()}).includes('has-title-font'));
 assert.match(documentPaper({title:'Brand refresh',kind:'proposal',business:'Morgan Studio',scope:'Scope',design:{...defaultInvoiceDesign(),titleFont:'dm-mono'}}),/has-title-font/);
});

test('client statuses are colored by meaning and read as sentences',()=>{
 for(const s of ['outstanding','published','Awaiting signature','Awaiting acceptance','To complete'])assert.equal(statusTone(s),'warning',s);
 for(const s of ['overdue','declined'])assert.equal(statusTone(s),'negative',s);
 for(const s of ['paid','signed','accepted','Completed'])assert.equal(statusTone(s),'positive',s);
 for(const s of ['For information','In progress','superseded'])assert.equal(statusTone(s),'neutral',s);
 assert.equal(statusLabel('published'),'Awaiting response');assert.equal(statusLabel('outstanding'),'Outstanding');
});

test('portal project rows stack title and details in the shared list; client pages drop the duplicate logo',()=>{
 const projection={data:{business:'Morgan Studio',clientName:'Juniper Studio',title:'Juniper',intro:'',logo:'data:image/png;base64,AAAA',items:[{entity:'project',title:'Juniper brand identity',status:'In progress',due:'2026-10-28'},{entity:'invoice',key:'invoice:1',title:'INV-004',detail:'€1,800 outstanding',status:'overdue',needsAttention:true,action:'Payment instructions'}]}};
 const html=portalView(projection,{hrefForItem:k=>'/share/t?item='+k});
 assert.match(html,/<div class="portal-list"><div class="portal-row"><span class="portal-row-icon">.*?<\/span><span class="portal-row-content"><strong>Juniper brand identity<\/strong><small>In progress · Target /);
 assert.match(html,/class="portal-status is-negative">Overdue</);
 assert.ok(html.includes('portal-logo'));assert.ok(!portalView(projection,{hrefForItem:k=>k,showLogo:false}).includes('portal-logo'));
});

test('the client page header names the private link and has room for the agency logo',()=>{
 const page=read('ui/client.html'),view=read('public/client-view.js');
 assert.ok(!page.includes('Shared with you'));assert.match(page,/id="private-label" hidden>.*Private link for <span id="private-client">/);assert.match(page,/<img class="client-logo" id="client-logo" alt="" hidden>/);
 assert.ok(page.includes('/title-fonts.css'));assert.ok(read('ui/index.html').includes('/title-fonts.css'));
 assert.ok(!view.includes('Download copy')&&!view.includes('Print / Save PDF'));assert.ok(view.includes('Save PDF')&&view.includes('Pay invoice'));
});
