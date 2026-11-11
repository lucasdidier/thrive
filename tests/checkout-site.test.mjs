import test from 'node:test';
import assert from 'node:assert/strict';
import {readCheckout,returnURL} from '../public/paddle-checkout.js';
import {checkoutTarget} from '../public/subscription-ui.js';
import {checkoutPage} from '../server/subscription.mjs';
import {siteRoute} from '../server/hosts.mjs';

const prod={THRIVE_APP_URL:'https://app.runonthrive.com',THRIVE_SITE_URL:'https://runonthrive.com'};

test('production checkout runs on the public site, which Paddle can review; staging keeps its own', ()=>{
 assert.equal(checkoutPage(prod),'https://runonthrive.com/checkout');
 assert.equal(checkoutPage({THRIVE_APP_URL:'https://thrive.example.workers.dev'}),'https://thrive.example.workers.dev/checkout');
 assert.equal(siteRoute(new Request('https://runonthrive.com/checkout'),prod),null,'served on the site, not moved to the app');
 assert.equal(siteRoute(new Request('https://runonthrive.com/api/billing'),prod).response.status,308);
});

test('the app leaves for the checkout page only when it is on another origin', ()=>{
 assert.equal(checkoutTarget('https://runonthrive.com/checkout','https://app.runonthrive.com'),'https://runonthrive.com/checkout');
 assert.equal(checkoutTarget('https://thrive.example.workers.dev/checkout','https://thrive.example.workers.dev'),null);
 assert.equal(checkoutTarget('https://evil.example/elsewhere','https://app.runonthrive.com'),null);
 assert.equal(checkoutTarget(undefined,'https://app.runonthrive.com'),null);
});

test('the checkout page reads the plan from the fragment and rejects anything else', ()=>{
 assert.deepEqual(readCheckout('#price=pri_01m7386yc3jfzqrateakq0pmq8&owner=supabase:abc-123&email=pat%40example.com&theme=dark'),{price:'pri_01m7386yc3jfzqrateakq0pmq8',owner:'supabase:abc-123',email:'pat@example.com',theme:'dark'});
 assert.equal(readCheckout('#price=evil&owner=supabase:abc'),null);
 assert.equal(readCheckout('#price=pri_01m7386yc3jfzqrateakq0pmq8&owner=someone'),null);
 assert.equal(readCheckout(''),null);
});

test('after paying, people return to the app plan page, which confirms the transaction', ()=>{
 assert.equal(returnURL('https://app.runonthrive.com','txn_01abcdefghijk'),'https://app.runonthrive.com/?paid=txn_01abcdefghijk#account/plan');
 assert.equal(returnURL('https://app.runonthrive.com','javascript:alert(1)'),'https://app.runonthrive.com/#account/plan');
});

test('the sign-in page logo leads to the landing page, not the app', async()=>{
 const {landingURL}=await import('../server/hosts.mjs');
 assert.equal(landingURL(prod),'https://runonthrive.com/');
 assert.equal(landingURL({THRIVE_APP_URL:'https://thrive.example.workers.dev'}),'/landing');
});
