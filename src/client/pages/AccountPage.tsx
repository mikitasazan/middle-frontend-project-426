import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import type { SelectorParam } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { fetchOrders, type Order } from "../api";
import { formatDateTime, formatMoney } from "../lib/format";
import { catalogPath } from "../lib/routes";
import { useSession } from "../lib/session";

// Подпись выводится из статуса: добавится статус в контракте — текст придётся
// добавить в локаль, иначе tsc не соберёт (ADR 0011).
const statusSelectors = {
  paid: ($) => $.account.status.paid,
} satisfies Record<Order["status"], SelectorParam>;

// Детали заказа показываются внутри самого элемента списка: отдельной страницы заказа
// в проекте нет (__data__/checklist.md).
const OrderCard = ({ order }: { order: Order }) => {
  const { t } = useTranslation();

  return (
    <Card padding="lg" data-testid="account-order-item">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <Text fw={700}>{t(($) => $.account.orderNumber, { id: order.id })}</Text>
            {/* Статус дублируется атрибутом data-status: подпись читает человек, атрибут — машина. */}
            <Badge color="teal" data-testid="order-status" data-status={order.status}>
              {t(statusSelectors[order.status])}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            {formatDateTime(order.createdAt)}
          </Text>
        </Group>

        {/* В позициях — снимок на момент покупки: название и цена не меняются вслед за каталогом. */}
        <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing="xs" horizontalSpacing={0}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t(($) => $.account.table.product)}</Table.Th>
                <Table.Th ta="center" w={90}>
                  {t(($) => $.account.table.quantity)}
                </Table.Th>
                <Table.Th ta="right" w={140}>
                  {t(($) => $.account.table.priceAtPurchase)}
                </Table.Th>
                <Table.Th ta="right" w={140}>
                  {t(($) => $.account.table.sum)}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {order.items.map((item) => (
                <Table.Tr key={item.productId}>
                  <Table.Td>{item.productName}</Table.Td>
                  <Table.Td ta="center">{item.quantity}</Table.Td>
                  <Table.Td ta="right">{formatMoney(item.priceAtPurchase)}</Table.Td>
                  <Table.Td ta="right">
                    {formatMoney({
                      amount: item.priceAtPurchase.amount * item.quantity,
                      currency: item.priceAtPurchase.currency,
                    })}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Divider />

        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Text size="sm" c="dimmed">
            {order.shipping.method === "delivery"
              ? t(($) => $.account.delivery, { address: order.shipping.address ?? "" })
              : t(($) => $.account.pickup)}
            {" · "}
            {order.shipping.recipientName}, {order.shipping.phone}
          </Text>
          <Text fz="lg" fw={800} data-testid="order-total">
            {t(($) => $.account.total, { total: formatMoney(order.total) })}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
};

export const AccountPage = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((loaded) => {
        if (active) {
          setOrders(loaded);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <Alert color="red" data-testid="account-error">
        {t(($) => $.account.loadFailed)}
      </Alert>
    );
  }

  if (orders === null) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={1}>{t(($) => $.account.title)}</Title>
        <Text c="dimmed">{user?.email}</Text>
      </Stack>

      {/* Сервер отдаёт только заказы текущего пользователя — фильтрация на клиенте была бы
          способом однажды показать чужие покупки. */}
      <Stack gap="md" data-testid="account-orders">
        {orders.length === 0 ? (
          <Paper withBorder p="xl" data-testid="account-orders-empty">
            <Stack align="center" gap="xs">
              <Title order={3}>{t(($) => $.account.empty.title)}</Title>
              <Text c="dimmed" ta="center">
                {t(($) => $.account.empty.text)}
              </Text>
              <Button component={Link} to={catalogPath()} variant="light" mt="sm">
                {t(($) => $.account.empty.action)}
              </Button>
            </Stack>
          </Paper>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </Stack>

      {orders.length > 0 && (
        <Anchor component={Link} to={catalogPath()} size="sm" c="dimmed">
          {t(($) => $.account.continueShopping)}
        </Anchor>
      )}
    </Stack>
  );
};
