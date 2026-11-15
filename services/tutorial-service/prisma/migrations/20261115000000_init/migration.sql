-- CreateTable
CREATE TABLE "tutorials" (
    "id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "image_url" VARCHAR(2048),
    "video_url" VARCHAR(2048),
    "product_id" UUID,
    "category" VARCHAR(100),
    "difficulty" VARCHAR(40),
    "read_time" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "author_name" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutorials_slug_key" ON "tutorials"("slug");
CREATE INDEX "tutorials_product_id_idx" ON "tutorials"("product_id");
CREATE INDEX "tutorials_category_idx" ON "tutorials"("category");
CREATE INDEX "tutorials_is_published_idx" ON "tutorials"("is_published");
CREATE INDEX "tutorials_created_at_idx" ON "tutorials"("created_at");
