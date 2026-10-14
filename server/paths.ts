import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolve từ vị trí source, không phụ thuộc thư mục chạy lệnh. */
export const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** Import trong test/tool không khởi động server hoặc chạy seed. */
export function isMainModule(url: string): boolean {
  return !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(url);
}
