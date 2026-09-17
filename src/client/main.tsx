import "@mantine/core/styles.css";
import "./index.css";
// Локаль инициализируется до первого рендера: компоненты зовут t() уже на монтировании.
import "./locales";

import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { initMonitoring } from "./lib/monitoring";
import { SessionProvider } from "./lib/session";
import { theme } from "./theme";

// Мониторинг поднимается до рендера, чтобы поймать и ошибки первой отрисовки.
// Без DSN вызов ничего не делает и рендер не задерживает (ADR 0008: вендор не фиксирован).
void initMonitoring();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Элемент #root не найден");
}

// Состояние авторизации нужно и навигации, и защищённым страницам, поэтому провайдер
// стоит выше роутера — но внутри него, чтобы Navigate работал.
createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
