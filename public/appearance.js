/* Apply the saved appearance before paint. New workspaces begin in light mode. */
(() => {
  const system = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    let preference = 'light';
    try { preference = localStorage.getItem('thrive-theme') || 'light'; } catch {}
    document.documentElement.dataset.theme = preference === 'dark' || (preference === 'system' && system.matches) ? 'dark' : 'light';
  };
  apply();
  system.addEventListener('change', apply);
})();
