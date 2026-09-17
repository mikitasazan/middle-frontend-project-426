// Клиентский слой доступа к API. Типы не пишутся руками: они берутся из src/schema.js —
// того же артефакта TypeSpec → OpenAPI → TypeBox, по которому валидирует запросы бэкенд.
// Поэтому расхождение фронтенда с контрактом становится ошибкой компиляции, а не багом в проде.

import type { ComponentType } from "../schema.js";

type Schemas = ComponentType["schemas"];

export type Money = Schemas["Money"];
export type Category = Schemas["Category"];
export type Product = Schemas["Product"];
export type ProductPage = Schemas["ProductPage"];
export type Promo = Schemas["Promo"];
export type User = Schemas["User"];
export type Order = Schemas["Order"];
export type CartItem = Schemas["CartItem"];
export type ShippingDetails = Schemas["ShippingDetails"];
export type ShippingMethod = Schemas["ShippingMethod"];
export type CreateOrderRequest = Schemas["CreateOrderRequest"];
export type Problem = Schemas["ProblemDetails"];

// Ошибки API приходят в формате Problem Details (RFC 9457). Заворачиваем их в исключение,
// чтобы вызывающий код ветвился по стабильным полям status и type, а не по тексту сообщения.
export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.problem = problem;
  }
}

const isProblem = (value: unknown): value is Problem =>
  typeof value === "object" && value !== null && "title" in value && "status" in value;

const readProblem = async (response: Response): Promise<Problem> => {
  try {
    const body: unknown = await response.json();
    if (isProblem(body)) {
      return body;
    }
  } catch {
    // Тело не JSON — например, ответ прокси. Ниже соберём Problem сами.
  }
  // about:blank — значение type по умолчанию из RFC 9457. Текст пользователю подберёт
  // интерфейс по этому типу (lib/problems.ts), поэтому title остаётся техническим.
  return {
    type: "about:blank",
    title: "Request failed",
    status: response.status,
  };
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    // Сессия живёт в httpOnly-cookie. Приложение работает на одном origin (ADR 0005),
    // поэтому достаточно same-origin: CORS и заголовки авторизации не нужны.
    credentials: "same-origin",
    ...init,
    headers:
      init?.body === undefined
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new ApiError(await readProblem(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};

// Состояние фильтров каталога живёт строками: ровно так их отдают поля ввода.
// В параметры запроса попадают только заполненные значения — пустое priceMin в строке
// запроса не прошло бы валидацию схемы, которая ждёт целое число.
export type CatalogQuery = {
  category: string;
  q: string;
  priceMin: string;
  priceMax: string;
  available: boolean;
  page: number;
};

// Прерванный запрос — не сбой, а штатный результат отмены (см. fetchProducts): вызывающий
// код отличает его от настоящей ошибки этим предикатом, а не сравнением текста сообщения.
export const isAborted = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export const fetchCategories = (): Promise<Category[]> => request<Category[]>("/api/categories");

export const fetchPromos = (): Promise<Promo[]> => request<Promo[]>("/api/promos");

export const fetchProducts = (query: CatalogQuery, signal?: AbortSignal): Promise<ProductPage> => {
  const params = new URLSearchParams();
  if (query.category) {
    params.set("category", query.category);
  }
  if (query.q.trim()) {
    params.set("q", query.q.trim());
  }
  if (query.priceMin.trim()) {
    params.set("priceMin", query.priceMin.trim());
  }
  if (query.priceMax.trim()) {
    params.set("priceMax", query.priceMax.trim());
  }
  // Чекбокс «только в наличии» выключен — параметра нет вовсе, и в выдаче остаются все
  // товары. available=false означало бы «покажи только недоступные».
  if (query.available) {
    params.set("available", "true");
  }
  params.set("page", String(query.page));
  // Запрос отменяем, а не только игнорируем ответ: при быстром вводе в поиск устаревшие
  // запросы не должны занимать соединения и грузить сервер.
  return request<ProductPage>(`/api/products?${params.toString()}`, { signal });
};

export const fetchProduct = (id: string): Promise<Product> =>
  request<Product>(`/api/products/${encodeURIComponent(id)}`);

// Текущий пользователь: 401 — это не сбой, а штатный ответ «посетитель анонимен».
export const fetchMe = async (): Promise<User | null> => {
  try {
    return await request<User>("/api/me");
  } catch (error) {
    if (error instanceof ApiError && error.problem.status === 401) {
      return null;
    }
    throw error;
  }
};

export const signUp = (email: string, password: string): Promise<User> =>
  request<User>("/api/users", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signIn = (email: string, password: string): Promise<User> =>
  request<User>("/api/session", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signOut = (): Promise<void> => request<void>("/api/session", { method: "DELETE" });

export const createOrder = (body: CreateOrderRequest): Promise<Order> =>
  request<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const fetchOrders = (): Promise<Order[]> => request<Order[]>("/api/orders");
