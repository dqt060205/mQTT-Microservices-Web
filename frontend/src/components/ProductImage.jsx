import { emojiOf, categoryOf } from '../utils/format.js';

// Uses the product's image when it has one, otherwise a category-tinted placeholder.
export default function ProductImage({ product, size = 'md' }) {
  if (product.imageUrl) {
    return <img className={`pimg pimg-${size}`} src={product.imageUrl} alt={product.name} />;
  }
  return (
    <div className={`pimg pimg-${size} cat-${categoryOf(product)}`} role="img" aria-label={product.name}>
      <span>{emojiOf(product)}</span>
    </div>
  );
}
