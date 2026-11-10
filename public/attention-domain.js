import {L} from './i18n.js';
// conversationStatus returns English status values that callers compare; translate them where they are shown.
// Reply intent is a user decision, never inferred from an incoming message.
// Decisions belong to a specific latest message so new correspondence resurfaces.
export function conversationStatus(state, thread) {
  if (thread.archived) return 'Archived';
  const last = thread.messages?.at(-1);
  if (last?.direction === 'outgoing') return 'Sent';
  const choice = state.settings?.emailFollowUps?.[thread.id];
  if (choice?.messageId === last?.id) {
    if (choice.status === 'reply') return 'Needs reply';
    if (choice.status === 'done') return 'No reply needed';
  }
  return 'Received';
}

export function setConversationAttention(state, thread, status) {
  const last = thread?.messages?.at(-1);
  if (!last || last.direction !== 'incoming' || !['reply', 'done', 'clear'].includes(status)) {
    throw Error(L('Choose an incoming conversation to update its reply status.'));
  }
  state.settings.emailFollowUps ??= {};
  if (status === 'clear') delete state.settings.emailFollowUps[thread.id];
  else state.settings.emailFollowUps[thread.id] = {messageId: last.id, status};
}

export function displayInitials(record) {
  const name = String(record?.name || '').replace(/^\[demo\]\s*/i, '').trim();
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words.at(-1)[0] : words[0]?.slice(0, 2) || '?').toUpperCase();
}

export function projectNextStep(state, project) {
  if (project.archived) return {title: L('This project is archived'), description: L('Restore it to continue delivery.'), action: 'archive-project', label: L('Restore project'), id: project.id};
  if (project.status === 'cancelled') return {title: L('This project is cancelled'), description: L('Reopen it when you’re ready to continue.'), action: 'reopen-project', label: L('Reopen project'), id: project.id};
  if (['active', 'completed'].includes(project.status)) return null;
  const documents = (state.documents || []).filter(d => d.projectId === project.id && !d.archived);
  const billing = documents.find(d => d.billing);
  const deposit = (state.invoices || []).find(i => i.projectId === project.id && i.kind === 'deposit' && i.paid < i.amount);
  if (deposit) return {title: L('Waiting for the deposit'), description: L('Record the deposit when payment arrives.'), action: 'invoice', label: L('View deposit invoice'), id: deposit.id};
  if (project.accepted && project.billingPlan?.some(r => r.trigger!=='manual') && !(state.invoices || []).some(i => i.projectId === project.id && i.kind === 'deposit')) {
    return {title: L('The agreement is ready'), description: L('Create the deposit invoice to move this project forward.'), action: 'deposit', label: L('Create deposit invoice'), id: project.id};
  }
  if (billing) return {title: billing.status === 'draft' ? L('Finish the billing agreement') : L('Waiting for the client’s response'), description: billing.status === 'draft' ? L('Review pricing and the payment schedule in the linked document.') : L('Open the agreement to check its status and sharing options.'), action: 'document', label: L('Open agreement'), id: billing.id};
  return {title: L('Set up project billing'), description: L('Add pricing and a payment schedule to a linked proposal or contract when you are ready.'), action: documents.length ? 'document' : 'new-document', label: documents.length ? L('Open document') : L('Create document'), id: documents[0]?.id || project.id, projectId: project.id};
}
