// Reuse the game's native three-state pixel sprites; no text inside tool buttons.
var developerTools = (function () {
  let toolbar;
  let closeSale;
  const panels = { gm:'gm-panel', sim:'sim-panel', room:'combat-sandbox' };
  function closeOpen(except) {
    let closed = false;
    if (except !== 'sale' && closeSale) closed = closeSale() || closed;
    for (const [key,id] of Object.entries(panels)) if (key !== except) {
      const panel = document.getElementById(id);
      if (panel && (key === 'room' ? panel.open : !panel.hidden)) {
        if (key === 'room') panel.open = false; else panel.hidden = true;
        toolbar?.querySelector(`[data-dev-tool="${key}"]`)?.setAttribute('aria-expanded','false');
        closed = true;
      }
    }
    return closed;
  }
  function register(button, kind, label, onClose) {
    if (kind === 'sale') closeSale = onClose;
    if (!toolbar) {
      toolbar = document.createElement('nav'); toolbar.id = 'dev-tools'; toolbar.setAttribute('aria-label','Công cụ thử nghiệm');
      document.body.appendChild(toolbar);
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || event.repeat) return;
        const result = document.getElementById('battlefield-result');
        if (result && !result.hidden) return;
        if (closeOpen()) { event.preventDefault(); event.stopImmediatePropagation(); }
      }, true);
    }
    button.textContent = ''; button.type = 'button'; button.setAttribute('data-dev-tool',kind);
    button.setAttribute('aria-label',label); button.title = label;
    button.addEventListener('click', () => {
      closeOpen(kind);
    });
    toolbar.appendChild(button);
    for (const key of ["gm","sim","sale","room"]) {
      const control = toolbar.querySelector(`[data-dev-tool="${key}"]`); if(control)toolbar.appendChild(control);
    }
  }
  return { register, closeOpen };
})();

var manaNotice = (function () {
  let next = 0;
  return function (skill) {
    if (l.sim || l.quiet || !skill || skill.costLife || !(skill.cost > 0) || l.mana >= skill.cost) return;
    const now = Date.now(); if (now < next) return;
    next = now + 2500; k('Không đủ nội lực (mana) để thi triển. Hãy dùng thuốc hồi nội lực.');
  };
})();
