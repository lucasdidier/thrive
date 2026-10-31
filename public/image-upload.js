export async function readImageUpload(file,{square=false}={}){
 if(!file||file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPG or WebP image under 2 MB.');
 let image;try{image=await createImageBitmap(file);}catch{throw Error('This image could not be opened. Choose another image.');}
 try{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(square){canvas.width=192;canvas.height=192;const size=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,192,192);}
 else{const scale=Math.min(1,256/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));ctx.drawImage(image,0,0,canvas.width,canvas.height);}
 return canvas.toDataURL('image/webp',.85);
 }finally{image.close();}
}
export function imageUploadControl({image='',name,label,initials='',esc}){
 const kind=name==='profilePhoto'?'photo':'logo';
 return `<div class="settings-image-control" data-image-name="${name}" data-initials="${esc(initials)}"><span class="settings-image-preview ${kind==='photo'?'is-avatar':''}">${image?`<img src="${esc(image)}" alt="Current ${kind}">`:`<span>${esc(initials||'+')}</span>`}</span><div class="settings-image-actions"><div><label class="btn settings-image-upload"><input type="file" name="${name}" accept="image/png,image/jpeg,image/webp" aria-label="${esc(label)}"><span data-image-upload-label>${image?'Replace':'Upload'} ${kind}</span></label><button type="button" class="text-btn" data-action="settings-image-remove" ${image?'':'hidden'}>Remove ${kind}</button></div><small>PNG, JPG or WebP · Up to 2 MB</small><input type="hidden" name="${name}Removed" value="false"></div></div>`;
}
