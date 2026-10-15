import { createSimulator } from './runtime';

// esbuild returns this value directly as the legacy `arenaSimulator` binding.
// Preserve the object (and null outside Arena) without a JavaScript bridge.
declare const module: { exports: ReturnType<typeof createSimulator> };
module.exports = createSimulator();
