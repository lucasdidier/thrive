import {L} from './i18n.js';
// Sidebar navigation groups (labels translated when the module loads; boot.js sets the language first). Notifications live on the bell beside the account card, not in these groups.
export const sidebarGroups=[['',[['overview',L('Home')]]],[L('Work'),[['projects',L('Projects')],['clients',L('Clients')],['time',L('Time')]]],[L('Business'),[['proposals',L('Proposals')],['contracts',L('Contracts')],['invoices',L('Invoices')]]],[L('Communication'),[['messages',L('Emails')],['scheduling',L('Scheduling')]]],[L('Tools'),[['forms',L('Forms')],['workflows',L('Workflows')]]]];
export const workspaceSections=sidebarGroups.flatMap(([,sections])=>sections);
// Every page with a title in the top bar, including ones reached outside the groups.
export const pageSections=[...workspaceSections,['notifications',L('Notifications')]];
