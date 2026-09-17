import { Anchor, Badge, Box, Button, Container, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useNavigate } from "react-router-dom";

import { AuthForm } from "./components/AuthForm";
import { useCart } from "./lib/cart";
import {
  accountPath,
  cartPath,
  catalogPath,
  checkoutPath,
  homePath,
  orderSuccessPath,
  productRoute,
  signInPath,
  signUpPath,
} from "./lib/routes";
import { RequireAuth, useSession } from "./lib/session";
import { AccountPage } from "./pages/AccountPage";
import { CartPage } from "./pages/CartPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { OrderSuccessPage } from "./pages/OrderSuccessPage";
import { ProductPage } from "./pages/ProductPage";

const Navigation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const lines = useCart();
  const cartCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate(homePath());
  };

  return (
    <Group justify="space-between" align="center" h={64} wrap="nowrap">
      {/* Логотип ведёт на главную — привычное поведение магазина. Вход в каталог отдельной
          ссылкой рядом: каталог больше не лежит на корневом адресе (ADR 0015). */}
      <Anchor component={Link} to={homePath()}>
        <Group gap={8} align="center" wrap="nowrap">
          <Box w={10} h={10} bg="indigo.6" style={{ borderRadius: 3 }} />
          <Text fw={800} fz="lg" c="dark.7">
            {t(($) => $.app.brand)}
          </Text>
        </Group>
      </Anchor>

      <Group gap="lg" align="center" wrap="nowrap">
        <Anchor component={Link} to={catalogPath()} c="dark.5" fw={500} data-testid="nav-catalog">
          {t(($) => $.nav.catalog)}
        </Anchor>

        <Anchor component={Link} to={cartPath()} c="dark.5" fw={500} data-testid="nav-cart">
          <Group gap={6} align="center" wrap="nowrap">
            {t(($) => $.nav.cart)}
            {/* Признак непустой корзины виден с любой страницы. */}
            {cartCount > 0 && (
              <Badge circle variant="filled">
                {cartCount}
              </Badge>
            )}
          </Group>
        </Anchor>

        {/* Личный раздел и выход видны только авторизованному, вход и регистрация —
            только анонимному. */}
        {user ? (
          <>
            <Anchor
              component={Link}
              to={accountPath()}
              c="dark.5"
              fw={500}
              data-testid="nav-account"
            >
              {t(($) => $.nav.account)}
            </Anchor>
            <Button
              variant="light"
              color="gray"
              onClick={() => void handleSignOut()}
              data-testid="nav-signout"
            >
              {t(($) => $.nav.signOut)}
            </Button>
          </>
        ) : (
          <>
            <Anchor component={Link} to={signInPath()} c="dark.5" fw={500} data-testid="nav-signin">
              {t(($) => $.nav.signIn)}
            </Anchor>
            <Button component={Link} to={signUpPath()} data-testid="nav-signup">
              {t(($) => $.nav.signUp)}
            </Button>
          </>
        )}
      </Group>
    </Group>
  );
};

export default function App() {
  const { t } = useTranslation();

  return (
    <Stack gap={0} mih="100vh">
      {/* Шапка закреплена: корзина и вход остаются под рукой при длинном каталоге. */}
      <Box
        bg="white"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid var(--mantine-color-gray-3)",
        }}
      >
        <Container size="lg">
          <Navigation />
        </Container>
      </Box>

      <Container size="lg" py="xl" style={{ flex: 1, width: "100%" }}>
        <Routes>
          <Route path={homePath()} element={<HomePage />} />
          <Route path={catalogPath()} element={<CatalogPage />} />
          <Route path={productRoute()} element={<ProductPage />} />
          <Route path={cartPath()} element={<CartPage />} />
          <Route path={signUpPath()} element={<AuthForm mode="signup" />} />
          <Route path={signInPath()} element={<AuthForm mode="signin" />} />
          <Route
            path={checkoutPath()}
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path={orderSuccessPath()}
            element={
              <RequireAuth>
                <OrderSuccessPage />
              </RequireAuth>
            }
          />
          <Route
            path={accountPath()}
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
        </Routes>
      </Container>

      <Box mt="xl" py="lg" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
        <Container size="lg">
          <Group justify="space-between" wrap="wrap">
            <Text size="sm" c="dimmed">
              {t(($) => $.app.footer)}
            </Text>
            <Anchor component={Link} to={catalogPath()} size="sm" c="dimmed">
              {t(($) => $.nav.catalog)}
            </Anchor>
          </Group>
        </Container>
      </Box>
    </Stack>
  );
}
