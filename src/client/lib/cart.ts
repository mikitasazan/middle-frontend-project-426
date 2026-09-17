// Корзина — единственное состояние проекта, которое живёт на клиенте (ADR 0001). На бэкенде
// сущности корзины нет: сервер узнаёт её состав только в момент оформления заказа.
//
// В хранилище лежат ТОЛЬКО идентификатор товара и количество. Названия и цены каждый раз
// перечитываются из каталога, поэтому подорожавший товар показывает новую цену сразу,
// а не в момент оплаты. Снимок цены появляется позже и в другом месте — в позициях заказа.

import { useEffect, useMemo, useState } from "react";

import { type CartItem, fetchProduct, type Money, type Product } from "../api";

const STORAGE_KEY = "online-store-cart";

export type CartLine = CartItem;

const isCartLine = (value: unknown): value is CartLine =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as CartLine).productId === "string" &&
  Number.isInteger((value as CartLine).quantity) &&
  (value as CartLine).quantity > 0;

export const readCart = (): CartLine[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    // Хранилище правит кто угодно — от пользователя до расширения браузера. Поэтому корзина
    // не доверяет своему же формату: непонятные записи отбрасываются, а не роняют страницу.
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
  } catch {
    return [];
  }
};

// localStorage не уведомляет об изменениях в том же окне (событие storage приходит только
// в другие табы), поэтому подписку держим сами.
const listeners = new Set<() => void>();

const writeCart = (lines: CartLine[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  for (const listener of listeners) {
    listener();
  }
};

export const addToCart = (productId: string, quantity = 1): void => {
  const lines = readCart();
  const existing = lines.find((line) => line.productId === productId);
  if (existing) {
    writeCart(
      lines.map((line) =>
        line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line,
      ),
    );
    return;
  }
  writeCart([...lines, { productId, quantity }]);
};

export const setCartQuantity = (productId: string, quantity: number): void => {
  writeCart(
    readCart().map((line) => (line.productId === productId ? { ...line, quantity } : line)),
  );
};

export const removeFromCart = (productId: string): void => {
  writeCart(readCart().filter((line) => line.productId !== productId));
};

export const clearCart = (): void => {
  writeCart([]);
};

export const useCart = (): CartLine[] => {
  const [lines, setLines] = useState<CartLine[]>(() => readCart());

  useEffect(() => {
    const sync = (): void => setLines(readCart());
    // Перечитываем на монтировании: пока компонент не был на экране, корзину мог изменить
    // другой таб или код вне React.
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return lines;
};

export type CartProducts = {
  // null вместо товара — позиция, которой в каталоге больше нет. Такую строку показываем
  // отдельно, а не как обычную: цены у неё нет и в итог она не входит.
  byId: Map<string, Product | null>;
  loading: boolean;
};

export const useCartProducts = (lines: CartLine[]): CartProducts => {
  const [byId, setById] = useState<Map<string, Product | null>>(new Map());
  const [loading, setLoading] = useState(true);

  // Ключ по идентификаторам, а не по самим позициям: изменение количества не должно
  // приводить к повторной загрузке каталога.
  const idsKey = useMemo(() => lines.map((line) => line.productId).join(","), [lines]);

  useEffect(() => {
    let active = true;
    const ids = idsKey === "" ? [] : idsKey.split(",");
    setLoading(true);

    Promise.all(
      ids.map(async (id): Promise<[string, Product | null]> => {
        try {
          return [id, await fetchProduct(id)];
        } catch {
          return [id, null];
        }
      }),
    ).then((entries) => {
      if (active) {
        setById(new Map(entries));
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [idsKey]);

  return { byId, loading };
};

// Итог корзины — справочный: настоящую сумму заказа считает бэкенд по текущим ценам.
// Позиции, которых больше нет в каталоге, в итог не входят: цены у них нет.
export const cartTotal = (lines: CartLine[], byId: Map<string, Product | null>): Money => {
  let amount = 0;
  let currency = "RUB";
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (product) {
      amount += product.price.amount * line.quantity;
      currency = product.price.currency;
    }
  }
  return { amount, currency };
};
