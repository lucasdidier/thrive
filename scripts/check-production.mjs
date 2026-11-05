// Stops a production build/deploy while setup placeholders remain.
import {readFileSync} from 'node:fs';
const checks=[['wrangler.production.jsonc',/REPLACE_[A-Z_]+/g],['ui/privacy.html',/\[[A-Z][A-Z ,]+\]/g],['ui/terms.html',/\[[A-Z][A-Z ,]+\]/g]];
const missing=checks.flatMap(([file,re])=>[...new Set(readFileSync(new URL('../'+file,import.meta.url),'utf8').match(re)||[])].map(m=>`${file}: ${m}`));
if(missing.length){console.error('Fill these in before deploying production:\n  '+missing.join('\n  '));process.exit(1);}
console.log('Production config is complete.');
