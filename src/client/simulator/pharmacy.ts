import { mountWarDialogStyle } from "./dialog-style";
import type { PotionResource, WarSupplies } from "./supplies";
/** Selection changes the hotbar slot; buying is a separate explicit action. */
export function mountWarPharmacy(
  supplies: WarSupplies,
  escape: (text: string) => string,
) {
  mountWarDialogStyle();
  const panel = document.createElement("section");
  panel.id = "war-pharmacy";
  panel.className = "war-dialog";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chủ dược điếm");
  panel.innerHTML = `<header><h2>Chủ dược điếm</h2><button class="war-close" aria-label="Đóng dược điếm">×</button></header><nav class="war-tabs"><button data-resource="life">Thuốc sinh lực</button><button data-resource="mana">Thuốc nội lực</button></nav><div class="war-content"><div class="war-stock"><span id="war-shop-stock"></span><label>Số lượng mua<input id="war-shop-quantity" type="number" min="1" max="40" value="1"></label></div><p>Bấm tên thuốc để chọn cho ô bên dưới. Bấm Mua để mua thuốc bất cứ lúc nào; tổng túi tối đa 80 bình, mỗi ô 40 bình, gồm cả thuốc hồi hai loại.</p><div id="war-shop-products"></div><p id="war-shop-message" class="war-note" role="status"></p></div>`;
  let resource: PotionResource = "life",
    selecting = false,
    lastState = "";
  const query = <ElementType extends HTMLElement>(selector: string) =>
    panel.querySelector<ElementType>(selector)!;
  const close = () => {
    panel.hidden = true;
  };
  query(".war-close").onclick = close;
  function refresh(force = false) {
    if (panel.hidden) return;
    const state = supplies.state;
    const quantityInput = query<HTMLInputElement>("#war-shop-quantity");
    const remaining = Math.max(0, Math.min(state.capacity - state.total, 40 - state[resource]));
    quantityInput.max = String(Math.max(1, remaining));
    quantityInput.disabled = remaining === 0;
    const requested = Number(quantityInput.value);
    if (remaining > 0 && Number.isSafeInteger(requested) && requested > remaining)
      quantityInput.value = String(remaining);
    const stamp = JSON.stringify([
        state,
        resource,
        query<HTMLInputElement>("#war-shop-quantity").value,
      ]);
    if (!force && stamp === lastState) return;
    lastState = stamp;
    query("#war-shop-stock").textContent =
      `Túi thuốc: ${state.total}/${state.capacity} bình · Còn ${remaining} chỗ · Thuốc hồi máu ${state.life} · Thuốc hồi nội lực ${state.mana} (thuốc hồi cả hai được tính ở cả hai mục)`;
    panel
      .querySelectorAll<HTMLButtonElement>("[data-resource]")
      .forEach((button) =>
        button.setAttribute(
          "aria-selected",
          String(button.dataset.resource === resource),
        ),
      );
    const roomFor = (kind: string) => Math.min(remaining,
      kind !== "mana" ? 40 - state.life : Infinity,
      kind !== "life" ? 40 - state.mana : Infinity);
    const products = supplies
      .catalog()
      .filter((potion) => potion.kind === resource || potion.kind === "both");
    query("#war-shop-products").innerHTML =
      `<div class="war-shop-row ${state.selected[resource] === "auto" ? "selected" : ""}"><button class="war-product" data-select="auto"><strong>Tự động</strong><small>Dùng thuốc phù hợp tốt nhất đang có trong túi</small></button></div>` +
      products
        .map(
          (potion) =>
            `<div class="war-shop-row ${state.selected[resource] === potion.key ? "selected" : ""}"><img src="${escape(potion.ic || "")}" alt=""><button class="war-product" data-select="${escape(potion.key)}"><strong>${escape(potion.n)}</strong><small>Hồi ${potion.total.toLocaleString("vi-VN")} ${potion.kind === "mana" ? "nội lực" : "sinh lực"}${potion.kind === "both" ? ` + ${(potion.mtotal || 0).toLocaleString("vi-VN")} nội lực` : ""} · ${potion.price.toLocaleString("vi-VN")} lượng/bình · trong túi ${state.inventory[potion.key] || 0}</small></button><button data-buy="${escape(potion.key)}" ${roomFor(potion.kind) <= 0 ? "disabled" : ""}>Mua</button><button data-buy20="${escape(potion.key)}" ${roomFor(potion.kind)<=0?"disabled":""}>Mua ×20</button></div>`,
        )
        .join("");
    panel.querySelectorAll<HTMLButtonElement>("[data-select]").forEach(
      (button) =>
        (button.onclick = () => {
          supplies.select(resource, button.dataset.select!);
          if (selecting) close();
          else refresh(true);
        }),
    );
    panel.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach(
      (button) =>
        (button.onclick = () => {
          try {
            supplies.buy(
              button.dataset.buy!,
              Number(query<HTMLInputElement>("#war-shop-quantity").value),
            );
            query("#war-shop-message").textContent =
              "Đã mua thuốc vào túi chiến trường.";
          } catch (error) {
            query("#war-shop-message").textContent =
              error instanceof Error ? error.message : String(error);
          }
          refresh(true);
        }),
    );
  }
  panel.addEventListener('click',event=>{
    const key=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy20]')?.dataset.buy20;
    if(!key)return;try{const bought=supplies.buy(key,20);query('#war-shop-message').textContent=`Đã mua ${bought} bình.`;}catch(error){query('#war-shop-message').textContent=error instanceof Error?error.message:String(error);}refresh(true);
  });
  query<HTMLInputElement>("#war-shop-quantity").oninput = () => refresh(true);
  panel.querySelectorAll<HTMLButtonElement>("[data-resource]").forEach(
    (button) =>
      (button.onclick = () => {
        resource = button.dataset.resource as PotionResource;
        refresh(true);
      }),
  );
  function open(slot: PotionResource = "life", selectOnly = false) {
    resource = slot;
    selecting = selectOnly;
    panel.hidden = false;
    query("#war-shop-message").textContent = "";
    refresh(true);
  }
  document.body.appendChild(panel);
  return {
    open,
    close,
    refresh,
    get isOpen() {
      return !panel.hidden;
    },
  };
}
