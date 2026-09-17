import type { SelectorParam } from "i18next";

import type { Problem } from "../api";

// Текст ошибки выбирает клиент — по стабильному problem.type, а не по тексту от сервера
// (ADR 0011). Ключи объявлены селекторами через satisfies: пропущенный тип из контракта и
// опечатка в пути становятся ошибкой компиляции, а не пустым сообщением в интерфейсе.
const errorSelectors = {
  "https://hexlet.io/problems/invalid-credentials": ($) => $.errors.invalidCredentials,
  "https://hexlet.io/problems/email-taken": ($) => $.errors.emailTaken,
  "https://hexlet.io/problems/address-required": ($) => $.errors.addressRequired,
  "https://hexlet.io/problems/unavailable-items": ($) => $.errors.unavailableItems,
  "https://hexlet.io/problems/validation-error": ($) => $.errors.validationError,
  "https://hexlet.io/problems/unauthorized": ($) => $.errors.unauthorized,
  "https://hexlet.io/problems/not-found": ($) => $.errors.notFound,
  "https://hexlet.io/problems/internal-error": ($) => $.errors.internalError,
  "about:blank": ($) => $.errors.blank,
} satisfies Record<Problem["type"], SelectorParam>;

// Тип в теле ответа приходит из сети, поэтому проверка на попадание в словарь остаётся
// рантайм-проверкой: за приложением может стоять прокси со своим форматом ошибок.
export const problemMessage = (problem: Problem): SelectorParam => {
  const known: Record<string, SelectorParam | undefined> = errorSelectors;
  return known[problem.type] ?? (($) => $.errors.blank);
};
