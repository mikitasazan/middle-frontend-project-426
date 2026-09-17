import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Цены — целые рубли без копеек (CONTEXT.md, термин Money), поэтому integer, а не numeric:
// дробные типы дают ошибки округления в итоге заказа.

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    // slug — естественный ключ: по нему фильтруется каталог и по нему же сид остаётся
    // идемпотентным (make build выполняется при каждом деплое).
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    // Пусто — интерфейс показывает заглушку.
    imageUrl: text("image_url"),
    // Булев признак: числовых остатков и резервирования в проекте нет (CONTEXT.md, Availability).
    available: boolean("available").notNull().default(true),
  },
  (table) => [uniqueIndex("products_slug_unique").on(table.slug)],
);

// Промо-блок главной страницы: текст магазина и товар, к которому он ведёт (CONTEXT.md, Promo).
// Уникальность по product_id держит сид идемпотентным и заодно запрещает два промо на один товар.
export const promos = pgTable(
  "promos",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    text: text("text").notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
  },
  (table) => [uniqueIndex("promos_product_id_unique").on(table.productId)],
);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  // В проекте единственный статус: оформление считается совершённой оплатой.
  status: text("status").notNull().default("paid"),
  shippingMethod: text("shipping_method").notNull(),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  // Улица и дом свободной строкой; при самовывозе не заполняется. Города нет — он подразумевается.
  address: text("address"),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Позиция заказа хранит снимок товара на момент покупки и не джойнится с актуальным products
// при показе: переименование товара или смена цены не меняют старый заказ.
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  priceAtPurchase: integer("price_at_purchase").notNull(),
  quantity: integer("quantity").notNull(),
});
