// Visual feedback only: let the existing game handlers process the click.
(function () {
  let pointerId = null;
  let wave = null, waveTimer = null;
  const clearWave = () => {
    if (waveTimer !== null) window.clearTimeout(waveTimer);
    waveTimer = null;
    if (wave) wave.remove();
    wave = null;
  };
  const showWave = (event) => {
    clearWave();
    wave = document.createElement("div");
    wave.className = "mouse-click-wave";
    wave.setAttribute("aria-hidden", "true");
    wave.style.left = event.clientX + "px";
    wave.style.top = event.clientY + "px";
    for (const angle of [0, 90, 180, 270]) {
      const arrow = document.createElement("i");
      arrow.style.setProperty("--direction", angle + "deg");
      wave.appendChild(arrow);
    }
    document.body.appendChild(wave);
    waveTimer = window.setTimeout(clearWave, 460);
  };
  const release = (event) => {
    if (event && event.pointerId !== pointerId) return;
    pointerId = null;
    document.body.classList.remove("game-pointer-down");
  };
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    pointerId = event.pointerId;
    document.body.classList.add("game-pointer-down");
    showWave(event);
  }, true);
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  window.addEventListener("blur", () => release());
  window.addEventListener("blur", clearWave);
  window.addEventListener("pointercancel", (event) => {
    if (pointerId === null || event.pointerId === pointerId) clearWave();
  });
})();
