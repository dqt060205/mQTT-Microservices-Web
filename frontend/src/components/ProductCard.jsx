import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import AddToCartButton from './AddToCartButton.jsx';
import { formatPrice, stars } from '../utils/format.js';

export default function ProductCard({ product }) {
  const soldOut = product.stock != null && product.stock <= 0;
  return (
    <article className="card">
      <Link to={`/products/${product.id}`} className="card-link">
        <ProductImage product={product} />
        <h3>{product.name}</h3>
        {product.rating != null && (
          <p className="rating" aria-label={`${product.rating} out of 5`}>
            <span>{stars(product.rating)}</span> {product.reviewCount?.toLocaleString()}
          </p>
        )}
        <p className="price">{formatPrice(product.price)}</p>
        {soldOut && <p className="out">Currently unavailable</p>}
        {!soldOut && product.stock <= 10 && <p className="low">Only {product.stock} left in stock</p>}
      </Link>
      <AddToCartButton productId={product.id} disabled={soldOut} />
    </article>
  );
}
