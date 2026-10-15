// render/arena — shared IIFE scope; order is defined in modules.json.
var NP = function (A) {
  const n = W;
  (n.setTransform(H1, 0, 0, H1, 0, 0),
    n.clearRect(0, 0, M0.w, M0.h),
    OP(A),
    n.setTransform(H1, 0, 0, H1, -Math.round(B0.x) * H1, -Math.round(B0.y) * H1));
  const t = l.bgImg;
  (EP(n, t), (n.textAlign = "center"));
  if (typeof gameMaster !== "undefined" && gameMaster) gameMaster.drawSkillRange(n);
  const clicked = l.clickedTarget;
  const clickTime = (l.clickedUntil || 0) - (l.clock || 0);
  if (clicked && clickTime > 0 && !clicked.dead && !(clicked.hp <= 0)) {
    n.save();
    n.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(clickTime * Math.PI * 5));
    n.strokeStyle = "#fff18a";
    n.lineWidth = 3;
    n.beginPath();
    n.ellipse(clicked.x, clicked.y, (clicked.r || 17) + 9, ((clicked.r || 17) + 9) / 2, 0, 0, Math.PI * 2);
    n.stroke();
    n.restore();
  } else if (clicked) l.clickedTarget = null;
  for (const a of l.town ? [] : l.ground) {
    const i = a.it.ic ? bA(a.it.ic) : null,
      r = mA(a.it),
      c = l.pickTarget === a,
      d = Math.sin((a.age + a.x) * 3) * 1.5;
    if (
      ((n.fillStyle = "#0008"),
      n.beginPath(),
      n.ellipse(a.x, a.y + 2, 11, 4, 0, 0, 7),
      n.fill(),
      (n.strokeStyle = _0[a.it.r]),
      (n.lineWidth = c ? 2.5 : r ? 1.6 : 0.8),
      (n.globalAlpha = r || c ? 1 : 0.55),
      n.beginPath(),
      n.ellipse(a.x, a.y + 2, 12, 5, 0, 0, 7),
      n.stroke(),
      i && i.complete && i.naturalWidth)
    ) {
      const f = Math.min(26 / i.naturalWidth, 26 / i.naturalHeight);
      n.drawImage(
        i,
        a.x - (i.naturalWidth * f) / 2,
        a.y - i.naturalHeight * f + d,
        i.naturalWidth * f,
        i.naturalHeight * f,
      );
    }
    ((r || c || a.it.r >= 2) &&
      ((n.font = '9px "IBM Plex Mono", monospace'),
      (n.fillStyle = "#000"),
      n.fillText(a.it.n, a.x + 1, a.y - 27),
      (n.fillStyle = _0[a.it.r]),
      n.fillText(a.it.n, a.x, a.y - 28)),
      (n.globalAlpha = 1));
  }
  typeof qm == "function" && qm(n, A);
  for (const a of l.corpses) {
    a.actT += A;
    const i = E(1.6 - a.actT, 0, 1),
      r = 1;
    (a.animKey && Va(a.animKey, "die", a.dir || 0, a.actT, a.x, a.y, r * Ua, i)) ||
      ((n.globalAlpha = i * 0.5), M8(a.img, a.sz, a.x, a.y, r, a.face < 0), (n.globalAlpha = 1));
  }
  ((l.corpses = l.corpses.filter((a) => a.actT < 1.6)), db(n, A), Vb(n, A));
  const e = l.enemies
    .filter((a) => !a.dead)
    .concat(
      [{ hero: !0, y: v.y }],
      typeof othEnts == "function" ? othEnts() : [],
      typeof rm == "function" ? rm() : [],
    )
    .sort((a, i) => a.y - i.y);
  for (const a of e) {
    // Finish the previous entity's anchored nameplate before drawing the next
    // (closer) body. Never collect all nameplates into a foreground overlay.
    IP();
    if (a.arenaSim && typeof arenaSimulator !== "undefined" && arenaSimulator) {
      arenaSimulator.draw(n, a, A);
      continue;
    }
    if (a.oth) {
      othDraw(n, a.oth, A);
      continue;
    }
    if (a.ally) {
      uB(n, a.ally, A);
      continue;
    }
    if (a.hero) {
      ((n.fillStyle = "#0007"), n.beginPath(), n.ellipse(v.x, v.y, 16, 6, 0, 0, 7), n.fill());
      const f = Jt();
      v.animKey = f && f.anim;
      const h = v.x - (v.px ?? v.x),
        g = v.y - (v.py ?? v.y);
      if (
        ((v.px = v.x),
        (v.py = v.y),
        (v.moving = Math.hypot(h, g) > 0.4),
        v.moving && v.act !== "at" && (v.dir = kn(h, g)),
        H8(v, l.stunT > 0 ? 0 : l.slowT > 0 ? A * Qa : A, v.moving ? "run" : "st"),
        l.deadT > 0
          ? ps(v, "die")
          : v.act !== "at" && v.act !== "hurt" && ps(v, v.moving ? "run" : "st"),
        av(n),
        Pf(n, "under", 0),
        l.dashTrail && f && f.anim)
      )
        for (const P of l.dashTrail)
          kf(f.anim, "run", P.dir || 0, 0, P.x, P.y, Jn, 0.45 * (1 - P.t / 0.3));
      const u = df(l.slowT > 0, l.hpDotT > 0, l.stunT > 0),
        w =
          f &&
          f.anim &&
          _8(u, v.x - 120, v.y - 220, 240, 245, () =>
            kf(f.anim, v.act || "st", v.dir || 0, v.actT || 0, v.x, v.y, Jn),
          );
      (Pf(n, "over", w ? Math.min(w, 90) : 60), sv(n, A));
      const x = v.y - nameplateOffset(v.animKey, Jn, 0.9, 6, 58),
        p = typeof bo == "function" && bo();
      (L3(
        v.x,
        x,
        `${o.name || (I[o.fac] && I[o.fac].n) || ""}${o.name && typeof Rh == "function" ? Rh(o.name) : ""}${hf({ slowT: l.slowT, poison: l.hpDotT, stun: l.stunT })}`,
        typeof o2 == "function" ? o2(o.name, o.fac) : Ps.hero,
        12,
        l.life / Math.max(1, l.P.life),
        "#4fd04f",
        p ? `«${Ns(p)}»` : "",
        p ? r2[p[3]].c : "",
      ),
        !w &&
          !(f && M8(bA(f.img), f.sz, v.x, v.y, 0.9, v.face < 0, l.deadT > 0 ? 0.35 : 1)) &&
          ((n.fillStyle = w0[F0()]), n.beginPath(), n.arc(v.x, v.y - 20, 14, 0, 7), n.fill()),
        l.stunT > 0 && sf(v.x, v.y - (w ? Math.min(w, 90) * 0.85 : 52), Jn),
        l.hurtT > 0 &&
          ((n.fillStyle = "#f004"), n.beginPath(), n.arc(v.x, v.y - 24, 20, 0, 7), n.fill()));
      continue;
    }
    const i = 1;
    ((n.fillStyle = "#0007"),
      n.beginPath(),
      n.ellipse(a.x, a.y, a.r, a.r * 0.38, 0, 0, 7),
      n.fill(),
      (n.strokeStyle = w0[a.series]),
      (n.lineWidth = a.cls === "normal" ? 1.2 : 2.4),
      n.beginPath(),
      n.ellipse(a.x, a.y, a.r, a.r * 0.38, 0, 0, 7),
      n.stroke(),
      (a.animKey = r0[a.tid].anim),
      H8(a, a.stun > 0 ? 0 : a.slowT > 0 ? A * Qa : A, a.moving ? "run" : "st"),
      a.act !== "at" &&
        a.act !== "hurt" &&
        a.act !== "die" &&
        ps(a, a.moving && !(a.stun > 0) ? "run" : "st"));
    const r = df(a.slowT > 0, a.poison > 0, a.stun > 0),
      c =
        a.animKey &&
        _8(
          r,
          a.x - (a.cls === "boss" ? 170 : 110),
          a.y - (a.cls === "boss" ? 300 : 200),
          a.cls === "boss" ? 340 : 220,
          a.cls === "boss" ? 330 : 230,
          () =>
            Va(
              a.animKey,
              a.act || "st",
              a.dir || 0,
              a.actT || 0,
              a.x,
              a.y,
              i * Ua,
              a.hitT > 0 ? 0.75 : 1,
            ),
        );
    (a.curse && WP(n, a, i * Ua),
      a.stFx && ZP(n, a, c ? Math.min(c, 110) : 50, i * Ua, A),
      !c &&
        !_8(
          r,
          a.x - (a.cls === "boss" ? 170 : 110),
          a.y - (a.cls === "boss" ? 300 : 200),
          a.cls === "boss" ? 340 : 220,
          a.cls === "boss" ? 330 : 230,
          () => M8(a.img, a.sz, a.x, a.y, i, a.face < 0, a.hitT > 0 ? 0.6 : 1),
        ) &&
        ((n.fillStyle = w0[a.series]), n.beginPath(), n.arc(a.x, a.y - a.r, a.r, 0, 7), n.fill()),
      a.stun > 0 &&
        sf(
          a.x,
          a.y -
            (c
              ? Math.min(c, 110) * 0.85
              : a.img && a.img.naturalHeight
                ? a.img.naturalHeight
                : a.r * 2),
          i * Ua,
        ),
      a.hitT > 0 && (a.hitT -= A));
    const d = a.y - nameplateOffset(a.animKey, i * Ua, 0.85, 8, a.r * 2 + 8);
    L3(
      a.x,
      d,
      GP(a) + (typeof combatSandbox !== "undefined" && combatSandbox ? combatSandbox.healthLabel(a) : ""),
      a.goldBoss ? Ps.gold : Ps[a.cls] || Ps.normal,
      a.cls === "boss" ? 12 : 11,
      a.hp / a.max,
      a.cls === "boss" ? "#ff5030" : "#e03a2a",
      void 0,
      void 0,
      w0[a.series],
    );
  }
  IP();
  for (const effect of l.fx) {
    const cast = effect.combat;
    const repeating = cast && +cast.skill.id !== 375 && cast.interval && cast.pulse >= 0;
    const phase = repeating ? Math.max(0, cast.elapsed - (cast.nextPulse - cast.interval)) : 0;
    if (effect.k === "jm") YP(repeating && effect.age >= 0 ? Object.assign({}, effect, { age: phase * K3 }) : effect);
    else if (effect.k === "mis" || effect.k === "boom") CP(repeating && effect.t >= 0 ? Object.assign({}, effect, { t: phase }) : effect);
    else if (effect.k === "contact") drawContactProjectile(effect);
  }
  for (const a of l.fx) {
    if (a.k === "mis" || a.k === "boom" || a.k === "jm" || a.k === "contact") continue;
    a.life -= A;
    const i = E(a.life / a.max, 0, 1);
    ((n.globalAlpha = i),
      (n.strokeStyle = a.color),
      a.k === "line"
        ? ((n.lineWidth = 3), n.beginPath(), n.moveTo(a.x1, a.y1), n.lineTo(a.x2, a.y2), n.stroke())
        : ((n.lineWidth = a.r ? 3 : 2),
          n.beginPath(),
          n.arc(a.x, a.y - (a.r ? 0 : 10), 8 + (1 - i) * (a.r || 30), 0, 7),
          n.stroke()));
  }
  ((n.globalAlpha = 1), (l.fx = l.fx.filter((a) => a.life > 0)), (n.textAlign = "center"));
  updateDamageLabels(l.txt, A, n);
  for (const a of l.txt)
    ((!a.target && ((a.life -= A), (a.y -= 32 * A))),
      (n.globalAlpha = E(a.life / 0.5, 0, 1)),
      (n.font = `${a.size}px "IBM Plex Mono", monospace`),
      (n.strokeStyle = "#111"),
      (n.lineWidth = 3),
      (n.lineJoin = "round"),
      n.strokeText(a.t, a.x, a.y),
      (n.fillStyle = a.color),
      n.fillText(a.t, a.x, a.y));
  ((n.globalAlpha = 1),
    (l.txt = l.txt.filter((a) => a.life > 0)),
    n.setTransform(H1, 0, 0, H1, 0, 0),
    typeof ah == "function" && ah(n),
    SP(n),
    my(n),
    l.banner &&
      l.banner.t > 0 &&
      ((l.banner.t -= A),
      (n.globalAlpha = E(l.banner.t, 0, 1)),
      (n.fillStyle = "#000a"),
      n.fillRect(0, M0.h * 0.36, M0.w, 54),
      (n.font = '20px "IBM Plex Mono", monospace'),
      (n.fillStyle = "#f3d88a"),
      n.fillText(l.banner.text, M0.w / 2, M0.h * 0.36 + 26),
      (n.font = '12px "IBM Plex Mono", monospace'),
      (n.fillStyle = "#d8ccb4"),
      n.fillText(l.banner.sub, M0.w / 2, M0.h * 0.36 + 44),
      (n.globalAlpha = 1)));
};

var lA;

var W;

var H1 = 1;

var Ua = 1.35;

var Jn = 1.35;

var of = {};

var A0 = window.JFX || { m: {}, s: {}, c: {}, f: {} };

var q3 = 1.4;

var j3 = 60;

var Ds = (s, A) => ((Math.round(Math.atan2(-s, A) / (Math.PI / 8)) % 16) + 16) % 16;

var LP = {
  340: [150, 7, 1, 0, 0],
  352: [162, 6, 1, 3, 5],
  354: [164, 0, 1, 5, 4],
  383: [204, 0, 1, 5, 4],
  329: [143, 7, 1, 0, 0],
  331: [144, 3, 4, 1, 9],
  382: [188, 7, 1, 2, 3],
  338: [148, 7, 1, 0, 0],
  389: [195, 7, 1, 0, 0],
  363: [170, 7, 1, 1, 0],
  371: [176, 7, 1, 0, 0],
  162: [27, 6, 1, 0, 0],
  373: [179, 7, 1, 0, 0],
  387: [193, 6, 1, 0, 0],
};

var qP = {
  302: 301,
  339: 340,
  336: 382,
  353: 354,
  362: 363,
  357: 389,
  328: 329,
  380: 331,
  337: 338,
  355: 383,
  375: 387,
  372: 373,
  351: 352,
};

var yn = (s) => Math.min(1.2, (s.n * s.ms) / 1e3);

var z3 = { f: "fx/lvup.webp", n: 19, d: 1, w: 64, h: 83, ax: 29, ay: 61, ms: 56 };

bA(z3.f);
