export { createSourceCollector, explainStatus } from './model';
export { renderStatus } from './view';
export { mountStatusInspector } from './runtime';
import { mountStatusInspector } from './runtime';
export const inspector = typeof document !== 'undefined' ? mountStatusInspector() : null;
