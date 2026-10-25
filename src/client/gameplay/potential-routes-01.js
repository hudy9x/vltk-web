// Loaded once from the validated JSON; captured as plain data by the worker.
var potentialAllocationConfig = PotentialAllocation.config;

var getPotentialProfiles = function (routeId) {
  const route = selectSkillRoute(routeId);
  if (!route) return { route: null, type: "", profiles: [] };
  const branchSkills = skillRouteCatalog[o.fac].routes.find(entry => entry.id === route.id).skills;
  const physical = branchSkills.some(id => T[id] && T[id].phys);
  const type = o.fac === "wudang" ? (physical ? "swordShield" : "shield")
    : o.fac === "tangmen" && route.id !== "trap" ? "ranged"
    : physical ? "physical" : "spell";
  const damageType = physical ? "external" : "internal";
  const override = potentialAllocationConfig.overrides[o.fac] && potentialAllocationConfig.overrides[o.fac][route.id];
  const weights = override || potentialAllocationConfig.defaults[damageType];
  return { route, type, damageType, source: override ? "override" : "default",
    profiles: [{ id: "configured", name: "Theo tuyến", weights: [weights.str, weights.dex, weights.vit, weights.eng] }] };
};

var planPotentialRoute = function (routeId) {
  const { route, type, damageType, source, profiles } = getPotentialProfiles(routeId);
  const budget = Math.max(0, Math.floor(o.attrPts || 0));
  if (!route) return { route: null, profiles: [], rows: [], spent: 0, remaining: budget };
  const profile = profiles[0];
  const keys = ["str", "dex", "vit", "eng"], levels = { ...o.attr };
  const requirements = e4(), equipment = { str: 0, dex: 0, vit: 0, eng: 0 };
  let remaining = budget;
  // Match j5's item/attribute priority, including insufficient point budgets.
  if (potentialAllocationConfig.equipmentFirst) for (const { d } of requirements.list) for (const key of Object.keys(d)) {
    const add = Math.min(remaining, d[key]);
    levels[key] += add; equipment[key] += add; remaining -= add;
  }
  const equipmentSpent = budget - remaining;
  // Exclude mandatory gear points from the ratio, even when those points were
  // paid on an earlier level. This keeps bulk and single-point allocation equal.
  const floor = { str: 0, dex: 0, vit: 0, eng: 0 };
  if (potentialAllocationConfig.equipmentFirst) for (const item of Object.values(o.eq || {})) {
    if (!item) continue;
    for (const [kind, required] of item.req || []) {
      const key = X2[kind];
      if (key) floor[key] = Math.max(floor[key], required - (c1(key) - o.attr[key]), 0);
    }
  }
  const free = Object.fromEntries(keys.map(key => [key, Math.max(0, levels[key] - floor[key])]));
  const eligible = keys.filter((key, index) => profile.weights[index] > 0);
  let total = eligible.reduce((sum, key) => sum + free[key], 0);
  while (remaining > 0) {
    total++;
    let next = eligible[0], deficit = -Infinity;
    for (const key of eligible) {
      const gap = total * profile.weights[keys.indexOf(key)] / 100 - free[key];
      if (gap > deficit) { next = key; deficit = gap; }
    }
    levels[next]++; free[next]++; remaining--;
  }
  const needs = { str: 0, dex: 0, vit: 0, eng: 0 };
  for (const { d } of requirements.list) for (const key of Object.keys(d)) needs[key] += d[key];
  return { route, type, damageType, source, profile, profiles, requirements, equipmentSpent,
    equipmentMissing: keys.reduce((sum, key) => sum + Math.max(0, needs[key] - (levels[key] - o.attr[key])), 0),
    spent: budget - remaining, remaining,
    rows: keys.map((key, index) => ({ key, before: o.attr[key], to: levels[key],
      add: levels[key] - o.attr[key], equipment: equipment[key], weight: profile.weights[index] })) };
};

var applyPotentialRoute = function (routeId) {
  const plan = planPotentialRoute(routeId);
  if (!plan.route) return 0;
  for (const row of plan.rows) o.attr[row.key] += row.add;
  o.attrPts -= plan.spent;
  o.skillRoute = plan.route.id;
  l.dirty = true;
  return plan.spent;
};
