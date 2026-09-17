// Пути приложения в одном месте: адрес меняется правкой одной функции, а не поиском строки
// по проекту. Идентификатор товара в адресе — тот же, что в API: страница товара и запрос
// к /api/products/{id} говорят об одном и том же ресурсе.

// Корневой адрес — главная с промо-блоками, а не каталог: каталог живёт отдельной страницей
// (ADR 0015), и попадают в него ссылкой из шапки.
export const homePath = (): string => "/";
export const catalogPath = (): string => "/catalog";
export const productPath = (id: string): string => `/products/${id}`;
export const productRoute = (): string => "/products/:id";
export const cartPath = (): string => "/cart";
export const signUpPath = (): string => "/signup";
export const signInPath = (): string => "/signin";
export const checkoutPath = (): string => "/checkout";
export const orderSuccessPath = (): string => "/checkout/success";
export const accountPath = (): string => "/account";
