CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image_url" VARCHAR(2048),
    "category_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_price_check" CHECK ("price" > 0),
    CONSTRAINT "products_stock_check" CHECK ("stock" >= 0)
);

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_price_idx" ON "products"("price");
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

ALTER TABLE "products"
ADD CONSTRAINT "products_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
