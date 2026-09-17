import { FormatRegistry } from "@sinclair/typebox";

// TypeBox не знает форматов JSON Schema «из коробки»: их нужно зарегистрировать, иначе валидация
// падает с «Unknown format 'email'». Контракт объявляет форматы (@format("email"), utcDateTime),
// поэтому регистрируем ровно те, что реально встречаются в сгенерированном src/schema.js.

// Прагматичная проверка email: одна @, непустые части, точка в домене. Идеального регулярного
// выражения для email не существует, а строгие варианты отсекают валидные адреса.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const registerFormats = (): void => {
  if (!FormatRegistry.Has("email")) {
    FormatRegistry.Set("email", (value) => EMAIL.test(value));
  }
  if (!FormatRegistry.Has("date-time")) {
    FormatRegistry.Set("date-time", (value) => !Number.isNaN(Date.parse(value)));
  }
  // int32 в OpenAPI — подсказка о разрядности, а не формат строки. TypeBox проверяет тип
  // через T.Integer, поэтому отдельный валидатор не нужен; регистрируем как no-op,
  // чтобы валидация не спотыкалась на незнакомом имени.
  if (!FormatRegistry.Has("int32")) {
    FormatRegistry.Set("int32", () => true);
  }
  if (!FormatRegistry.Has("binary")) {
    FormatRegistry.Set("binary", () => true);
  }
};
