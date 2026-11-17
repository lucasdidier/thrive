// The comparison pages, bundled at build time (server/compare.mjs renders them).
const files=import.meta.glob('../../content/compare/*/*.html',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
export const pages:Record<string,Record<string,string>>={};
for(const [file,source] of Object.entries(files)){
 const m=/content\/compare\/([a-z0-9-]+)\/([A-Za-z-]+)\.html$/.exec(file);if(!m)continue;
 (pages[m[1]]??={})[m[2]]=source;
}
