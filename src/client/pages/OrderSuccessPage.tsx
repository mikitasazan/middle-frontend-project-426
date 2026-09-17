import {
  Anchor,
  Badge,
  Button,
  Divider,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation } from "react-router-dom";

import type { Order } from "../api";
import { formatDateTime, formatMoney } from "../lib/format";
import { accountPath, catalogPath } from "../lib/routes";

// Страница успеха показывает заказ, который вернул сервер: состав и итог здесь — уже
// сохранённый снимок, а не пересчёт корзины на клиенте.
export const OrderSuccessPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const order = (location.state as { order?: Order } | null)?.order;

  // Прямой заход по адресу без оформления показывать нечего — уводим в каталог.
  if (!order) {
    return <Navigate to={catalogPath()} replace />;
  }

  return (
    <Stack gap="lg" data-testid="order-success">
      <Paper withBorder p="xl" bg="teal.0">
        <Group gap="md" align="center" wrap="nowrap">
          <ThemeIcon color="teal" size={44} radius="xl">
            <Text fw={800}>✓</Text>
          </ThemeIcon>
          <Stack gap={2}>
            <Title order={2}>{t(($) => $.orderSuccess.title, { id: order.id })}</Title>
            <Text size="sm" c="dimmed">
              {formatDateTime(order.createdAt)} ·{" "}
              {order.shipping.method === "delivery"
                ? t(($) => $.orderSuccess.delivery, {
                    address: order.shipping.address ?? "",
                  })
                : t(($) => $.orderSuccess.pickup)}
            </Text>
          </Stack>
        </Group>
      </Paper>

      <Grid gap="lg" align="start">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder p="lg">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={600}>{t(($) => $.orderSuccess.items)}</Text>
                <Badge color="teal">{t(($) => $.account.status.paid)}</Badge>
              </Group>
              <Divider />
              {order.items.map((item) => (
                <Group
                  key={item.productId}
                  justify="space-between"
                  align="flex-start"
                  wrap="nowrap"
                  gap="md"
                >
                  <Text size="sm">
                    {item.productName} × {item.quantity}
                  </Text>
                  <Text size="sm" fw={600} style={{ whiteSpace: "nowrap" }}>
                    {formatMoney({
                      amount: item.priceAtPurchase.amount * item.quantity,
                      currency: item.priceAtPurchase.currency,
                    })}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder p="lg">
            <Stack gap="md">
              <Group justify="space-between" align="baseline">
                <Text c="dimmed">{t(($) => $.orderSuccess.total)}</Text>
                <Text fz="xl" fw={800} data-testid="order-total">
                  {formatMoney(order.total)}
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {t(($) => $.orderSuccess.recipient, {
                  name: order.shipping.recipientName,
                  phone: order.shipping.phone,
                })}
              </Text>
              <Button component={Link} to={accountPath()} size="md" fullWidth>
                {t(($) => $.orderSuccess.myOrders)}
              </Button>
              <Anchor component={Link} to={catalogPath()} ta="center" size="sm">
                {t(($) => $.orderSuccess.backToCatalog)}
              </Anchor>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
