// Stops a production build/deploy while setup placeholders remain.
import {readFileSync} from 'node:fs';
const checks=[['wrangler.production.jsonc',/REPLACE_[A-Z_]+/g],['ui/privacy.html',/\[[A-Z][A-Z ,]+\]/g],['ui/terms.html',/\[[A-Z][A-Z ,]+\]/g]];
const missing=checks.flatMap(([file,re])=>[...new Set(readFileSync(new URL('../'+file,import.meta.url),'utf8').match(re)||[])].map(m=>`${file}: ${m}`));
// Billing on needs a client-side token and a price id (docs/launch.md › 10).
const config=readFileSync(new URL('../wrangler.production.jsonc',import.meta.url),'utf8'),value=name=>config.match(new RegExp(`"${name}":\\s*"([^"]*)"`))?.[1]||'';
if(value('THRIVE_BILLING')==='paddle'){
 if(!/^(test|live)_[A-Za-z0-9]+$/.test(value('PADDLE_CLIENT_TOKEN')))missing.push('wrangler.production.jsonc: PADDLE_CLIENT_TOKEN (Paddle › Developer tools › Authentication)');
 if(!/^pri_[a-z0-9]+$/.test(value('PADDLE_PRICE_ID')))missing.push('wrangler.production.jsonc: PADDLE_PRICE_ID (Paddle › Catalog › your product › price)');
 if(value('PADDLE_CLIENT_TOKEN').startsWith('test_'))console.warn('Note: production billing uses the Paddle sandbox (test_ token). Payments are not real.');
}
if(missing.length){console.error('Fill these in before deploying production:\n  '+missing.join('\n  '));process.exit(1);}
console.log('Production config is complete.');
