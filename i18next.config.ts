import { defineConfig } from "i18next-cli";

// Ключи вынимаются из кода, а не поддерживаются руками: пропущенный перевод
// иначе виден только тогда, когда на него наткнулся пользователь.
// `types` генерирует объявление ресурсов, после которого t() с несуществующим
// ключом не проходит проверку типов.
//
// Смотрим только клиент: тексты интерфейса это его дело, у сервера своих нет.
export default defineConfig({
  locales: ["ru"],
  extract: {
    input: ["src/client/**/*.{ts,tsx}"],
    output: "src/client/locales/{{language}}/{{namespace}}.json",
    defaultNS: "translation",
    primaryLanguage: "ru",
    // Ключи ошибок выбираются по problem.type в client/lib/problems.ts, в t() их не видно.
    // Без этого extract считал бы их неиспользуемыми и вычищал из json.
    preservePatterns: ["errors.*"],
  },
  types: {
    input: ["src/client/locales/ru/*.json"],
    output: "src/client/@types/i18next.d.ts",
    enableSelector: true,
  },
});
