// The blog's articles and screenshot list, bundled at build time (server/blog.mjs renders them).
import shots from '../../content/blog/shots.json';
const files=import.meta.glob('../../content/blog/*/*.html',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
export const articles:Record<string,Record<string,string>>={};
for(const [file,source] of Object.entries(files)){
 const m=/content\/blog\/([a-z0-9-]+)\/([A-Za-z-]+)\.html$/.exec(file);if(!m)continue;
 (articles[m[1]]??={})[m[2]]=source;
}
const available=new Set<string>((shots as {files:string[]}).files);
export const hasShot=(lang:string,name:string)=>available.has(`${lang}/${name}`);
