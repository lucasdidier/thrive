import {Parser} from 'htmlparser2';

const blocks=new Set(['address','article','blockquote','div','dl','dt','dd','footer','h1','h2','h3','h4','h5','h6','header','li','main','ol','p','pre','section','table','tr','ul']);
const excluded=new Set(['head','title','script','style','template','noscript','svg']);
export const EMAIL_TEXT_FORMAT='plain-v2';

// Preserve meaningful joiners in Persian and emoji. Only remove runs used as
// newsletter preview padding, plus discretionary soft hyphens.
export function cleanEmailText(value){
 return String(value??'')
  .replace(/\r\n?/g,'\n')
  .replace(/[ \t\u00a0\u00ad\u034f\u2007\u200b-\u200d\u2060\ufeff]{4,}/g,run=>/[\u00ad\u034f\u200b-\u200d\u2060\ufeff]/.test(run)?' ':run)
  .replace(/\u00ad/g,'').replace(/\u00a0/g,' ')
  .replace(/[ \t]+\n/g,'\n')
  .replace(/\n{3,}/g,'\n\n').trim().slice(0,30000);
}

function decodeEntities(value){
 let text='';
 // Escape literal tags first: cached plaintext must never be parsed as markup.
 new Parser({ontext:part=>{text+=part;}},{decodeEntities:true}).end(String(value??'').replace(/</g,'&lt;'));
 return text;
}

export function cleanCachedEmailText(value){return cleanEmailText(decodeEntities(value));}

export function htmlEmailText(value){
 let text='',hidden=false,pre=false;
 const stack=[];
 const parser=new Parser({
  onopentag(name,attrs){
   stack.push({hidden,pre});
   pre=pre||name==='pre';
   const style=attrs.style||'';
   hidden=hidden||excluded.has(name)||Object.hasOwn(attrs,'hidden')||attrs['aria-hidden']==='true'
    ||/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|mso-hide\s*:\s*all|font-size\s*:\s*0(?:px|pt|em|rem|%)?(?:\s*!important)?\s*(?:;|$))/i.test(style);
   if(hidden)return;
   if(name==='br'||name==='hr'||blocks.has(name))text+='\n';
   if(name==='td'||name==='th')text+=' ';
  },
  ontext(part){if(!hidden)text+=pre?part:part.replace(/[\t\r\n ]+/g,' ');},
  onclosetag(name){
   if(!hidden&&blocks.has(name))text+='\n';
   ({hidden=false,pre=false}=stack.pop()||{});
  }
 },{decodeEntities:true});
 parser.end(String(value??''));
 return cleanEmailText(text);
}

// Some providers return either HTML or plain text in the same body field.
export function providerEmailText(value){
 const text=String(value??'');
 return /<\/?(?:html|head|body|div|p|br|span|a|table|tr|td|th|ul|ol|li|h[1-6]|style|script|blockquote|pre|img|b|i|strong|em|u|font|center|section|article|header|footer|hr|code)\b[^>]*>/i.test(text)
  ?htmlEmailText(text):cleanCachedEmailText(text);
}

export function readableEmailMessage(message){
 return message.bodyFormat===EMAIL_TEXT_FORMAT?message:{...message,body:cleanCachedEmailText(message.body),bodyFormat:EMAIL_TEXT_FORMAT};
}
