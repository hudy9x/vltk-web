// Stable IDs are independent of catalog ordering; stock always comes from canonical storage.
exports.potions = function(profile, rows) {
  return rows.map(p=>({id:({life:0,mana:100,both:200})[p.kind]+p.tier,
    kind:p.kind,tier:p.tier,level:p.level,hp:p.kind==='mana'?0:p.total,
    mp:p.kind==='mana'?p.total:p.mtotal||0,
    count:Math.max(0,Math.min(1000000,Math.floor(profile.potStock?.[p.kind]?.[p.tier]||0))),
    spent:Math.max(0,Math.floor(profile.onlinePotionSpent?.[p.kind]?.[p.tier]||0))}));
};
