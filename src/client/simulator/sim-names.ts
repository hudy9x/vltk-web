/** 100 names per gender, shuffled without repetition until a pool is exhausted.
 * A suffix keeps names unique when the army exceeds a gender's 100-name pool.
 */
const FAMILY_NAMES = [
  "Lâm",
  "Trần",
  "Nguyễn",
  "Lê",
  "Phạm",
  "Hoàng",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
  "Đinh",
  "Tô",
  "Phan",
  "Võ",
  "Tạ",
  "Mạc",
];
export const SIM_NAME_POOLS = [
  FAMILY_NAMES.flatMap((family) =>
    ["Thiên Phong", "Minh Quân", "Vân Hạo", "Hạo Nhiên", "Kiếm Tâm"].map(
      (given) => `${family} ${given}`,
    ),
  ),
  FAMILY_NAMES.flatMap((family) =>
    ["Ngọc Linh", "Thanh Trúc", "Mộng Dao", "Tuyết Nhi", "Vân Khê"].map(
      (given) => `${family} ${given}`,
    ),
  ),
];
export function createSimNames(random = Math.random) {
  let pools: string[][] = [],
    used = [0, 0];
  function reset() {
    pools = SIM_NAME_POOLS.map((names) => {
      const shuffled = [...names];
      for (let index = shuffled.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
      }
      return shuffled;
    });
    used = [0, 0];
  }
  function next(sex: number) {
    const gender = sex === 1 ? 1 : 0,
      index = used[gender]++;
    const name = pools[gender][index % pools[gender].length];
    const cycle = Math.floor(index / pools[gender].length);
    return cycle ? `${name} ${cycle + 1}` : name;
  }
  reset();
  return { next, reset };
}
