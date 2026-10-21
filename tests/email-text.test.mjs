import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlEmailText,cleanEmailText,cleanCachedEmailText,providerEmailText,readableEmailMessage,EMAIL_TEXT_FORMAT} from '../server/email-text.mjs';
import {parseGoogleThread} from '../server/google.mjs';
import {plainBody} from '../server/nylas.mjs';

const padding='&zwnj;&nbsp;&shy;'.repeat(10000);
test('newsletter preview padding and metadata do not consume the readable body limit',()=>{
 const html=`<html><head><title>Duplicate subject</title><style>.x{color:red}</style></head><body><div style="display:none!important">Preview only ${padding}</div><p>Hello Lucas,</p><p>Here is the complete email.</p></body></html>`;
 assert.equal(plainBody(html),'Hello Lucas,\n\nHere is the complete email.');
 assert.equal(htmlEmailText(`<div>${padding}</div><p>Visible after padding</p>`),'Visible after padding');
});
test('HTML entities, paragraphs, lists and table cells remain readable',()=>{
 assert.equal(htmlEmailText('<p>Fran&ccedil;ois &amp; Zo&#235; &mdash; &euro;50 &quot;test&quot; &#x1f680;</p><p>Next<br>line</p>'),'François & Zoë — €50 "test" 🚀\n\nNext\nline');
 const text=htmlEmailText('<ul><li>First</li><li>Second</li></ul><table><tr><td>Design</td><td>€50</td></tr></table>');
 assert.match(text,/First\n+Second/);assert.match(text,/Design €50/);
});
test('hidden nested markup, comments and executable content are excluded without executing HTML',()=>{
 assert.equal(htmlEmailText('<div hidden>secret <div>nested</div></div><div aria-hidden="true">preview</div><div style="mso-hide:all">hidden</div><div style="visibility:hidden">hidden</div><div style="font-size:0px">padding</div><!--comment--><script>alert(1)</script><img src="https://tracking.example/pixel"><p>Visible &lt;script&gt;text&lt;/script&gt;</p>'),'Visible <script>text</script>');
});
test('cached entity padding is cleaned without treating literal text as HTML',()=>{
 assert.equal(cleanCachedEmailText('Hello '+padding+'\nNext <client@example.com> &amp; team'),'Hello\nNext <client@example.com> & team');
 const message={body:'&lt;script&gt;example&lt;/script&gt;',bodyFormat:EMAIL_TEXT_FORMAT};
 assert.equal(readableEmailMessage(message),message,'new plaintext is never decoded twice');
 assert.equal(readableEmailMessage({body:'Price &euro;50'}).body,'Price €50');
});
test('meaningful joiners, emoji, literal angle brackets and preformatted lines survive',()=>{
 const plain='می\u200cروم 👩\u200d💻 <client@example.com>\n  indented';
 assert.equal(cleanEmailText(plain),plain);
 assert.equal(providerEmailText('Hello <client@example.com>'),'Hello <client@example.com>');
 assert.equal(htmlEmailText('<pre>one\n  two</pre>'),'one\n  two');
 assert.equal(cleanEmailText('soft\u00adhyphen'),'softhyphen');
});
test('Gmail prefers the text MIME part and shares HTML conversion with Nylas',()=>{
 const part=(mimeType,body)=>({mimeType,body:{data:Buffer.from(body).toString('base64url')}});
 const raw=payload=>({id:'thread',messages:[{id:'m',internalDate:'1000',payload}]});
 const html='<p>Hi &eacute;quipe</p><div hidden>'+padding+'</div><p>Goodbye</p>';
 const google=parseGoogleThread(raw(part('text/html',html)),'owner@example.com').messages[0];
 assert.equal(google.body,plainBody(html));assert.equal(google.bodyFormat,EMAIL_TEXT_FORMAT);
 const mixed={mimeType:'multipart/alternative',parts:[part('text/plain','Literal &amp; <tag>'),part('text/html',html)]};
 assert.equal(parseGoogleThread(raw(mixed),'owner@example.com').messages[0].body,'Literal &amp; <tag>');
});
test('output is bounded after hidden content is discarded',()=>{
 assert.equal(htmlEmailText('<p>'+'a'.repeat(40000)+'</p>').length,30000);
});
