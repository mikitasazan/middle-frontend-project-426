import {
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import type { Product } from "../api";
import { ProductImage } from "../components/ProductImage";
import {
  type CartLine,
  cartTotal,
  removeFromCart,
  setCartQuantity,
  useCart,
  useCartProducts,
} from "../lib/cart";
import { formatMoney } from "../lib/format";
import { catalogPath, checkoutPath, productPath } from "../lib/routes";

const CartRow = ({ line, product }: { line: CartLine; product: Product | null | undefined }) => {
  const { t } = useTranslation();

  return (
    <Card padding="md" data-testid="cart-item">
      <Group align="center" wrap="wrap" gap="md">
        {product && (
          <div style={{ width: 96, flexShrink: 0 }}>
            <ProductImage product={product} ratio={1} />
          </div>
        )}

        <Stack gap={4} style={{ flex: "1 1 220px", minWidth: 0 }}>
          {product ? (
            <Anchor component={Link} to={productPath(product.id)} fw={600} c="dark.7" lineClamp={2}>
              {product.name}
            </Anchor>
          ) : (
            <Text fw={600} c="dimmed">
              {t(($) => $.cart.unknownProduct)}
            </Text>
          )}
          {/* Цена берётся из каталога, а не из корзины: она могла измениться. */}
          {product && (
            <Text size="sm" c="dimmed">
              {t(($) => $.cart.perUnit, { price: formatMoney(product.price) })}
            </Text>
          )}
          {product && !product.available && (
            <Badge color="red" variant="light">
              {t(($) => $.cart.outOfStockHint)}
            </Badge>
          )}
          {product === null && (
            <Badge color="red" variant="light">
              {t(($) => $.cart.goneHint)}
            </Badge>
          )}
        </Stack>

        <TextInput
          type="number"
          min={1}
          w={90}
          aria-label={t(($) => $.cart.quantity)}
          data-testid="cart-item-qty"
          value={String(line.quantity)}
          onChange={(event) => {
            const quantity = Number(event.currentTarget.value);
            // Пустое поле и мусор игнорируем: количество меньше единицы для корзины
            // не означает ничего осмысленного.
            if (Number.isInteger(quantity) && quantity > 0) {
              setCartQuantity(line.productId, quantity);
            }
          }}
        />

        <Text fw={700} w={130} ta="right">
          {product
            ? formatMoney({
                amount: product.price.amount * line.quantity,
                currency: product.price.currency,
              })
            : "—"}
        </Text>

        <Button
          variant="subtle"
          color="red"
          onClick={() => removeFromCart(line.productId)}
          data-testid="cart-item-remove"
        >
          {t(($) => $.cart.remove)}
        </Button>
      </Group>
    </Card>
  );
};

export const CartPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lines = useCart();
  const { byId, loading } = useCartProducts(lines);

  if (lines.length === 0) {
    return (
      <Stack gap="lg">
        <Title order={1}>{t(($) => $.cart.title)}</Title>
        <Paper withBorder p="xl" data-testid="cart-empty">
          <Stack align="center" gap="xs">
            <Title order={3}>{t(($) => $.cart.empty.title)}</Title>
            <Text c="dimmed" ta="center">
              {t(($) => $.cart.empty.text)}
            </Text>
            <Button component={Link} to={catalogPath()} variant="light" mt="sm">
              {t(($) => $.cart.empty.action)}
            </Button>
          </Stack>
        </Paper>
        {/* Кнопка остаётся на месте, но заблокирована: пустую корзину оформить нельзя. */}
        <Group justify="flex-end">
          <Button size="md" disabled data-testid="cart-checkout">
            {t(($) => $.cart.checkout)}
          </Button>
        </Group>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  const total = cartTotal(lines, byId);

  return (
    <Stack gap="lg">
      <Title order={1}>{t(($) => $.cart.title)}</Title>

      <Grid gap="lg" align="start">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            {lines.map((line) => (
              <CartRow key={line.productId} line={line} product={byId.get(line.productId)} />
            ))}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder p="lg">
            <Stack gap="sm">
              <Text fw={600}>{t(($) => $.cart.summary.title)}</Text>
              <Divider />
              <Group justify="space-between" align="baseline">
                <Text c="dimmed">{t(($) => $.cart.summary.items)}</Text>
                <Text>{lines.reduce((sum, l) => sum + l.quantity, 0)}</Text>
              </Group>
              <Group justify="space-between" align="baseline">
                <Text c="dimmed">{t(($) => $.cart.summary.total)}</Text>
                <Text fz="xl" fw={800} data-testid="cart-total">
                  {formatMoney(total)}
                </Text>
              </Group>
              <Button
                size="md"
                fullWidth
                onClick={() => navigate(checkoutPath())}
                data-testid="cart-checkout"
              >
                {t(($) => $.cart.checkout)}
              </Button>
              <Text size="xs" c="dimmed">
                {t(($) => $.cart.summary.note)}
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
