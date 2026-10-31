import * as real from './real.js';
import * as mock from './mock.js';

// One interface, two implementations. Pages never know which one is active.
const api = import.meta.env.VITE_USE_MOCK === 'true' ? mock : real;
export const isMock = api === mock;
export default api;
