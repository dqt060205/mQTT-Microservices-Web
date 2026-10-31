const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
export const formatPrice = (n) => vnd.format(Number(n) || 0);

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export const CATEGORIES = ['Boards', 'Sensors', 'Wireless', 'Actuators', 'Displays'];

const EMOJI = { Boards: '🖥️', Sensors: '🌡️', Wireless: '📡', Actuators: '⚙️', Displays: '📺' };
export const categoryOf = (p) => p?.category?.name ?? p?.category ?? '';
export const emojiOf = (p) => EMOJI[categoryOf(p)] ?? '📦';

export const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
