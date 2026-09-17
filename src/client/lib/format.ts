import type { Money } from "../api";

// Цены в проекте — целые рубли без копеек (CONTEXT.md, термин Money), поэтому дробной части
// в форматировании нет. Валюта приходит из API: символ подставляем только для известной.
export const formatMoney = (money: Money): string => {
  const amount = money.amount.toLocaleString("ru-RU");
  return money.currency === "RUB" ? `${amount} ₽` : `${amount} ${money.currency}`;
};

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  });
