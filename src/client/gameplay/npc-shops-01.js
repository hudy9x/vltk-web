// gameplay/npc-shops — shared IIFE scope; order is defined in modules.json.
if (S.shops && S.shops.weapon) {
  const s = S.shops.weapon.items,
    A = new Set(s.map((n) => n.d + "/" + n.k));
  for (const [n, t] of [
    [0, 5],
    [0, 6],
    [1, 0],
    [1, 1],
    [1, 2],
  ])
    if (!A.has(n + "/" + t) && S.items[n] && S.items[n].list.some((e) => e.k === t))
      for (let e = 1; e <= 8; e++)
        s.push({ nat: 0, g: 0, d: n, k: t, lvl: e, s: -1, price: Xv[e] });
}

if (S.shops && S.shops.horse)
  for (const s of S.shops.horse.items) s.g !== 1 && dh[s.lvl] && (s.price = dh[s.lvl]);

var ac = (s, A) => (s.s >= 0 ? s.s : s._s === void 0 ? (s._s = A.s) : s._s);

var sc = function () {
  return (Array.isArray(o.potSlot) || (o.potSlot = ["auto", "auto"]), o.potSlot);
};

var ic = function (A) {
  const n = rc[A],
    t = co(A);
  if (t) {
    const i = C1(t.kind);
    if ((i[t.tier] || 0) > 0) return (i[t.tier]--, { p: t, free: !0 });
    if (ro(t) && Ot(t) <= o.gold) return { p: t, free: !1 };
  }
  const e = ch(n),
    a = e || r8(n);
  return a ? { p: a, free: !!e } : null;
};

var Za = function (A) {
  if(typeof OnlineBattlefield!=="undefined" && OnlineBattlefield.state)return OnlineBattlefield.slot(A);
  if(typeof arenaSimulator!=="undefined" && arenaSimulator?.battlefield.active)return arenaSimulator.supplies.slot(A?"mana":"life");
  const n = co(A),
    t = rc[A];
  if (n) return { ic: n.ic, n: C1(n.kind)[n.tier] || 0, name: n.n };
  const e = C1(t),
    a = Math.max(
      0,
      ...Object.keys(e)
        .filter((r) => e[r] > 0)
        .map(Number),
    ),
    i =
      (a && S.potions.find((r) => r.kind === t && r.tier === a)) ||
      r8(t) ||
      S.potions.find((r) => r.kind === t);
  return { ic: i ? i.ic : "", n: rh(t), name: "Tự động: " + (i ? i.n : "") };
};

var oo = function (A) {
  if(typeof OnlineBattlefield!=="undefined"&&OnlineBattlefield.state){OnlineBattlefield.pharmacy(A);return;}
  if(typeof arenaSimulator!=="undefined" && arenaSimulator?.battlefield.active){arenaSimulator.openPharmacy(A?"mana":"life",true);return;}
  const n = rc[A],
    t = sc()[A],
    e = S.potions
      .filter((i) => i.kind === n || i.kind === "both")
      .sort((i, r) => (i.kind === "both") - (r.kind === "both") || i.tier - r.tier),
    a = (i) => {
      const r = ro(i),
        c = C1(i.kind)[i.tier] || 0;
      return `<button class="shoprow${r ? "" : " bad"}${t === oc(i) ? " own" : ""}" data-pk="${oc(i)}" ${r ? "" : "disabled"}><img src="${D(i.ic)}" alt=""><span><b>${D(i.n)}</b><small>Hồi ${F(i.total)} ${i.kind === "mana" ? "nội lực" : "sinh lực"}${i.kind === "both" ? ` + ${F(i.mtotal)} nội lực` : ""} · ${r ? `${q(Ot(i))} lượng / bình · trong túi ${c}` : `cần cấp ${be[i.tier]}`}</small></span></button>`;
    };
  J(
    `<h3>Ô ${A + 1}: chọn thuốc</h3>
    <div class="shoplist"><button class="shoprow${t === "auto" ? " own" : ""}" data-pk="auto"><img src="${D((e.filter((i) => i.kind === n && ro(i)).pop() || e[0]).ic)}" alt=""><span><b>Tự động</b><small>Thuốc ${n === "life" ? "sinh lực" : "nội lực"} tốt nhất mua được</small></span></button>${e.map(a).join("")}</div>`,
    () => {
      document.querySelectorAll("#mBody [data-pk]").forEach(
        (i) =>
          (i.onclick = () => {
            ((sc()[A] = i.dataset.pk),
              (l.dirty = !0),
              $(),
              n0(!0),
              typeof PA < "u" && PA === "more" && V(),
              k(`Ô ${A + 1}: ${i.dataset.pk === "auto" ? "Tự động" : hh(i.dataset.pk).n}`));
            const r = m(A ? "#bMp" : "#bHp");
            r && (r._k = "");
          }),
      );
    },
  );
};

var fh = [
  {
    n: "Thừa Tiên Mật (tiểu)",
    kind: "both",
    total: 100,
    dur: 5.6,
    mtotal: 60,
    mdur: 5.6,
    price: 80,
    tier: 1,
    ic: "img/i/potb1.png",
  },
  {
    n: "Thừa Tiên Mật (trung)",
    kind: "both",
    total: 250,
    dur: 5.6,
    mtotal: 150,
    mdur: 13.9,
    price: 150,
    tier: 2,
    ic: "img/i/potb1.png",
  },
  {
    n: "Thừa Tiên Mật (đại)",
    kind: "both",
    total: 500,
    dur: 11.1,
    mtotal: 300,
    mdur: 11.1,
    price: 750,
    tier: 3,
    ic: "img/i/potb3.png",
  },
  {
    n: "Thất Xảo Bổ Tâm Đan",
    kind: "both",
    total: 1e3,
    dur: 11.1,
    mtotal: 600,
    mdur: 11.1,
    price: 1500,
    tier: 4,
    ic: "img/i/potb3.png",
  },
  {
    n: "Ngũ Hoa Ngọc Lộ Hoàn",
    kind: "both",
    total: 5e3,
    dur: 5.6,
    mtotal: 5e3,
    mdur: 5.6,
    price: 3e3,
    tier: 5,
    ic: "img/i/potb5.png",
  },
];

if (
  (S.potions.some((s) => s.kind === "both") || S.potions.push(...fh),
  S.shops && S.shops.med && !S.shops.med.items.some((s) => s.g === 1 && s.d === 2))
)
  for (const s of fh) S.shops.med.items.push({ g: 1, d: 2, k: 0, lvl: s.tier, price: s.price });


// The same catalog and purchase rules run in the browser and trusted server runtime.
var specialItemOffers = [{ key: 'newbie_token', price: 100000, limit: 1 }];

var specialItemShopBuy = function (key) {
  const offer = specialItemOffers.find(row => row.key === key);
  if (!offer) throw new Error('Vật phẩm không được bán tại cửa hàng này.');
  if ((o.specialPurchases?.[key] || 0) >= offer.limit) throw new Error('Mỗi nhân vật chỉ được mua 1 Lệnh bài tân thủ.');
  const owned = [...o.inv, ...Object.values(o.eq || {}), ...(o.epBox || []), ...(o.stable || []), ...(o.ground || []).map(drop => drop?.it)];
  if (owned.some(item => item?.ktc?.k === key)) throw new Error('Nhân vật đã có Lệnh bài tân thủ.');
  if (!Number.isSafeInteger(o.gold) || o.gold < offer.price) throw new Error('Không đủ 10 vạn lượng.');
  if (o.inv.length >= INV_MAX) throw new Error('Hành trang đầy.');
  if (!B4(key, 1)) throw new Error('Không thể thêm vật phẩm vào hành trang.');
  o.inv.find(item => item.ktc?.k === key).lock = true;
  o.gold -= offer.price;
  o.specialPurchases ||= {}; o.specialPurchases[key] = (o.specialPurchases[key] || 0) + 1;
  R = true; l.dirty = true;
};

var openSpecialItemShop = function () {
  const owns = key => [...o.inv, ...Object.values(o.eq || {}), ...(o.epBox || []), ...(o.stable || []), ...(o.ground || []).map(drop => drop?.it)].some(item => item?.ktc?.k === key);
  J(`<h3>Kỳ Trân Sứ Giả</h3><p class="desc">Lệnh bài và vật phẩm đặc biệt</p><p>Ngân lượng: <b class="gold">${q(o.gold || 0)}</b></p><div class="shoplist">${specialItemOffers.map(offer => {
    const item = J0.find(row => row.k === offer.key), bought = (o.specialPurchases?.[offer.key] || 0) >= offer.limit;
    return `<button class="shoprow" data-special-item="${offer.key}" ${bought || owns(offer.key) || o.gold < offer.price ? 'disabled' : ''}><img src="${D(item.ic)}" alt=""><span><b>${D(item.n)}</b><small>10 vạn lượng · Chỉ được mua 1 cái / nhân vật${bought ? ' · Đã mua' : owns(offer.key) ? ' · Đã sở hữu' : ''}</small></span></button>`;
  }).join('')}</div><p class="dim small">Lệnh bài không thể bán lại.</p>`, () => {
    document.querySelectorAll('#mBody [data-special-item]').forEach(button => button.onclick = async () => {
      button.disabled = true;
      try {
        if (typeof OnlineProgression !== 'undefined' && OnlineProgression.enabled() && window.localGameStorage) {
          await OnlineProgression.run({kind:'specialItemBuy', item:button.dataset.specialItem});
          await window.localGameStorage.flush();
        } else specialItemShopBuy(button.dataset.specialItem);
        $(); V(); k('Đã mua Lệnh bài tân thủ với giá 10 vạn lượng.'); openSpecialItemShop();
      } catch (error) { k(error.message); button.disabled = false; }
    });
  });
};
