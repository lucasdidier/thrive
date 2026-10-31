import {demoLogoMarks} from './demo-logo-marks.js';
const demoNames={'willow interiors':'leaf','ember coffee':'bean','northstar labs':'star','solstice studio':'sun','juniper studio':'leaf','orbit':'orbit','forma':'form','paper & pine':'pine','sunday goods':'sun'};
export function demoClientLogo(client){
 // Match only the known fictional fixture names with reserved example emails.
 if(!client || !/@[^@]+\.example$/i.test(client.email||''))return '';
 const key=String(client.name||'').replace(/^\[demo\]\s*/i,'').trim().toLowerCase();
 return demoLogoMarks[demoNames[key]]||'';
}
export function clientLogo(client){
 if(client?.logo!==undefined)return /^data:image\/(png|jpeg|webp);base64,/.test(client.logo)?client.logo:'';
 return demoClientLogo(client);
}
