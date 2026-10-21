// gameplay/shop-and-books — shared IIFE scope; order is defined in modules.json.
var P4 = (s) =>
  !s.book ||
  (s.tier === 90 && v0() > 0) ||
  (o.sk[s.id] || 0) > 0 ||
  !!(o.bkOk && o.bkOk[s.id]) ||
  (typeof N == "function" && N("misc", s.book) > 0);

var ee = {
  332: [93, 89, 86, 92, 282],
  391: [136, 137, 140, 364, 143],
  394: [392, 174, 393, 175, 181, 90],
  390: [67, 70, 64, 73, 356, 72],
  351: [347, 303, 343, 345, 349],
};

var SA = (s) => !!ee[s];

var v4 = (s) => Math.round(25 * Math.pow(s, 1.35) + 25);

var va = () => o.skL || (o.skL = {});

var wn = function (A) {
  return A
    ? UA(A)
      ? "atk"
      : A.aura
        ? Object.keys(A.attr || {}).length || Yn[A.id]
          ? "aura"
          : "none"
        : B7(A)
          ? A.enemy
            ? "curse"
            : "buff"
          : "passive"
    : "none";
};

var ae = function (A, n) {
  let t = 0;
  for (const e in A.attr) {
    if (/^(skill_|missle_|addskill)/.test(e)) continue;
    const a = b0(A, e, n);
    a && a[1] > t && (t = a[1]);
  }
  return t > 0 ? t / k7 : 0;
};

var P7 = function () {
  return Ui()[0] || 0;
};

var v7 = function (A) {
  for (const n of Ui()) Yn[n] && b7(n, A);
};

var b7 = function (A, n) {
  const t = Yn[A];
  if (!t || !l.P || !l.P.main || l.town || l.deadT > 0 || (y4[A] = (y4[A] || 0) - n) > 0) return;
  y4[A] = t.every;
  const e = Math.max(1, zi(A)),
    a = i6(A, e);
  if (!(a > 0)) return;
  // Aura damage bypasses hs(); use the same eligible targets as ordinary attacks.
  const i = _1().filter((c) => q0(v, c) <= t.rad);
  if (!i.length) return;
  const r = F0();
  for (const c of i) {
    // The aura applies poison without a projectile; show its native contact sprite.
    if (+A === 69 && !l.quiet && A0.m[94] && typeof gf === "function")
      gf({ m: A0.m[94] }, c.x, c.y - 14);
    const d = Rn(c),
      f = d ? Object.fromEntries(Q0.map((g) => [g, c.res[g] + (d.res[g] || 0)])) : c.res;
    let h =
      ja(
        a * Z(0.9, 1.1) * (d && d.poison ? 1 + d.poison / 100 : 1),
        t.el,
        r,
        c.series,
        f,
        75,
        l.P.series5 || 0,
      ) * ea();
    if (typeof arenaSimulator !== "undefined" && arenaSimulator && arenaSimulator.pvpDamageScale)
      h *= arenaSimulator.pvpDamageScale(v, c);
    if (h > 0 && typeof arenaSimulator !== "undefined" && arenaSimulator && typeof arenaSimulator.recordBattlefieldHit === "function") arenaSimulator.recordBattlefieldHit(v,c);
    if (
      (t.el === "poison" && !(c.poison > 0) && typeof Tt == "function" && Tt(c, "Độc", "#8fe34a"),
      t.el === "poison")
    ) {
      const g = c.poison > 0 ? c.poisonDmg * c.poison : 0;
      const battleSim = c.arenaSim && l.battlefield;
      const reduction = battleSim ? Math.max(0, 1 - Math.min(100, c.stats.poisonRed || 0) / 100) : 1;
      const duration = battleSim ? Math.max(c.poison || 0, ve * reduction) : ve;
      c.poisonDmg = duration > 0 ? (g + h * reduction) / duration : 0;
      c.poison = duration;
    } else { c.hp -= h; applyActorHurt(c, h, c.max); }
  }
};

var Vi = function (A) {
  const n = wn(A);
  return n === "passive"
    ? !0
    : n === "aura"
      ? o6(A.id)
      : n === "buff"
        ? b4(A.id) || !!l.buffAssume
        : !1;
};

// Slots expose only skills whose combat effects are implemented.
var canSlotSkill = function (id) {
  const skill = T[id];
  return !!(skill && o.sk[id] > 0 && skill.tier !== 120 &&
    ["atk", "buff", "curse", "aura"].includes(wn(skill)));
};

var castSupportSkill = function (id) {
  const skill = T[id], kind = skill && wn(skill);
  const fail = message => { k(message); return false; };
  if (!canSlotSkill(id) || kind === "atk") return false;
  if (!l.P || l.town || l.deadT > 0) return fail("Chỉ dùng chiêu hỗ trợ khi đang ở bãi luyện công");
  if (l.stunT > 0 || actorActionLocked(v)) return fail("Chưa thể thi triển khi đang xuất chiêu hoặc bị khống chế");
  if (kind === "aura") {
    const off = o.auraOff || (o.auraOff = {});
    if (off[id]) delete off[id]; else off[id] = 1;
    l.dirty = true; D0(); qA(); $();
    k(`${off[id] ? "Tắt" : "Bật"} vòng sáng: ${skill.n}`);
    return true;
  }
  const state = ba(), now = ya(), level = zi(id), duration = ae(skill, level);
  if ((state.cd[id] || 0) > now) return fail(`Chiêu hồi sau ${Math.ceil(state.cd[id] - now)}s`);
  if (kind === "buff" && b4(id)) return fail("Bùa lợi vẫn còn hiệu lực");
  const cost = M7(skill, level), lifeCost = i4(skill);
  if (lifeCost ? l.life - cost < Math.max(1, l.P.life * 0.25) : l.mana < cost)
    return fail(lifeCost ? "Không đủ sinh lực để thi triển" : "Không đủ nội lực để thi triển");
  const heal = kind === "buff" && duration < 5;
  const healing = heal && b0(skill, "lifereplenish_v", level);
  if (!(duration > 0) || (heal && !(healing && healing[0] > 0))) return fail("Chiêu chưa có hiệu ứng hỗ trợ khả dụng");
  if (heal && l.life >= l.P.life) return fail("Sinh lực đã đầy");
  let target;
  if (kind === "curse") {
    const targets = typeof _1 === "function" ? _1() : l.enemies;
    target = [l.manTgt, l.tgt].find(actor => actor && !actor.dead && actor.hp > 0 && targets.includes(actor));
    if (!target) return fail("Hãy chọn mục tiêu để thi triển bùa hại");
    if (q0(v, target) > 420) return fail("Mục tiêu ở quá xa");
    if ((target.curse || {})[id] > now) return fail("Mục tiêu vẫn đang chịu bùa hại này");
  }
  if (!beginActorCast(v)) return false;
  if (lifeCost) l.life = Math.max(1, l.life - cost); else l.mana -= cost;
  const cooldownRow = b0(skill, l.mounted && skill.attr.skill_mintimepercastonhorse_v
    ? "skill_mintimepercastonhorse_v" : "skill_mintimepercast_v", level);
  const cooldown = Math.max(heal ? 8 : kind === "curse" ? 5 : 0, cooldownRow ? cooldownRow[0] / k7 : 0);
  state.cd[id] = now + cooldown;
  if (kind === "buff") {
    if (heal) za(healing[0] * duration * 2, false);
    else state.buff[id] = now + duration;
    l.dirty = true;
  } else {
    queueSkillContact(v, target, {
      id: +id, L: level, parts: {}, melee: false, rad: 420,
      geo: { k: "spot", r: 120, pierce: true },
    }, actor => {
      (actor.curse || (actor.curse = {}))[id] = ya() + Math.min(duration, 60);
    }, { maxTargets: Infinity });
  }
  if (typeof o0 === "function") o0("use");
  qA(); k(`Thi triển: ${skill.n}`);
  return true;
};

var A6 = function (A) {
  if ((v7(A), (k4 -= A), k4 > 0 || ((k4 = 0.5), !o.fac || !l.P || l.deadT > 0 || l.town))) return;
  const n = ya(),
    t = ba();
  let e = !1;
  for (const i in t.buff) t.buff[i] <= n && t.buff[i] > 0 && ((t.buff[i] = 0), (e = !0));
  if (typeof Y !== "undefined" && (Y.pendingSupport ||
    (typeof Y.hasMovementInput === "function" && Y.hasMovementInput()) || (Y.tmp && Y.target && !hA()))) {
    if (e) l.dirty = !0;
    return;
  }
  const a = l.enemies.some((i) => !i.dead);
  for (const i in o.sk) {
    if (actorActionLocked(v)) break;
    const r = T[i];
    if (!(o.sk[i] || 0)) continue;
    const d = wn(r);
    if (
      (d !== "buff" && d !== "curse") ||
      (o.supportAutoOff && o.supportAutoOff[i]) ||
      (t.cd[i] || 0) > n ||
      (d === "buff" && o.autoBuff === !1) ||
      (d === "curse" && o.autoCurse === !1)
    )
      continue;
    const f = zi(i),
      h = M7(r, f),
      g = ae(r, f),
      u = i4(r),
      w = () => {
        beginActorCast(v);
        u ? (l.life = Math.max(1, l.life - h)) : (l.mana -= h);
        const row = typeof b0 === "function" && r.attr && b0(r,
          l.mounted && r.attr.skill_mintimepercastonhorse_v
            ? "skill_mintimepercastonhorse_v" : "skill_mintimepercast_v", f);
        t.cd[i] = n + Math.max(d === "curse" ? 5 : 0, row ? row[0] / k7 : 0);
      };
    if (!(g > 0)) continue;
    if (!(u ? l.life < h + l.P.life * 0.3 : l.mana < h + l.P.mana * 0.15)) {
      if (d === "buff") {
        if (b4(i)) continue;
        if (g < 5) {
          if (!(a && l.life < l.P.life * 0.6) || (t.cd[i] || 0) > n) continue;
          const x = b0(r, "lifereplenish_v", f);
          (w(),
            za((x ? x[0] : 0) * g * 2, !1),
            (t.cd[i] = Math.max(t.cd[i], n + 8)),
            $A(v.x, v.y - 60, "✚ " + r.n, "#8f8", 12));
          continue;
        }
        (w(), (t.buff[i] = n + g), (e = !0), typeof o0 == "function" && o0("use"));
      } else if (a) {
        const p = l.enemies
          .filter((_) => !_.dead && _.hp > 0 && q0(v, _) <= 420 && !((_.curse || {})[i] > n))
          .sort(
            (_, y) =>
              (y.cls === "boss") - (_.cls === "boss") ||
              (y.cls === "elite") - (_.cls === "elite") ||
              Math.hypot(_.x - v.x, _.y - v.y) - Math.hypot(y.x - v.x, y.y - v.y),
          )[0];
        if (
          !p ||
          q0(v, p) > 420 ||
          (p.cls === "normal" && l.enemies.filter((_) => !_.dead).length < 3)
        )
          continue;
        w();
        queueSkillContact(v, p, {
          id: +i, L: f, parts: {}, melee: false, rad: 420,
          geo: { k: "spot", r: 120, pierce: true },
        }, target => {
          (target.curse || (target.curse = {}))[i] = ya() + Math.min(g, 60);
        }, { maxTargets: Infinity });
      }
    }
  }
  e && (l.dirty = !0);
};

var Rn = function (A) {
  const n = A.curse;
  if (!n) return null;
  const t = ya(),
    e = { res: {}, def: 0, ar: 0, dmg: 0, ret: 0, slow: 0, regen: 0, poison: 0, crit: 0 };
  let a = !1;
  for (const i in n) {
    if (n[i] <= t) continue;
    const r = T[i],
      c = Math.max(1, (A.curseL && A.curseL[i]) || zi(i));
    if (r) {
      a = !0;
      for (const d in r.attr) {
        if (/^(skill_|missle_|addskill)/.test(d)) continue;
        const f = b0(r, d, c);
        if (!f) continue;
        const h = f[0];
        if (d === "allres_p") for (const g of Q0) e.res[g] = (e.res[g] || 0) + h;
        else if (/res_p$/.test(d)) {
          const g = d.startsWith("physics")
            ? "phys"
            : d.startsWith("lighting")
              ? "light"
              : d.replace("res_p", "");
          e.res[g] = (e.res[g] || 0) + h;
        } else
          d === "adddefense_v"
            ? (e.def += h)
            : d === "attackratingenhance_p"
              ? (e.ar += h)
              : d === "addphysicsdamage_p"
                ? (e.dmg += h)
                : d === "meleedamagereturn_p"
                  ? (e.ret += -h)
                  : d === "fasthitrecover_v"
                    ? (e.slow += -h)
                    : d === "lifereplenish_v"
                      ? (e.regen += h)
                      : d === "poisontimereduce_p"
                        ? (e.poison += -h)
                        : d === "deadlystrikeenhance_p" && (e.crit += h);
      }
    }
  }
  return a ? e : null;
};

var y7 = function (A) {
  const n = wn(A),
    t = o.sk[A.id] || 0;
  if (n === "buff") {
    const e = ae(A, Math.max(1, t));
    return e < 5
      ? '<span class="tag buff">Hồi phục</span>'
      : `<span class="tag buff">Bùa lợi ${Math.round(e)}s</span>${t && b4(A.id) ? ` <small class="cp">đang có ${Math.ceil(ba().buff[A.id] - ya())}s</small>` : ""}`;
  }
  return n === "aura" && Yn[A.id]
    ? `<span class="tag aura">Vòng sáng độc</span> <small class="dim">mỗi ${String(Math.round(Yn[A.id].every * 100) / 100).replace(".", ",")}s phủ độc quái trong ${Yn[A.id].rad} · độc ${Yn[A.id].tab[Math.min(Math.max(1, t + ((l.P && l.P.plusSkill) || 0)), 30) - 1]} điểm/lần → ~${F(i6(A.id, Math.max(1, t + ((l.P && l.P.plusSkill) || 0))))}/nhịp</small>${t ? (P7() === A.id ? ' <small class="cp">● đang bật</small>' : ` <button class="btn sm" data-aura="${A.id}">Bật</button>`) : ""}`
    : n === "aura"
      ? `<span class="tag aura">Vòng sáng</span>${t ? (o6(A.id) ? ` <small class="cp">● đang bật</small> <button class="btn sm" data-aura="${A.id}">Tắt</button>` : ` <button class="btn sm" data-aura="${A.id}">Bật</button>`) : ""}`
      : n === "curse"
        ? `<span class="tag curse">Bùa hại ${Math.round(Math.min(60, ae(A, Math.max(1, t))))}s</span>`
        : n === "passive"
          ? '<span class="tag">Bị động</span>'
          : "";
};

var n6 = function (A) {
  A.querySelectorAll("[data-aura]").forEach(
    (n) =>
      (n.onclick = (t) => {
        t.stopPropagation();
        const e = n.dataset.aura,
          a = o.auraOff || (o.auraOff = {});
        (a[e] ? delete a[e] : (a[e] = 1),
          (l.dirty = !0),
          D0(),
          $(),
          k(`${a[e] ? "Tắt" : "Bật"} vòng sáng: ${T[e].n}`),
          V());
      }),
  );
};

var t6 = function () {
  return `<label><input type="checkbox" id="cBuff" ${o.autoBuff === !1 ? "" : "checked"}> Tự thi triển bùa lợi khi hết thời gian (tốn nội lực)</label>
    <label><input type="checkbox" id="cCurse" ${o.autoCurse === !1 ? "" : "checked"}> Tự thi triển bùa hại lên trùm, tinh anh hoặc đám từ 3 quái</label>`;
};

var e6 = function () {
  const A = m("#cBuff"),
    n = m("#cCurse");
  (A &&
    (A.onchange = () => {
      ((o.autoBuff = A.checked), $());
    }),
    n &&
      (n.onchange = () => {
        ((o.autoCurse = n.checked), $());
      }));
};

var a6 = function () {
  const A = [];
  a4() &&
    A.push({
      ic: "img/ep/tanthu.png",
      t: -1,
      n: `Hỗ Trợ Tân Thủ: mỗi giây hồi ${kt.life * 100}% sinh lực, ${kt.mana * 100}% nội lực, +${qi * 100}% kinh nghiệm (đến cấp ${pa})`,
    });
  for (const e of Ui()) A.push({ ic: T[e].ic, t: -1, n: "Vòng sáng: " + T[e].n });
  const n = ya();
  for (const e in ba().buff)
    ba().buff[e] > n && T[e] && o.sk[e] && A.push({ ic: T[e].ic, t: ba().buff[e] - n, n: T[e].n });
  const t = Date.now();
  for (const e in o.buf || {}) {
    const a = o.buf[e];
    a &&
      a.until > t &&
      Ss[e] &&
      A.push({
        ic: H7[e] || "img/ep/fd.png",
        t: (a.until - t) / 1e3,
        n: `${Ss[e]} +${Ih(e) ? Math.round(a.p) : Math.round(a.p * 100) + "%"}`,
      });
  }
  return A;
};

var k7 = 18;

var x7 = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7];

var Yn = { 69: { el: "poison", every: 10 / 18, rad: 180, tab: x7, col: "#8fe34a" } };

var s6 = (s) => {
  const A = Yn[s],
    n = T[s] && T[s].attr && T[s].attr.poisondamage_v;
  return (
    A.sk ||
    (A.sk = Object.assign({}, T[s], {
      aura: 0,
      attr: { poisondamage_v: n || A.tab.map((t) => [t, 60, 10]) },
    }))
  );
};

var i6 = (s, A) => {
  const n = Yn[s],
    t = Math.min(A, (s6(s).attr.poisondamage_v || n.tab).length);
  return (l.P && (F2(l.P, s6(s), t).parts || {})[n.el]) || 0;
};

var B7 = (s) => !!(s.attr && s.attr.skill_cost_v);

var _7 = {
  atk: "Tấn công",
  passive: "Bị động",
  buff: "Bùa lợi",
  aura: "Vòng sáng",
  curse: "Bùa hại",
  none: "—",
};

var M7 = (s, A) => (b0(s, "skill_cost_v", A) || [0])[0] || 0;

var ba = () => l.sks || (l.sks = { buff: {}, cd: {} });

var ya = () => l.clock || 0;

var b4 = (s) => (ba().buff[s] || 0) > ya() && !!o.sk[s];

var Ui = () =>
  Object.keys(o.sk || {})
    .filter((s) => o.sk[s] && T[s] && wn(T[s]) === "aura" && !(o.auraOff || {})[s])
    .map(Number);

var o6 = (s) => Ui().includes(+s);

var y4 = {};

var k4 = 0;

var r6 = (s) => !!Rn(s);

var H7 = {
  tt: "img/ep/tt.png",
  tt2: "img/ep/ttsp.png",
  luck2: "img/ep/tsbl.png",
  luck: "img/ep/qht.png",
  xp: "img/ep/fd.png",
  drop: "img/ep/mys.png",
};

var $7 = (s) =>
  s < 0
    ? "N/A"
    : s >= 3600
      ? Math.floor(s / 3600) + "h"
      : s >= 60
        ? Math.floor(s / 60) + "m"
        : Math.ceil(s) + "s";

var T7 = function (A) {
  const n = Math.min(ns(A), N("misc", A)),
    t = J0.find((e) => e.k === A);
  !n ||
    !t ||
    (U("misc", A, -n),
    Dr("book", n * t.knb),
    (R = !0),
    C(
      `🏮 Bán lại ${n} ${t.n} dư cho Kỳ Trân Các: +<b class="gold">${n * t.knb} Kim Nguyên Bảo</b>`,
    ),
    k(`+${n * t.knb} Kim Nguyên Bảo`),
    $(),
    typeof V == "function" && V());
};

var Z2 = function (A) {
  if (!(N("misc", A) < 1)) {
    if (!Bt()) {
      k("Cần cấp 80 (hoặc đã chuyển sinh) mới dùng được");
      return;
    }
    if (!O4(A)) {
      k(`Đã dùng tối đa ${XA(A)} cuốn`);
      return;
    }
    (U("misc", A, -1),
      C("📖 " + x4(A)),
      (R = !0),
      (l.dirty = !0),
      $(),
      typeof V == "function" && V());
  }
};

var x4 = function (A) {
  {
    const t = pn(A) + 1;
    o.useN[A] = t;
  }
  if (A === "vlmt")
    return (
      (o.skPts = (o.skPts || 0) + 1),
      (o.bonusSkp = (o.bonusSkp || 0) + 1),
      `Võ Lâm Mật Tịch: +1 điểm kỹ năng (${pn(A)}/${XA(A)})`
    );
  const n = R7();
  return (
    (o.attrPts = (o.attrPts || 0) + n),
    (o.bonusAtp = (o.bonusAtp || 0) + n),
    `Tẩy Tủy Kinh: +${n} điểm tiềm năng (${pn(A)}/${XA(A)})`
  );
};

var se = function (A, n) {
  return `${A.n}${n > 1 ? " ×" + n : ""}`;
};

var B4 = function (A, n) {
  const t = J0.find((a) => a.k === A);
  if (!t) return !1;
  const e = o.inv.find((a) => a.ktc && a.ktc.k === A && a.ktc.c < Wi);
  if (e) {
    const a = Math.min(n, Wi - e.ktc.c);
    ((e.ktc.c += a), (e.n = se(t, e.ktc.c)), (n -= a));
  }
  for (; n > 0;) {
    if (o.inv.length >= INV_MAX) return !1;
    const a = Math.min(n, Wi);
    (o.inv.push({
      uid: o.uid++,
      n: se(t, a),
      d: 99,
      k: 0,
      lvl: 1,
      s: -1,
      r: 2,
      ic: t.ic,
      price: 0,
      base: [],
      req: [],
      mag: [],
      ext: [],
      ktc: { k: A, c: a },
    }),
      (n -= a));
  }
  return ((R = !0), !0);
};

var c6 = function (A) {
  const n = A && A.ktc && J0.find((a) => a.k === A.ktc.k);
  if (!n || !o.inv.includes(A)) return !1;
  if (n.srv) return (L7(n.k), !1);
  const t = n.k;
  let e = "";
  if (t === "vlmt" || t === "ttk") {
    if (!Bt()) return (k("Cần cấp 80 (hoặc đã chuyển sinh) mới dùng được"), !1);
    if (!O4(t)) return (k(`Đã dùng tối đa ${XA(t)} cuốn`), !1);
    e = x4(t);
  } else
    t === "ldt" || t === "ldp" || t === "dgt" || t === "dtbk" || t === "rngua"
      ? (U("misc", t, 1), (e = `Cất 1 ${n.n} vào túi vật phẩm`))
      : t === "mt90"
        ? (U("misc", "bk90", 1), (e = "Cất 1 Bí Kíp 90 (lĩnh ngộ ở thẻ Võ công)"))
        : (e = n.use());
  return (
    A.ktc.c--,
    A.ktc.c <= 0 ? o.inv.splice(o.inv.indexOf(A), 1) : (A.n = se(n, A.ktc.c)),
    t === "rngua" && typeof it == "function" && it(1),
    C("🏮 " + D(e)),
    (R = !0),
    (l.dirty = !0),
    $(),
    typeof V == "function" && V(),
    !0
  );
};

var l6 = function (A, n) {
  if (A === "ldp") return As();
  if (A === "dgt") return M4();
  const t = () => {
    (n0(!0), (typeof zn == "function" && zn() ? mi : fA)("skill"));
  };
  if (A === "dtbk") {
    (t(), k("Bấm 📕 ở võ công 90 hoặc 150 đã học để luyện đến cấp tối đa"));
    return;
  }
  if (A === "mt90") {
    (t(), k("Bấm + ở võ công 90 để lĩnh ngộ (không tốn điểm)"));
    return;
  }
  if (A === "mt120" || A === "mt150") {
    t();
    k(A === "mt120" ? "Bấm + ở chiêu 120 để lĩnh ngộ bằng Bí Kíp 120, sau đó cộng điểm kỹ năng"
      : "Bấm + ở chiêu 150 để lĩnh ngộ bằng Bí Kíp 150, sau đó rèn luyện hoặc dùng Đại Thành Bí Kíp");
    return;
  }
  if (A === "ldt") return (f2(!1), iA());
  if (A === "rngua") return (it(n), iA());
};

var C7 = function (A, n = 1) {
  const t = J0.find((i) => i.k === A);
  if (!t || !es(t)) return;
  if (A === "mt90" && o.lvl < 80 && !v0()) {
    k("Võ công 90 cần cấp 80");
    return;
  }
  if (A === "ldt" && o.lvl < kA) {
    k(`Dã Tẩu mở từ cấp ${kA}`);
    return;
  }
  const e = ts[A];
  if (e && N("misc", e) >= (A === "rngua" ? n : 1)) return l6(A, n);
  let a = 0;
  for (let i = 0; i < n; i++) {
    let r = o.inv.find((c) => c.ktc && c.ktc.k === A);
    if (!r && (A === "vlmt" || A === "ttk") && N("misc", A) > 0) {
      if (!Bt()) {
        k("Cần cấp 80 (hoặc đã chuyển sinh) mới dùng được");
        break;
      }
      if (!O4(A)) {
        k(`Đã dùng tối đa ${XA(A)} cuốn`);
        break;
      }
      (U("misc", A, -1), C("🏮 " + D(x4(A))), a++);
      continue;
    }
    if (!r) break;
    if (A === "rngua") {
      (r.ktc.c--,
        r.ktc.c <= 0 ? o.inv.splice(o.inv.indexOf(r), 1) : (r.n = se(t, r.ktc.c)),
        U("misc", "rngua", 1),
        a++);
      continue;
    }
    if (!c6(r) || (a++, e)) break;
  }
  if (!a) return iA();
  if (e) return l6(A, a);
  (a > 1 && k(`Đã dùng ${t.n} ×${a}`), iA());
};

var d6 = function () {
  document
    .querySelectorAll("#mBody [data-ktcuse]")
    .forEach((A) => (A.onclick = () => C7(A.dataset.ktcuse, 1)));
};

var O7 = function (A, n) {
  const t = A && A.ktc && J0.find((e) => e.k === A.ktc.k);
  if (((n = Math.floor(n)), !(!t || !(n > 0) || n >= A.ktc.c))) {
    if (o.inv.length >= INV_MAX) {
      k("Hành trang đầy");
      return;
    }
    ((A.ktc.c -= n),
      (A.n = se(t, A.ktc.c)),
      o.inv.push({
        uid: o.uid++,
        n: se(t, n),
        d: 99,
        k: 0,
        lvl: 1,
        s: -1,
        r: 2,
        ic: t.ic,
        price: 0,
        base: [],
        req: [],
        mag: [],
        ext: [],
        ktc: { k: t.k, c: n },
      }),
      (R = !0),
      $());
  }
};

var f6 = function s(A) {
  const n = J0.find((e) => e.k === A.ktc.k) || { n: A.n, d: "" },
    t = A.ktc.c;
  J(
    `<h3>${D(A.n)}</h3><p class="desc">${D(n.d || "")}</p><p class="small">${n.hide ? "" : `Giá Kỳ Trân Các: <b class="gold">${n.knb || 0} KNB</b> · `}đang có <b>${t}</b></p>
    <div class="row">Số lượng tách: <input id="kiN" type="number" min="1" max="${Math.max(1, t - 1)}" value="1" style="width:70px"></div>
    <div class="btnrow"><button class="btn" id="kiUse">Dùng 1</button><button class="btn" id="kiSplit" ${t > 1 ? "" : "disabled"}>Tách ra</button><button class="btn" id="kiClose">Đóng</button></div>
    <p class="dim small">Gửi thư / bày bán Chợ: chọn món này như trang bị (tách ra trước nếu chỉ muốn bán một phần).</p>`,
    () => {
      ((m("#kiUse").onclick = () => {
        (c6(A), o.inv.includes(A) ? s(A) : n0(!0));
      }),
        (m("#kiSplit").onclick = () => {
          (O7(A, +m("#kiN").value), n0(!0), typeof V == "function" && V());
        }),
        (m("#kiClose").onclick = () => n0(!0)));
    },
  );
};

var E7 = function (A) {
  if (((A = Math.min(Math.floor(A), o.knb | 0)), !(A > 0))) {
    k("Không đủ Kim Nguyên Bảo");
    return;
  }
  ((o.knb -= A),
    (o.gold += A * Xi),
    C(`🏮 Đổi ${A} Kim Nguyên Bảo → <b>${q(A * Xi)}</b> lượng`),
    k(`+${q(A * Xi)} lượng`),
    $(),
    typeof V == "function" && V());
};

var S7 = function () {
  const A = o.invX | 0,
    n = r1[A];
  if (n == null) {
    k("Đã mở rộng tối đa");
    return;
  }
  if ((o.knb | 0) < n) {
    k("Không đủ Kim Nguyên Bảo");
    return;
  }
  ((o.knb -= n),
    (o.invX = A + 1),
    (R = !0),
    C(`🎒 Mở rộng hành trang (Rương ${A + 1}): −${n} KNB → <b>${INV_MAX} ô</b>`),
    k(`Hành trang ${INV_MAX} ô`),
    o0 && o0("learn"),
    $(),
    typeof V == "function" && V());
};

var L_ = function s() {
  J(
    `<h3>🎒 Mở rộng hành trang</h3><div class="u2cards">${I7()}</div><p class="small dim">Như JX1: Rương 1 / 2 / 3 giá ${r1.join(" / ")} KNB, mỗi rương +${Ae} ô (tối đa ${K2 + Ae * r1.length}).</p>`,
  );
  const A = document.querySelector("#mBody [data-invx]");
  A && (A.onclick = () => S4().then(() => s()));
};

var I7 = function () {
  const A = o.invX | 0,
    n = r1[A];
  return `<div class="u2card" title="Mở rộng hành trang như JX1"><div class="u2ct">Mở rộng hành trang</div><div class="u2cb"><img src="img/ep/knb.png" alt=""><div><div>${n == null ? "Đã mở đủ 3 rương" : `Rương ${A + 1}: <b>+${Ae} ô</b>`}</div><small class="dim">${INV_MAX}/${K2 + Ae * r1.length} ô · ${r1.map((t, e) => (e < A ? "✓" : "") + t).join(" / ")} KNB</small></div></div><div class="u2cf">${n == null ? "" : `<button class="u2buy" data-invx="1" ${(o.knb | 0) >= n ? "" : "disabled"}>${n} KNB</button>`}</div></div>`;
};

var _4 = function (A) {
  const n = T[A],
    t = o && I[o.fac];
  return !!(
    n &&
    [90, 150].includes(n.tier) &&
    t &&
    (t.skills || []).some((e) => +e == +A) &&
    (o.sk[A] | 0) >= 1 &&
    (o.sk[A] | 0) < n.max &&
    (typeof W2 != "function" || W2(n)) &&
    (typeof SA != "function" || !SA(A)) &&
    (!n.book || (o.bkOk && o.bkOk[A]) || (va()[A] && va()[A].lv >= 1))
  );
};

var h6 = function (A) {
  const n = T[A];
  if (!n || N("misc", "dtbk") < 1) return;
  if (!_4(A)) {
    k("Phải học võ công 90 hoặc 150 này trước mới dùng được Đại Thành Bí Kíp");
    return;
  }
  const t = va(),
    e = t[A] || (t[A] = { lv: o.sk[A], xp: 0 });
  if (e.lv >= n.max) {
    k("Đã đại thành");
    return;
  }
  (U("misc", "dtbk", -1),
    (e.lv = n.max),
    (e.xp = 0),
    (o.sk[A] = n.max),
    (l.dirty = !0),
    D0(),
    C(`📕 Dùng Đại Thành Bí Kíp: <b style="color:#ffd24a">${D(n.n)}</b> đại thành cấp ${n.max}!`),
    k(`${n.n} cấp ${n.max}`),
    o0("levelup"),
    $(),
    V());
};

var u6 = function (A, n = 1, t = !1) {
  const e = J0.find((c) => c.k === A);
  if (!e || !es(e)) return;
  let a = 0;
  const i = [];
  for (let c = 0; c < n && ie(e); c++) {
    const d = G1.includes(e.k);
    if (d && !Y7(e.k)) {
      k("Hành trang đầy");
      break;
    }
    (e.knb ? (o.knb -= e.knb) : (o.gold -= e.gold),
      d ? (B4(e.k, 1), i.push(`Nhận 1 ${e.n} (vào hành trang, bán Chợ được)`)) : i.push(e.use()),
      a++);
  }
  if (!a)
    return (
      k(
        e.can && !e.can()
          ? Bt()
            ? `Đã dùng tối đa ${XA(e.k)} cuốn`
            : "Cần cấp 80"
          : e.knb
            ? "Không đủ Kim Nguyên Bảo"
            : "Không đủ ngân lượng",
      ),
      0
    );
  Q().stat.ktc = (Q().stat.ktc || 0) + a;
  const r = i[i.length - 1];
  return (
    C(
      `🏮 Kỳ Trân Các: ${a > 1 ? `mua ${a} × ${D(e.n)} · ` : ""}${D(a > 1 && e.k.startsWith("r") ? i.join(" · ") : r)} (−${e.knb ? e.knb * a + " Kim Nguyên Bảo" : q(e.gold * a) + " lượng"})`,
    ),
    t || k(a > 1 ? `${e.n} ×${a}` : r),
    o0("learn"),
    (l.dirty = !0),
    (R = !0),
    $(),
    t || iA(),
    a
  );
};

var iA = function s() {
  const A = l.P ? Math.round(l.P.lucky) : 0;
  J(
    `<h3>🏮 Kỳ Trân Các <small><img src="img/ep/knb.png" alt="" style="height:14px;vertical-align:middle;image-rendering:pixelated"> ${o.knb || 0} Kim Nguyên Bảo · ${q(o.gold)} lượng</small></h3>
    <p class="desc">Giá cố định. Mua bằng <b>Kim Nguyên Bảo</b> (rơi từ trùm 10%, trùm Hoàng Kim / boss tuần 50%); Rương Huyền Tinh và Rương Đá Thuộc Tính mua bằng ngân lượng. Mua là dùng ngay; riêng Võ Lâm Mật Tịch, Tẩy Tủy Kinh, Rương Ngựa vào Hành trang (bán Chợ được), bấm <b>Dùng</b> để dùng.</p>
    ${m6()}${qt() ? `<div class="card small">Đang có: ${qt()}</div>` : ""}
    <div class="shoplist">${J0.filter((n) => !n.hide)
      .map((n) => {
        const t = es(n),
          e = n.can ? ` · đã dùng ${pn(n.k)}/${XA(n.k)}${Bt() ? "" : " · cần cấp 80"}` : "",
          a =
            ts[n.k]
              ? N("misc", ts[n.k])
              : n.k === "dtbk"
                ? N("misc", "dtbk")
                : n.k === "ldp"
                  ? N("misc", "ldp")
                  : n.k === "ldt"
                    ? N("misc", "ldt")
                    : n.k === "dgt"
                      ? N("misc", "dgt")
                      : n.k === "rngua"
                        ? N("misc", "rngua")
                        : n.k === "knb"
                          ? `${Ji().n} hôm nay (không giới hạn)`
                          : null;
        return `<div class="shoprow ktc${t ? "" : " bad"}"><img src="${n.ic}" alt="" style="image-rendering:pixelated"><span><b>${D(n.n)}</b><small>${D(n.d)}${e}${a != null ? (n.k === "knb" ? ` · đã đổi ${a}` : ` · có ${a}`) : ""}${t ? "" : " · cần phiên bản 2 (đổi ở thẻ Khác)"}</small></span>
        <span class="btnrow"><button class="btn sm${n.knb ? " knb" : ""}" data-ktc="${n.k}" ${t && ie(n) ? "" : "disabled"}>${w6(n)}</button>${n.k === "dtbk" || n.k === "ldp" || n.k === "dgt" ? "" : `<button class="btn sm" data-ktc10="${n.k}" ${t && ie(n, 10) ? "" : "disabled"}>×10</button>`}${n.k === "knb" ? `<button class="btn sm" data-ktc100="knb" ${t && ie(n, 100) ? "" : "disabled"}>×100</button>` : ""}${g6(n, "btn sm")}</span></div>`;
      })
      .join("")}</div>
    <p class="dim small">May mắn hiện tại: <b>${A}</b> (trang bị + Quế Hoa Tửu). Mỗi điểm: đồ rơi có nhiều dòng / dòng cấp cao hơn, +0,5% tỉ lệ rơi đồ.</p>`,
    () => {
      (document
        .querySelectorAll("#mBody [data-ktc]")
        .forEach((d) => (d.onclick = () => Ba(d.dataset.ktc, 1))),
        document
          .querySelectorAll("#mBody [data-ktc10]")
          .forEach((d) => (d.onclick = () => Ba(d.dataset.ktc10, 10))),
        d6(),
        document
          .querySelectorAll("#mBody [data-ktc100]")
          .forEach((d) => (d.onclick = () => Ba(d.dataset.ktc100, 100))));
      const n = m("#ktcLdp");
      n && (n.onclick = As);
      const t = m("#ktcMt");
      t &&
        (t.onclick = () => {
          if (o.lvl < 80 && !v0()) {
            k("Võ công 90 cần cấp 80");
            return;
          }
          (n0(!0), fA("skill"), k("Bấm + ở võ công 90 để lĩnh ngộ (không tốn điểm)"));
        });
      const e = m("#ktcDgt");
      e && (e.onclick = M4);
      const a = m("#ktcDtbk");
      a &&
        (a.onclick = () => {
          (n0(!0), fA("skill"), k("Bấm 📕 ở võ công 90 hoặc 150 đã học để luyện đến cấp tối đa"));
        });
      const i = m("#ktcRngua");
      i &&
        (i.onclick = () => {
          (it(1), s());
        });
      const r = m("#ktcRngua10");
      r &&
        (r.onclick = () => {
          (it(10), s());
        });
      const c = m("#ktcLdt");
      c &&
        (c.onclick = () => {
          if (o.lvl < kA) {
            k(`Dã Tẩu mở từ cấp ${kA}`);
            return;
          }
          (f2(!1), s());
        });
    },
  );
};

var As = function () {
  if (!o.fac || ht()) {
    k("Vô Môn Phái: gia nhập môn phái ở cấp " + KA);
    return;
  }
  const A = N("misc", "ldp"),
    n = vA
      .filter((t) => !t.novice)
      .map((t) => {
        const e = hn(t, o.sex) && t.key !== o.fac,
          a = t.starter && T[t.starter];
        return `<button data-dp="${t.key}" ${e && A ? "" : "disabled"} style="--c:${w0[t.series]}"><img src="${(E0.hero[t.key] || {}).img || ""}" alt=""><b>${D(t.n)}</b><small>${t.key === o.fac ? "Môn phái hiện tại" : hn(t, o.sex) ? `Hệ ${g0[t.series]} · ${Wf(t)}${a ? " · " + D(a.n) : ""}` : "Không nhận giới tính này"}</small></button>`;
      })
      .join("");
  J(
    `<h3>Đổi môn phái <small>${A} Lệnh Bài Đổi Phái</small></h3>
    <p class="desc">Dùng 1 Lệnh Bài Đổi Phái: chuyển sang phái mới (đổi cả hệ ngũ hành nếu khác hệ). <b>Giữ</b> cấp, tiềm năng, trang bị, tiến độ võ công 90 và 150 đã luyện; <b>hoàn lại điểm kỹ năng đã cộng</b> để học võ công phái mới; nhận chiêu nhập môn + vũ khí phái mới.</p>
    ${A ? "" : '<p class="bad small">Chưa có Lệnh Bài Đổi Phái — mua ở Kỳ Trân Các.</p>'}<div class="facpick">${n}</div>`,
    () => {
      document.querySelectorAll("#mBody [data-dp]").forEach(
        (t) =>
          (t.onclick = async () => {
            const e = I[t.dataset.dp];
            (await X1(`Đổi sang ${e.n}? Toàn bộ điểm kỹ năng được hoàn lại.`, "Đổi phái")) &&
              N7(e.key);
          }),
      );
    },
  );
};
