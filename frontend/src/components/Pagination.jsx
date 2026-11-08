// Prev / 1 … 4 5 6 … 20 / Next, plus a "Showing x-y of N" line.
function windowed(page, last) {
  const set = new Set([1, last, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('gap' + n);
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, totalPages, total, limit, onPage }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav className="pager" aria-label="Pagination">
      <p className="pager-info">Showing {from}-{to} of {total}</p>
      {totalPages > 1 && (
        <div className="pager-buttons">
          <button className="btn btn-light" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Previous</button>
          {windowed(page, totalPages).map((n) =>
            typeof n === 'string' ? (
              <span key={n} className="pager-gap">…</span>
            ) : (
              <button
                key={n}
                className={`btn btn-light pager-num${n === page ? ' current' : ''}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <button className="btn btn-light" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next ›</button>
        </div>
      )}
    </nav>
  );
}