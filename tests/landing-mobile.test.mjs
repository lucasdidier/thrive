import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const landing=read('ui/landing.html'),css=read('public/landing.css'),script=read('public/landing.js');

test('"Coming soon: the mobile app" follows "What your clients see" and comes before pricing',()=>{
 const at=id=>landing.indexOf(`<section id="${id}"`);
 assert.ok(at('outputs')>0&&at('outputs')<at('mobile')&&at('mobile')<at('pricing'));
 const section=landing.slice(at('mobile'),at('pricing'));
 for(const text of ['Coming soon','iPhone','Android'])assert.ok(section.includes(text),text);
 assert.match(script,/import \{mountPhoneApp\} from '\/landing-phone\.js'/);
 assert.match(script,/'\.mobile-text > \*','\.mobile-stage'/);
});

test('the phone has one panel per tab, and each panel has a screen to render',async()=>{
 const section=landing.slice(landing.indexOf('<section id="mobile"'),landing.indexOf('<section id="pricing"'));
 const tabs=[...section.matchAll(/role="tab" id="([^"]+)" aria-controls="([^"]+)"/g)];
 const panels=[...section.matchAll(/role="tabpanel" id="([^"]+)" aria-labelledby="([^"]+)" data-screen="([^"]+)"/g)];
 assert.equal(tabs.length,3);assert.equal(panels.length,3);
 for(const [,tab,panel] of tabs)assert.ok(panels.some(p=>p[1]===panel&&p[2]===tab),panel);
 const {screens}=await import('../public/landing-phone.js');
 for(const p of panels)assert.equal(typeof screens[p[3]],'function',p[3]);
 assert.match(screens.today(),/data-act="timer"/);assert.match(screens.time(),/data-act="add"/);assert.match(screens.activity(),/data-act="read"/);
});

test('client page cards lead with the app’s feature icons instead of status pills',()=>{
 const cards=landing.slice(landing.indexOf('<div class="doc-cards"'),landing.indexOf('<div class="out-stage">'));
 assert.equal((cards.match(/class="card-ico"/g)||[]).length,4);
 assert.doesNotMatch(cards,/data-card-status|class="chip/);
 assert.doesNotMatch(script,/onStatus/);
});

test('the header logo’s air streaks stir once on arrival, never with reduced motion',()=>{
 const bar=landing.slice(landing.indexOf('<header class="bar">'),landing.indexOf('</header>'));
 assert.equal((bar.match(/class="streak"/g)||[]).length,3);
 assert.match(css,/@media \(prefers-reduced-motion:no-preference\)\{\n \.bar \.mark-logo \.streak\{animation:logo-streak/);
 assert.match(css,/@keyframes logo-streak\{/);
 // Same motion as the app's sidebar logo, once that animation is in the app's stylesheet.
 const frames=s=>s.match(/@keyframes logo-streak\{[^@]*?\}\}/)?.[0];
 const app=frames(read('public/sidebar.css'));
 if(app)assert.equal(frames(css),app);
});

test('status chip tones use real colour tokens',()=>{
 assert.doesNotMatch(css,/var\(--[a-z0-9-]+\)[0-9a-f]{2,}/i);
 assert.match(css,/\.m-chip\.warn\{background:var\(--due-bg\)/);assert.match(css,/\.m-chip\.bad\{background:var\(--late-bg\)/);
});
