import {
  Alert,
  Anchor,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api";
import { problemMessage } from "../lib/problems";
import { catalogPath, signInPath, signUpPath } from "../lib/routes";
import { useSession } from "../lib/session";

// Регистрация и вход отличаются только вызовом API и подписями: форма, валидация и обработка
// ошибок у них общие. Две копии одного экрана расходились бы при первой же правке.
export const AuthForm = ({ mode }: { mode: "signup" | "signin" }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : t(($) => $.auth.invalidEmail),
      password: (value) => (value.length >= 6 ? null : t(($) => $.auth.shortPassword)),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSending(true);
    try {
      const submit = mode === "signup" ? session.signUp : session.signIn;
      await submit(values.email.trim(), values.password);
      navigate(catalogPath());
    } catch (cause) {
      // «Email занят» и «неверный пароль» — бизнес-правила: сервер сообщает о них типом
      // проблемы, а формулировку выбирает интерфейс (ADR 0011).
      setError(
        cause instanceof ApiError ? t(problemMessage(cause.problem)) : t(($) => $.errors.network),
      );
    } finally {
      setSending(false);
    }
  });

  // Регистрация и вход лежат в локали двумя секциями одинаковой формы, поэтому экран
  // выбирает секцию, а не собирает текст условиями в вёрстке.
  const isSignUp = mode === "signup";
  const section = isSignUp ? "signUp" : "signIn";

  return (
    <Center>
      <Paper withBorder p="xl" w="100%" maw={440}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={2}>{t(($) => $.auth[section].title)}</Title>
              <Text size="sm" c="dimmed">
                {t(($) => $.auth[section].subtitle)}
              </Text>
            </Stack>

            {error && (
              <Alert color="red" data-testid="auth-error">
                {error}
              </Alert>
            )}

            <TextInput
              type="email"
              label={t(($) => $.auth.emailLabel)}
              placeholder={t(($) => $.auth.emailPlaceholder)}
              data-testid="auth-email"
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label={t(($) => $.auth.passwordLabel)}
              placeholder={t(($) => $.auth.passwordPlaceholder)}
              size="md"
              data-testid="auth-password"
              {...form.getInputProps("password")}
            />
            <Button type="submit" size="md" loading={sending} data-testid="auth-submit">
              {t(($) => $.auth[section].submit)}
            </Button>

            <Text size="sm" c="dimmed" ta="center">
              {t(($) => $.auth[section].switchPrompt)}
              <Anchor component={Link} to={isSignUp ? signInPath() : signUpPath()} fw={600}>
                {t(($) => $.auth[section].switchLink)}
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
};
