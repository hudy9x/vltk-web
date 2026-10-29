// Point-based branches only. Trained attacks (80/90, 150) and book 120 skills
// are deliberately absent; the ee support/trap finishers are point-based.
var skillRouteCatalog = {
  shaolin: {
    shared: [10, 15, 16, 20, 21, 273],
    routes: [
      { id: "staff", name: "Côn pháp", skills: [4, 11], main: [319, 1056] },
      { id: "blade", name: "Đao pháp", skills: [6, 19], main: [321, 1057] },
      { id: "fist", name: "Quyền pháp", skills: [8, 14, 271], main: [318, 1055] },
    ],
  },
  tianwang: {
    shared: [33, 40, 42, 36],
    routes: [
      { id: "spear", name: "Thương pháp", skills: [23, 30, 35, 41], main: [323, 1059] },
      { id: "blade", name: "Đao pháp", skills: [24, 34, 37, 32], main: [322, 1058] },
      { id: "hammer", name: "Chùy pháp", skills: [26, 29, 31, 324], main: [325, 1060] },
    ],
  },
  tangmen: {
    shared: [43, 48],
    routes: [
      { id: "dart", name: "Phi tiêu", skills: [45, 47, 341], main: [342, 1071] },
      { id: "knife", name: "Phi đao", skills: [45, 50, 249], main: [339, 1069] },
      { id: "crossbow", name: "Tụ tiễn", skills: [45, 54, 58], main: [302, 1070] },
      { id: "trap", name: "Bẫy", skills: [347, 303, 343, 345, 349, 351], finisher: 351 },
    ],
  },
  wudu: {
    shared: [66, 69, 75],
    routes: [
      { id: "blade", name: "Đao pháp", skills: [60, 65, 384, 74], main: [355, 1066] },
      { id: "palm", name: "Chưởng pháp", skills: [62, 63, 68, 71], main: [353, 1067] },
      { id: "curse", name: "Bùa chú", skills: [67, 70, 64, 73, 356, 72, 390], finisher: 390 },
    ],
  },
  emei: {
    shared: [252],
    routes: [
      { id: "sword", name: "Kiếm pháp", skills: [77, 85, 385, 88, 93, 89, 86, 92, 282], main: [328, 1061] },
      { id: "palm", name: "Chưởng pháp", skills: [79, 80, 82, 91, 93, 89, 86, 92, 282], main: [380, 1062] },
      { id: "support", name: "Hỗ trợ", skills: [93, 89, 86, 92, 282, 332], finisher: 332 },
    ],
  },
  cuiyan: {
    shared: [269, 100, 109, 114],
    routes: [
      { id: "blade", name: "Đơn đao", skills: [95, 99, 105, 108], main: [336, 1063] },
      { id: "dual", name: "Song đao", skills: [97, 102, 113, 111], main: [337, 1065] },
    ],
  },
  gaibang: {
    shared: [129, 277, 130, 360],
    routes: [
      { id: "staff", name: "Bổng pháp", skills: [115, 119, 124, 125], main: [359, 1074] },
      { id: "palm", name: "Chưởng pháp", skills: [116, 122, 274, 128], main: [357, 1073] },
    ],
  },
  tianren: {
    shared: [150],
    routes: [
      { id: "spear", name: "Mâu pháp", skills: [132, 135, 141, 142], main: [361, 1075] },
      { id: "fire", name: "Đao pháp · Nội công", skills: [131, 145, 138, 148], main: [362, 1076] },
      { id: "curse", name: "Bùa chú", skills: [136, 137, 140, 364, 143, 391], finisher: 391 },
    ],
  },
  wudang: {
    shared: [159, 160, 157, 166],
    routes: [
      { id: "qi", name: "Khí công", skills: [152, 153, 164, 165], main: [365, 1078] },
      { id: "sword", name: "Kiếm pháp", skills: [151, 155, 158, 267], main: [368, 1079] },
    ],
  },
  kunlun: {
    shared: [171, 173, 275, 630],
    routes: [
      { id: "blade", name: "Đao pháp", skills: [167, 169, 178, 176], main: [372, 1080] },
      { id: "sword", name: "Kiếm pháp · Lôi pháp", skills: [168, 179, 172, 182], main: [375, 1081] },
      { id: "curse", name: "Bùa chú", skills: [392, 174, 393, 175, 181, 90, 394], finisher: 394 },
    ],
  },
};

var getSkillRoutes = function () {
  const catalog = skillRouteCatalog[o.fac], faction = I[o.fac];
  if (!catalog || !faction || faction.novice) return [];
  return catalog.routes.map(route => ({
    ...route,
    skills: [...new Set([...route.skills, ...catalog.shared])].filter(id => {
      const skill = T[id];
      return faction.skills.includes(id) && skill && skill.tier !== 120 &&
        (![90, 150].includes(skill.tier) || SA(id));
    }),
  }));
};

var selectSkillRoute = function (routeId) {
  const routes = getSkillRoutes();
  const chosen = routes.find(route => route.id === routeId);
  if (chosen) return chosen;
  const saved = routes.find(route => route.id === o.skillRoute);
  if (saved) return saved;
  // A trained main can identify the branch even though it is never allocated.
  const main = routes.find(route => [...route.skills, ...(route.main || [])].includes(+o.main));
  if (main) return main;
  const catalog = skillRouteCatalog[o.fac];
  return routes.slice().sort((a, b) => {
    const score = route => route.skills.reduce((sum, id) =>
      sum + (catalog.shared.includes(id) ? 0 : o.sk[id] || 0), 0);
    return score(b) - score(a);
  })[0];
};

var planSkillRoute = function (routeId) {
  const route = selectSkillRoute(routeId);
  if (!route) return { route: null, rows: [], spent: 0, remaining: o.skPts || 0 };
  const levels = { ...o.sk }, budget = Math.max(0, Math.floor(o.skPts || 0));
  const limit = skill => {
    if (!W2(skill)) return 0;
    if (SA(skill.id)) {
      const lowest = Math.min(...ee[skill.id].map(id => levels[id] || 0));
      return lowest < 5 ? 0 : Math.min(skill.max, 1 + Math.round((lowest - 5) * 19 / 15));
    }
    return Math.max(0, Math.min(skill.max, GA() - skill.req + 1));
  };
  let remaining = budget;
  // Re-evaluate the cap after every point: support finishers unlock at five in
  // EVERY prerequisite, then rise with the lowest prerequisite, exactly as D4.
  while (remaining > 0) {
    let next = null;
    for (const id of route.skills) {
      const skill = T[id], level = levels[id] || 0;
      if (level >= limit(skill) || !P4(skill)) continue;
      if (next === null || level < (levels[next] || 0)) next = id;
    }
    if (next === null) break;
    levels[next] = (levels[next] || 0) + 1;
    remaining--;
  }
  const rows = route.skills.map(id => {
    const skill = T[id], before = o.sk[id] || 0, to = levels[id] || 0;
    let reason = "";
    if (!W2(skill)) reason = `Cần cấp ${skill.req}`;
    else if (!P4(skill)) reason = `Cần ${Fi[skill.book] || "bí kíp"}`;
    else if (SA(id) && !limit(skill)) reason = "Mỗi kỹ năng nền cần đạt 5 điểm";
    else if (to >= skill.max) reason = "Đã tối đa";
    else if (to >= limit(skill)) reason = SA(id) ? "Cần tăng đều kỹ năng nền" : "Đã đạt giới hạn theo cấp";
    return { id, skill, before, to, add: to - before, limit: limit(skill), reason,
      shared: skillRouteCatalog[o.fac].shared.includes(id), prerequisite: !!route.finisher && ee[route.finisher].includes(id) };
  }).sort((a, b) => a.skill.req - b.skill.req || a.id - b.id);
  return { route, rows, spent: budget - remaining, remaining };
};

var applySkillRoute = function (routeId) {
  if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'skillRoute',route:routeId})){return 0;}

  const plan = planSkillRoute(routeId);
  if (!plan.route) return 0;
  let spent = 0;
  // Prerequisites are paid first; Yi remains the authority for level/book/point
  // checks. Re-plan on every click instead of applying a stale preview.
  const rows = plan.rows.slice().sort((a, b) => Number(SA(a.id)) - Number(SA(b.id)));
  for (const row of rows) {
    for (let count = 0; count < row.add; count++) {
      if (!Yi(row.id)) break;
      spent++;
    }
  }
  o.skillRoute = plan.route.id;
  l.dirty = true;
  return spent;
};
