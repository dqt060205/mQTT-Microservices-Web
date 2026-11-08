import { useEffect, useState } from 'react';

export const SORT_OPTIONS = [
  ['newest', 'Newest'],
  ['price-asc', 'Price: Low to High'],
  ['price-desc', 'Price: High to Low'],
  ['name', 'Name: A to Z'],
];

// Sort, price range and in-stock filter. Reports changes through onChange({ key: value }).
export default function ProductFilters({ sort, min, max, inStock, active, onChange, onClear }) {
  const [draft, setDraft] = useState({ min: min ?? '', max: max ?? '' });
  useEffect(() => setDraft({ min: min ?? '', max: max ?? '' }), [min, max]);

  const applyPrice = (e) => {
    e.preventDefault();
    let { min: lo, max: hi } = draft;
    if (lo !== '' && hi !== '' && Number(lo) > Number(hi)) [lo, hi] = [hi, lo];
    onChange({ min: lo, max: hi });
  };

  return (
    <div className="filters">
      <label className="filter">Sort by
        <select value={sort} onChange={(e) => onChange({ sort: e.target.value })}>
          {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <form className="filter filter-price" onSubmit={applyPrice}>
        <span>Price (₫)</span>
        <input type="number" min="0" step="1000" placeholder="Min" aria-label="Minimum price"
          value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} />
        <input type="number" min="0" step="1000" placeholder="Max" aria-label="Maximum price"
          value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} />
        <button className="btn btn-light">Apply</button>
      </form>

      <label className="filter filter-check">
        <input type="checkbox" checked={inStock} onChange={(e) => onChange({ stock: e.target.checked ? '1' : '' })} />
        In stock only
      </label>

      {active && <button className="linkbtn" onClick={onClear}>Clear filters</button>}
    </div>
  );
}