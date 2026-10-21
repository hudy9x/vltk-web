import { mountWarDialogStyle } from "../../simulator/dialog-style";
import { HORSE_PRICE_KNB } from "./model";
import type { HorseOffer, HorseShop } from "./model";
export function mountHorseShop(
  shop: HorseShop,
  qualities: [string, string, number][],
  escape: (text: string) => string,
) {
  mountWarDialogStyle();
  const panel = document.createElement("section");
  panel.id = "horse-shop";
  panel.className = "war-dialog horse-shop";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Mã Phu · Cửa hàng ngựa");
  panel.innerHTML = `<header><h2>Mã Phu · Ngựa 10 KNB</h2><button id="horse-shop-close" class="war-close" aria-label="Đóng cửa hàng ngựa">×</button></header><div class="war-content"><p id="horse-wallet"></p><div class="horse-quality" role="group" aria-label="Bậc ngựa"><button data-horse-quality="-1" aria-pressed="true">Tất cả</button>${qualities.map(([name, color], index) => `<button data-horse-quality="${index}" style="--quality:${color}" aria-pressed="false">${escape(name)}</button>`).join("")}</div><div class="war-grid horse-filters"><label>Tìm theo tên<input id="horse-search" type="search" placeholder="Ví dụ: xích thố"></label><label>Cấp ngựa<select id="horse-level"><option value="0">Tất cả các cấp</option>${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}" ${index === 9 ? "selected" : ""}>Cấp ${index + 1}</option>`).join("")}</select></label></div><p>Rê chuột hoặc đặt tiêu điểm lên ngựa để xem thông tin. Mua nhận vào Hành trang; cấp yêu cầu cưỡi được ghi riêng.</p><p id="horse-results"></p><div id="horse-products" class="horse-grid"></div><div class="war-actions horse-pagination"><button id="horse-previous">← Trước</button><span id="horse-page"></span><button id="horse-next">Sau →</button></div><p id="horse-message" role="status" class="war-note"></p></div>`;
  const tooltip = document.createElement("aside");
  tooltip.className = "horse-tooltip";
  tooltip.hidden = true;
  tooltip.id = "horse-tooltip";
  tooltip.setAttribute("role", "tooltip");
  const style = document.createElement("style");
  style.textContent = `.horse-quality{display:flex;flex-wrap:wrap;gap:6px}.horse-quality button{color:var(--quality,#e8dfbf)}.horse-quality button[aria-pressed=true]{background:#42432e;border-color:#cbbb72}.horse-filters{margin-top:14px}.horse-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.horse-card{border:1px solid #5d5b43;border-radius:7px;background:#181d17;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}.horse-card:focus-visible,.horse-card:hover{outline:1px solid #e9ce83;background:#292e20}.horse-card .horse-image{height:96px;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at bottom,#66623b55,transparent 70%)}.horse-card img{max-width:95%;height:88px;object-fit:contain;image-rendering:pixelated}.horse-card strong{font-size:14px;min-height:36px}.horse-card small{color:#b1b7a3;line-height:1.5}.horse-card button{margin-top:auto;color:#ffdf80}.horse-card .horse-requirement{color:#e7b680}.horse-pagination{align-items:center;justify-content:center}.horse-tooltip{position:fixed;z-index:95120;width:min(310px,85vw);box-sizing:border-box;padding:14px;border:1px solid #b1a36a;border-radius:8px;background:#171d18f7;color:#e8dfbf;box-shadow:0 8px 32px #0009;font:13px 'IBM Plex Mono',monospace;pointer-events:none;line-height:1.6}.horse-tooltip[hidden]{display:none}.horse-tooltip h3{margin:0 0 6px;font-size:15px}.horse-tooltip p{margin:7px 0}.horse-tooltip small{color:#a6b09c}@media(max-width:650px){.horse-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.horse-card{padding:10px}.horse-card strong{font-size:12px}}`;
  const query = <ElementType extends HTMLElement>(selector: string) =>
    panel.querySelector<ElementType>(selector)!;
  let quality = -1,
    page = 0;
  const pageSize = 12;
  const hideTooltip = () => {
    tooltip.hidden = true;
  };
  const close = () => {
    panel.hidden = true;
    hideTooltip();
  };
  function showTooltip(
    offer: HorseOffer,
    event?: PointerEvent,
    element?: HTMLElement,
  ) {
    const tier = qualities[offer.quality];
    tooltip.innerHTML = `<h3 style="color:${tier?.[1] || "#ffdf80"}">${escape(offer.name)}</h3><b>${escape(tier?.[0] || "Ngựa")} · Cấp ngựa ${offer.level}</b><p>Cần nhân vật cấp ${offer.requiredLevel} để cưỡi</p><p>${escape(offer.summary)}</p><small>${escape(offer.description)}</small><p>Giá: ${HORSE_PRICE_KNB} KNB · Thuần dưỡng ban đầu: 0</p>`;
    tooltip.hidden = false;
    const bounds = element?.getBoundingClientRect();
    const x = event?.clientX ?? bounds?.right ?? 20,
      y = event?.clientY ?? bounds?.top ?? 20;
    tooltip.style.left = `${Math.max(8, Math.min(x + 14, window.innerWidth - tooltip.offsetWidth - 12))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(y + 14, window.innerHeight - tooltip.offsetHeight - 12))}px`;
  }
  function render() {
    hideTooltip();
    const offers = shop.filter({
        quality,
        level: Number(query<HTMLSelectElement>("#horse-level").value || "10"),
        search: query<HTMLInputElement>("#horse-search").value || "",
      }),
      state = shop.state;
    const pages = Math.max(1, Math.ceil(offers.length / pageSize));
    page = Math.min(page, pages - 1);
    query("#horse-wallet").textContent =
      `Hiện có ${state.knb.toLocaleString("vi-VN")} KNB · Trống ${state.slots} ô · Đồng giá ${HORSE_PRICE_KNB} KNB/con`;
    query("#horse-results").textContent = `${offers.length} ngựa phù hợp`;
    const visible = offers.slice(page * pageSize, (page + 1) * pageSize);
    query("#horse-products").innerHTML = visible.length
      ? visible
          .map(
            (offer) =>
              `<article class="horse-card" tabindex="0" data-horse="${escape(offer.key)}" aria-describedby="horse-tooltip"><div class="horse-image"><img src="${escape(offer.icon)}" alt="${escape(offer.name)}"></div><strong style="color:${qualities[offer.quality]?.[1] || "#ffdf80"}">${escape(offer.name)}</strong><small>${escape(qualities[offer.quality]?.[0] || "Ngựa")} · Cấp ngựa ${offer.level}<br><span class="horse-requirement">Cần cấp ${offer.requiredLevel} để cưỡi</span></small><button data-horse-buy="${escape(offer.key)}" ${!state.alive || state.slots < 1 || state.knb < 10 ? "disabled" : ""} aria-label="Mua ${escape(offer.name)} cấp ${offer.level} giá 10 KNB">Mua · 10 KNB</button></article>`,
          )
          .join("")
      : "<p>Không có ngựa phù hợp bộ lọc.</p>";
    panel.querySelectorAll<HTMLElement>("[data-horse]").forEach((card) => {
      const offer = visible.find((entry) => entry.key === card.dataset.horse)!;
      card.onpointerenter = (event) => showTooltip(offer, event, card);
      card.onpointermove = (event) => showTooltip(offer, event, card);
      card.onpointerleave = hideTooltip;
      card.onfocus = () => showTooltip(offer, undefined, card);
      card.onblur = hideTooltip;
      card.onclick = (event) => {
        if (!(event.target as HTMLElement).closest("[data-horse-buy]"))
          showTooltip(offer, undefined, card);
      };
    });
    panel.querySelectorAll<HTMLButtonElement>("[data-horse-buy]").forEach(
      (button) =>
        (button.onclick = () => {
          try {
            const item = shop.buy(button.dataset.horseBuy!);
            query("#horse-message").textContent =
              `Đã mua ${item.n} · −10 KNB · Ngựa nằm trong Hành trang.`;
          } catch (error) {
            query("#horse-message").textContent =
              error instanceof Error ? error.message : String(error);
          }
          render();
        }),
    );
    query("#horse-page").textContent = `Trang ${page + 1}/${pages}`;
    query<HTMLButtonElement>("#horse-previous").disabled = page === 0;
    query<HTMLButtonElement>("#horse-next").disabled = page >= pages - 1;
    panel
      .querySelectorAll<HTMLButtonElement>("[data-horse-quality]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.horseQuality) === quality),
        ),
      );
  }
  query("#horse-shop-close").onclick = close;
  query<HTMLInputElement>("#horse-search").oninput = () => {
    page = 0;
    render();
  };
  query<HTMLSelectElement>("#horse-level").onchange = () => {
    page = 0;
    render();
  };
  query("#horse-previous").onclick = () => {
    page--;
    render();
  };
  query("#horse-next").onclick = () => {
    page++;
    render();
  };
  panel.querySelectorAll<HTMLButtonElement>("[data-horse-quality]").forEach(
    (button) =>
      (button.onclick = () => {
        quality = Number(button.dataset.horseQuality);
        page = 0;
        render();
      }),
  );
  panel.addEventListener("scroll", hideTooltip);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        close();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  function open() {
    panel.hidden = false;
    query("#horse-message").textContent = "";
    render();
  }
  document.head.appendChild(style);
  document.body.appendChild(panel);
  document.body.appendChild(tooltip);
  return {
    open,
    close,
    render,
    get isOpen() {
      return !panel.hidden;
    },
  };
}
