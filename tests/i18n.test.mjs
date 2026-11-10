import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {L,Ln,useCatalog,matchLanguage,LANGUAGE_CODES} from '../public/i18n.js';
import {extractKeys,placeholders} from '../scripts/i18n-extract.mjs';

test('L and Ln translate, fill placeholders, pick plural forms and fall back to English',()=>{
 useCatalog('fr',{'Save':'Enregistrer','Hello {name}':'Bonjour {name}','{n} days left':{one:'{n} jour restant',other:'{n} jours restants'}});
 assert.equal(L('Save'),'Enregistrer');assert.equal(L('Hello {name}',{name:'Ana'}),'Bonjour Ana');assert.equal(L('Untranslated'),'Untranslated');
 assert.equal(Ln(1,'{n} day left','{n} days left'),'1 jour restant');assert.equal(Ln(5,'{n} day left','{n} days left'),'5 jours restants');
 useCatalog('en',{});assert.equal(Ln(1,'{n} day left','{n} days left'),'1 day left');
 assert.equal(matchLanguage('pt-PT'),'pt-BR');assert.equal(matchLanguage('de-AT'),'de');assert.equal(matchLanguage('ja'),'en');
});

test('every locale only translates real keys, keeps their placeholders, and has no empty strings',()=>{
 const keys=extractKeys();
 for(const code of LANGUAGE_CODES.filter(c=>c!=='en')){
  const data=JSON.parse(readFileSync(new URL(`../public/locales/${code}.json`,import.meta.url),'utf8'));
  for(const [key,value] of Object.entries(data)){
   assert.ok(keys.has(key),`${code}: "${key}" is not used anywhere`);
   const forms=typeof value==='string'?[value]:Object.values(value);
   for(const form of forms){assert.ok(form,`${code}: "${key}" is empty`);assert.deepEqual(placeholders(form).filter(p=>p!=='n'),placeholders(key).filter(p=>p!=='n'),`${code}: "${key}" placeholders`);}
  }
 }
});
