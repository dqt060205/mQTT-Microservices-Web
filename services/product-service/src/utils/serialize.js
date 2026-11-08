function toProductDTO(product) {
  if (!product) return null;
  return {
    ...product,
    price: product.price != null ? product.price.toString() : '0.00',
  };
}

function toCategoryDTO(category) {
  if (!category) return null;
  const { _count, ...data } = category;
  return {
    ...data,
    productCount: _count?.products ?? category.productCount,
  };
}

module.exports = { toProductDTO, toCategoryDTO };

