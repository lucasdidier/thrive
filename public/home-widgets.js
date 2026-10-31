export const homeWidgets=[['totals','Business totals','money'],['followup','Follow up','invoices'],['projects','Projects in motion','projects'],['calendar','Your week','calendar'],['activity','Recent activity','clock']];
export function homeWidgetPreferences(value){return Object.fromEntries(homeWidgets.map(([id])=>[id,value?.[id]!==false]));}
