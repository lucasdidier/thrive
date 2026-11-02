// Removes CSS declarations that are provably overridden: a later rule with the
// identical selector, identical at-rule context and property, on every page that
// loads the earlier sheet. Usage: node scripts/css-remove-overridden.mjs . [--write]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root = path.resolve(process.argv[2] || '.');
const write = process.argv.includes('--write');
const require = createRequire(path.join(root, 'package.json'));
const postcss = require('postcss');

const sheetsIn = file => [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/href="[./]*([a-z0-9/-]+\.css)"/g)].map(m => path.basename(m[1]));
const pages = {
  shell: sheetsIn('ui/index.html'),
  client: sheetsIn('ui/client.html'),
  auth: sheetsIn('ui/auth.html'),
  reference: sheetsIn('public/design-system.html'),
};
// client-view.js injects the same set as client.html; embed.js loads form-overlay alone.
pages.embed = ['form-overlay.css'];
const shell = pages.shell.filter(f => f !== 'bridge.css'); // generated file, left alone
const allowed = (x, y) => Object.values(pages).every(list => {
  const i = list.indexOf(x);
  if (i < 0) return true;
  const j = list.indexOf(y);
  return j > i;
});
const risky = /\b(dvh|svh|lvh|dvw|svw|cqi|cqw|cqh|color-mix|oklch|oklab|light-dark|lab\(|lch\()|-webkit-|-moz-|-ms-/;

const parsed = shell.map(name => {
  const file = path.join(root, 'public', name);
  return {name, file, ast: postcss.parse(fs.readFileSync(file, 'utf8'), {from: file})};
});
const context = node => {
  const parts = [];
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule') parts.unshift(`@${p.name} ${p.params.replace(/\s+/g, ' ').trim()}`);
  }
  return parts.join(' / ');
};
const norm = s => s.replace(/\s+/g, ' ').replace(/\s*([>+~,])\s*/g, '$1').trim();
// Ordered list of every declaration occurrence.
const occurrences = [];
let order = 0;
let layered = false;
for (const sheet of parsed) {
  sheet.ast.walkAtRules(a => { if (a.name === 'layer') layered = true; });
  sheet.ast.walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    const selectors = rule.selectors.map(norm);
    const ctx = context(rule);
    rule.each(decl => {
      if (decl.type !== 'decl') return;
      occurrences.push({sheet: sheet.name, rule, decl, selectors, ctx, prop: decl.prop.toLowerCase(), important: !!decl.important, order: order++});
    });
  });
}
if (layered) { console.error('Found @layer; aborting because cascade order would differ.'); process.exit(1); }
const index = new Map();
for (const o of occurrences) for (const s of o.selectors) {
  const key = `${o.ctx}|${s}|${o.prop}`;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(o);
}
const removable = [];
for (const o of occurrences) {
  if (o.prop.startsWith('--') && false) continue;
  if (/^-(webkit|moz|ms)-/.test(o.prop)) continue;
  const ok = o.selectors.every(s => (index.get(`${o.ctx}|${s}|${o.prop}`) || []).some(later =>
    later.order > o.order &&
    later.rule !== o.rule &&
    (later.important || !o.important) &&
    !risky.test(later.decl.value) &&
    (later.sheet === o.sheet || allowed(o.sheet, later.sheet))));
  if (ok) removable.push(o);
}
const bySheet = {};
for (const o of removable) bySheet[o.sheet] = (bySheet[o.sheet] || 0) + 1;
console.log('declarations scanned', occurrences.length, 'removable', removable.length);
console.log(bySheet);
if (write) {
  for (const o of removable) o.decl.remove();
  for (const sheet of parsed) {
    let changed = true;
    while (changed) { changed = false; sheet.ast.walk(n => { if ((n.type === 'rule' || (n.type === 'atrule' && n.nodes && n.name !== 'font-face')) && n.nodes && n.nodes.length === 0) { n.remove(); changed = true; } }); }
    const before = fs.readFileSync(sheet.file, 'utf8');
    const after = sheet.ast.toString();
    if (after !== before) fs.writeFileSync(sheet.file, after);
  }
  console.log('written');
}
