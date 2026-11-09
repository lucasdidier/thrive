// Fonts an agency can choose for invoice, proposal and contract titles. Every font is SIL OFL 1.1 with no
// reserved font name, self-hosted in /fonts/titles (see LICENSES.txt), so client pages load nothing from
// third parties. title-fonts.css declares the faces; a page only downloads the one its title uses.
export const titleFonts=[
 ['inter','Inter','Sans'],
 ['dm-sans','DM Sans','Sans'],
 ['manrope','Manrope','Sans'],
 ['plus-jakarta-sans','Plus Jakarta Sans','Sans'],
 ['space-grotesk','Space Grotesk','Sans'],
 ['outfit','Outfit','Sans'],
 ['nunito','Nunito','Rounded'],
 ['bricolage-grotesque','Bricolage Grotesque','Display'],
 ['syne','Syne','Display'],
 ['fraunces','Fraunces','Serif'],
 ['instrument-serif','Instrument Serif','Serif'],
 ['young-serif','Young Serif','Serif'],
 ['newsreader','Newsreader','Serif'],
 ['eb-garamond','EB Garamond','Serif'],
 ['dm-mono','DM Mono','Mono']
].map(([id,name,category])=>({id,name,category}));
export const defaultTitleFont='inter';
export const isTitleFont=id=>titleFonts.some(f=>f.id===id);
const fallback={Serif:'Georgia,serif',Mono:'var(--system-mono,ui-monospace,monospace)'};
// The CSS font-family for a title. Inter is the app's own font, so it needs no extra face.
export function titleFontFamily(id){const f=titleFonts.find(f=>f.id===id);if(!f||f.id===defaultTitleFont)return 'var(--system-font)';return `'Thrive ${f.name}',${fallback[f.category]||'var(--system-font)'}`;}
