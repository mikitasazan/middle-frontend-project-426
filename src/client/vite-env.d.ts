/// <reference types="vite/client" />

// Переменные сборки фронтенда. Vite подставляет только те, что начинаются с VITE_, и делает это
// на этапе сборки — в рантайме их уже не изменить (см. docs/monitoring.md).
interface ImportMetaEnv {
  readonly VITE_MONITORING_DSN?: string;
}
