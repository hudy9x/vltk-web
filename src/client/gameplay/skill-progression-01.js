// Shared by manual learning and automatic allocation. Separate from Z2, which
// the legacy consumable shop also defines for Võ Lâm Mật Tịch / Tẩy Tủy Kinh.
var unlockSkillBook = function (id) {
  const skill = T[id];
  if (!skill || !skill.book || (o.sk[id] || 0) > 0 || (o.bkOk && o.bkOk[id])) return true;
  if (skill.tier === 90 && v0() > 0) return true;
  if (N("misc", skill.book) < 1) return false;
  U("misc", skill.book, -1);
  (o.bkOk || (o.bkOk = {}))[id] = 1;
  C(`📖 Lĩnh ngộ <b style="color:#ffd24a">${D(skill.n)}</b> (dùng 1 ${Fi[skill.book]})`);
  return true;
};

// Preserve previously allocated 150 levels, convert them to training progress,
// and refund paid skill points exactly once. Arena/GM presets already have skL.
var migrateAdvancedSkillTraining = function (state) {
  if (state.sk150Training) return;
  state.skL || (state.skL = {});
  state.bkOk || (state.bkOk = {});
  for (const id of Object.keys(state.sk || {})) {
    const skill = T[id], level = state.sk[id] | 0;
    if (!skill || skill.tier !== 150 || level < 1) continue;
    const progress = state.skL[id];
    if (!progress && !state.arenaFaction) state.skPts = (state.skPts || 0) + level;
    state.skL[id] = { lv: Math.min(skill.max, level), xp: Math.max(0, progress && progress.xp || 0) };
    state.bkOk[id] = 1;
  }
  state.sk150Training = 1;
};
