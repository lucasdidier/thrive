const objects = [
  ['Client', 'clients', 'new-client'],
  ['Project', 'projects', 'new-project'],
  ['Document', 'documents', 'new-document'],
  ['Form', 'forms', 'new-form'],
  ['Email draft', 'mail', 'mail-new'],
  ['Invoice', 'invoices', 'new-invoice'],
  ['Service or package', 'tag', 'service-new'],
  ['Meeting', 'calendar', 'booking-preview'],
  ['Meeting type', 'scheduling', 'meeting-type-new'],
  ['Time entry', 'clock', 'log-time'],
  ['Workflow', 'workflows', 'wf-new'],
  ['Proposal','documents','new-proposal'],
  ['Contract','signature','new-contract'],
];

export function createMenu(icon) {
  return `<div class="create-menu-wrap">
    <button type="button" class="btn" id="create-trigger" popovertarget="create-menu" aria-haspopup="menu" aria-expanded="false">${icon('plus')}New…${icon('down')}</button>
    <div id="create-menu" class="create-menu" popover="auto" role="menu" aria-label="Create new">
      ${[['Client work',[0,1,11,12,3,4,10]],['Money',[5,6]],['Time',[7,8,9]]].map(([group,indices])=>`<div class="create-menu-group">${group}</div>${indices.map(i=>{const [label,symbol,action]=objects[i];return `<button type="button" class="crm-menu-item" role="menuitem" data-action="${action}">${icon(symbol)}<span>${label}</span></button>`;}).join('')}`).join('')}
    </div>
  </div>`;
}

export function initCreateMenu() {
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
      event.target.querySelector('[role=menuitem]')?.focus();
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
      panel.showPopover();
      return;
    }
    if (!panel.matches(':popover-open') || !panel.contains(event.target)) return;
    const items = [...panel.querySelectorAll('[role=menuitem]')];
    const index = items.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
    if (event.key === 'Tab') panel.hidePopover();
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
}
