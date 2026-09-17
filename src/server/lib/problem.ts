// Ошибки API в формате Problem Details (RFC 9457) — как в уроке 375 курса «JS: REST API».
//
// Текст для пользователя собирает клиент — по полю type (ADR 0011). Поэтому здесь у каждого
// пользовательского случая свой type из словаря контракта, а title и detail короткие,
// английские и предназначены разработчику и логам. Русских строк на сервере нет: строка,
// которую никто не показывает, через полгода читается как пользовательский текст, и её
// начинают править вместо интерфейса.
//
// Тип Problem и словарь типов берутся из src/schema.js — того же артефакта
// TypeSpec → OpenAPI, по которому валидируются запросы. Новый случай начинается с правки
// contract/main.tsp: без него нужного значения type просто нет в типе.
//
// Тело отдаётся как application/json, а не application/problem+json: так объявлено в контракте
// (contract/main.tsp), а контракт здесь — источник правды. Понадобится сменить медиатип —
// сначала правится спецификация.

import type { ComponentType } from "../../schema.js";

type Schemas = ComponentType["schemas"];

export type ProblemType = Schemas["ProblemType"];
export type Problem = Schemas["ProblemDetails"];

export class ProblemError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title);
    this.name = "ProblemError";
    this.problem = problem;
  }
}

const problem = (
  type: ProblemType,
  status: number,
  title: string,
  detail?: string,
  extra?: Partial<Problem>,
): ProblemError =>
  new ProblemError({
    type,
    title,
    status,
    ...(detail === undefined ? {} : { detail }),
    ...extra,
  });

// Единственный случай, когда detail собирается из сообщений валидатора: путь поля и причина
// нужны разработчику, а пользователю про них говорит форма.
export const validationError = (detail: string): ProblemError =>
  problem("https://hexlet.io/problems/validation-error", 400, "Invalid request data", detail);

// Вход не различает «нет такого email» и «пароль не тот»: иначе форма входа становится
// способом узнать, кто зарегистрирован в магазине.
export const invalidCredentials = (): ProblemError =>
  problem("https://hexlet.io/problems/invalid-credentials", 401, "Invalid email or password");

export const emailTaken = (): ProblemError =>
  problem("https://hexlet.io/problems/email-taken", 409, "Email already registered");

export const addressRequired = (): ProblemError =>
  problem("https://hexlet.io/problems/address-required", 400, "Shipping address is required");

export const unauthorized = (): ProblemError =>
  problem("https://hexlet.io/problems/unauthorized", 401, "Authentication required");

export const notFound = (detail: string): ProblemError =>
  problem("https://hexlet.io/problems/not-found", 404, "Resource not found", detail);

// Отказ оформления: заказ не создаётся целиком, а клиент получает перечень проблемных товаров,
// чтобы показать пользователю, что именно убрать из корзины (CONTEXT.md, термин Checkout).
export const unavailableItems = (productIds: number[]): ProblemError =>
  problem(
    "https://hexlet.io/problems/unavailable-items",
    400,
    "Order contains unavailable products",
    undefined,
    { unavailableProductIds: productIds.map(String) },
  );

export const internalError = (): ProblemError =>
  problem("https://hexlet.io/problems/internal-error", 500, "Internal server error");
