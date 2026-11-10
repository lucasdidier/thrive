import {featureIcon} from './feature-icon.js';
import {navigateActionMenu} from './menu-keyboard.js';
import {L} from './i18n.js';
const objects = [
  [L('Client'), 'clients', 'new-client'],
  [L('Project'), 'projects', 'new-project'],
  [L('Document'), 'documents', 'new-document'],
  [L('Form'), 'forms', 'new-form'],
  [L('Email draft'), 'mail', 'mail-new'],
  [L('Invoice'), 'invoices', 'new-invoice'],
  [L('Service or package'), 'tag', 'service-new'],
  [L('Meeting'), 'calendar', 'booking-preview'],
  [L('Meeting type'), 'scheduling', 'meeting-type-new'],
  [L('Time entry'), 'clock', 'log-time'],
  [L('Workflow'), 'workflows', 'wf-new'],
  [L('Proposal'),'documents','new-proposal'],
  [L('Contract'),'signature','new-contract'],
];

export function createMenu(icon) {
  return `<div class="create-menu-wrap">
    <button type="button" class="btn" id="create-trigger" popovertarget="create-menu" aria-haspopup="menu" aria-expanded="false">${icon('plus')}${L('Create')}${icon('down')}</button>
    <div id="create-menu" class="create-menu" popover="auto" role="menu" aria-label="${L('Create')}">
      ${[[L('Client work'),[0,1,11,12,3,4,10]],[L('Money'),[5,6]],[L('Time'),[7,8,9]]].map(([group,indices])=>`<div class="create-menu-group">${group}</div>${indices.map(i=>{const [label,symbol,action]=objects[i];return `<button type="button" class="crm-menu-item" role="menuitem" data-action="${action}">${featureIcon(symbol,'xs')}<span>${label}</span></button>`;}).join('')}`).join('')}
    </div>
  </div>`;
}

export function initCreateMenu() {
  let openAtEnd=false;
  const menu = () => document.querySelector('#create-menu');
  const trigger = () => document.querySelector('#create-trigger');
  const position = () => {
    const panel = menu(), button = trigger();
    if (!panel?.matches(':popover-open') || !button) return;
    const rect = button.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(rect.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - panel.offsetHeight - 8))}px`;
  };
  document.addEventListener('toggle', event => {
    if (event.target.id !== 'create-menu') return;
    trigger()?.setAttribute('aria-expanded', String(event.newState === 'open'));
    if (event.newState === 'open') {
      position();
      const items=[...event.target.querySelectorAll('[role=menuitem]:not(:disabled)')];
      (openAtEnd?items.at(-1):items[0])?.focus();openAtEnd=false;
    }
  }, true);
  document.addEventListener('click', event => {
    if (event.target.closest('#create-menu [data-action]')) menu()?.hidePopover();
  }, true);
  document.addEventListener('keydown', event => {
    const panel = menu();
    if (!panel) return;
    if (event.target.closest('#create-trigger') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openAtEnd=event.key==='ArrowUp';
      panel.showPopover();
      return;
    }
    if (!panel.matches(':popover-open') || !panel.contains(event.target)) return;
    navigateActionMenu(event,panel,{trigger:trigger(),close:()=>panel.hidePopover()});
    if (event.key === 'Tab') {trigger()?.focus();panel.hidePopover();}
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
}
