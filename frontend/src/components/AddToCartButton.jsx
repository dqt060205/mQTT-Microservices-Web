import { useState } from 'react';
import { useAddToCart } from '../context/CartContext.jsx';

export default function AddToCartButton({ productId, quantity = 1, disabled, className = 'btn btn-yellow', children = 'Add to Cart' }) {
  const addToCart = useAddToCart();
  const [state, setState] = useState('idle');

  const onClick = async (e) => {
    e.preventDefault();
    setState('busy');
    try {
      const added = await addToCart(productId, quantity);
      setState(added ? 'added' : 'idle');
      if (added) setTimeout(() => setState('idle'), 1500);
    } catch (err) {
      setState('idle');
      alert(err.message);
    }
  };

  return (
    <button className={className} onClick={onClick} disabled={disabled || state === 'busy'}>
      {state === 'added' ? 'Added ✓' : state === 'busy' ? 'Adding…' : children}
    </button>
  );
}
