// Sidebar navigation groups. Notifications live on the bell beside the account card, not in these groups.
export const sidebarGroups=[['',[['overview','Home']]],['Work',[['projects','Projects'],['clients','Clients'],['time','Time']]],['Business',[['proposals','Proposals'],['contracts','Contracts'],['invoices','Invoices']]],['Communication',[['messages','Emails'],['scheduling','Scheduling']]],['Tools',[['forms','Forms'],['workflows','Workflows']]]];
export const workspaceSections=sidebarGroups.flatMap(([,sections])=>sections);
// Every page with a title in the top bar, including ones reached outside the groups.
export const pageSections=[...workspaceSections,['notifications','Notifications']];
