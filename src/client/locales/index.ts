import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import ru from "./ru/translation.json";

// Локаль в проекте одна — ru, переключателя языка нет: интернационализация оставлена как
// направление развития (__data__/checklist.md, «Что дальше»). Смысл выноса другой — тексты
// собраны в одном месте и не размазаны по компонентам (ADR 0011).
//
// Тексты лежат в json, а сам json собирает i18next-cli из вызовов t() (`make i18n-extract`,
// настройки — i18next.config.ts). Руками ни json, ни src/client/@types не правятся.
//
// escapeValue: false — React экранирует вставки сам, второе экранирование ломало бы кавычки
// и амперсанды в названиях товаров.
void i18next.use(initReactI18next).init({
  lng: "ru",
  fallbackLng: "ru",
  resources: { ru: { translation: ru } },
  interpolation: { escapeValue: false },
});

export default i18next;
