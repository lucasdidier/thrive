import {icon} from './app-icons.js';
// Feature identity is neutral; selected state supplies the blue emphasis in CSS.
// Utility/action glyphs and client avatars deliberately use their own components.
export function featureIcon(name,size='md'){
 const sizes={xs:'xs',sm:'sm',md:'md',lg:'lg'};
 return `<span class="feature-icon feature-icon--${sizes[size]||'md'}" aria-hidden="true">${icon(name)}</span>`;
}
