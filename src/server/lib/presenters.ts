// Преобразование строк БД в форму контракта. Держим в одном месте, чтобы роуты не расходились
// между собой: идентификаторы в API — строки, цены — модель Money.

const CURRENCY = "RUB";

export type MoneyView = { amount: number; currency: string };

export const money = (amount: number): MoneyView => ({
  amount,
  currency: CURRENCY,
});

export type CategoryRow = { id: number; slug: string; name: string };

export const categoryView = (row: CategoryRow) => ({
  id: String(row.id),
  slug: row.slug,
  name: row.name,
});

export type ProductRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string | null;
  available: boolean;
};

export const productView = (row: ProductRow) => ({
  id: String(row.id),
  slug: row.slug,
  name: row.name,
  description: row.description,
  price: money(row.price),
  categoryId: String(row.categoryId),
  // Контракт объявляет imageUrl необязательным, поэтому null не отдаём — опускаем поле.
  ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
  available: row.available,
});

export type PromoRow = {
  id: number;
  title: string;
  text: string;
};

// Товар приходит вложенным: главной нужны его название и цена, второй запрос за ними был бы
// лишним. Форма товара — та же, что в каталоге, поэтому переиспользуем productView.
export const promoView = (row: PromoRow, product: ProductRow) => ({
  id: String(row.id),
  title: row.title,
  text: row.text,
  product: productView(product),
});

export type UserRow = { id: number; email: string };

export const userView = (row: UserRow) => ({
  id: String(row.id),
  email: row.email,
});

export type OrderRow = {
  id: number;
  status: string;
  shippingMethod: string;
  recipientName: string;
  phone: string;
  address: string | null;
  total: number;
  createdAt: Date;
};

export type OrderItemRow = {
  productId: number;
  productName: string;
  priceAtPurchase: number;
  quantity: number;
};

export const orderView = (order: OrderRow, items: OrderItemRow[]) => ({
  id: String(order.id),
  status: order.status,
  items: items.map((item) => ({
    productId: String(item.productId),
    productName: item.productName,
    priceAtPurchase: money(item.priceAtPurchase),
    quantity: item.quantity,
  })),
  shipping: {
    method: order.shippingMethod,
    recipientName: order.recipientName,
    phone: order.phone,
    ...(order.address ? { address: order.address } : {}),
  },
  total: money(order.total),
  createdAt: order.createdAt.toISOString(),
});
