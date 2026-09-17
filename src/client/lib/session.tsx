// Состояние авторизации фронтенда. Источник правды — сервер: при загрузке страницы приложение
// спрашивает /api/me, поэтому вход переживает перезагрузку и не хранится в localStorage.

import { Center, Loader } from "@mantine/core";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import * as api from "../api";
import { signInPath } from "./routes";

type SessionValue = {
  user: api.User | null;
  // Пока сервер не ответил, состояние неизвестно — и это третье состояние, а не «анонимен».
  // Без него перезагрузка личного кабинета выкидывала бы авторизованного на страницу входа.
  status: "loading" | "ready";
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<api.User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    let active = true;
    api
      .fetchMe()
      .then((loaded) => {
        if (active) {
          setUser(loaded);
        }
      })
      .catch(() => {
        // Сеть или сервер недоступны — считаем посетителя анонимным, но не роняем приложение.
      })
      .finally(() => {
        if (active) {
          setStatus("ready");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const value: SessionValue = {
    user,
    status,
    signUp: async (email, password) => {
      // Регистрация сразу открывает сессию на сервере, поэтому повторный вход не нужен.
      setUser(await api.signUp(email, password));
    },
    signIn: async (email, password) => {
      setUser(await api.signIn(email, password));
    },
    signOut: async () => {
      // Выход уничтожает сессию на сервере (ADR 0002). Локальное состояние обнуляем в любом
      // случае: пользователь нажал «Выйти», и оставлять интерфейс авторизованным нельзя.
      try {
        await api.signOut();
      } finally {
        setUser(null);
      }
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionValue => {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession вызван вне SessionProvider");
  }
  return value;
};

// Защита страниц, доступных только авторизованным. Проверка живёт в роутинге, поэтому
// закрыты и переход по ссылке, и прямой заход по адресу.
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, status } = useSession();

  if (status === "loading") {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  if (!user) {
    return <Navigate to={signInPath()} replace />;
  }
  return children;
};
