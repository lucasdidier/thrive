import {clientLogo} from './client-logo.js';
import {displayInitials} from './attention-domain.js';

// Only relation fields receive identities; unrelated selects stay text-only.
export function selectIdentity(state, name, value){
 if(name==='projectId')return {type:'project',empty:!value};
 if(name!=='clientId')return null;
 const client=state.clients.find(c=>c.id===value);
 if(!client)return {type:'client-placeholder',empty:true};
 return {type:'client',initials:displayInitials(client),
  color:['sage','sand','violet','blue','rose'].includes(client.color)?client.color:'sage',
  logo:clientLogo(client)};
}
