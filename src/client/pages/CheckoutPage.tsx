import {
  Alert,
  Button,
  Center,
  Divider,
  Grid,
  Group,
  List,
  Loader,
  NativeSelect,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { ApiError, createOrder, type Problem, type ShippingMethod } from "../api";
import { cartTotal, clearCart, useCart, useCartProducts } from "../lib/cart";
import { formatMoney } from "../lib/format";
import { problemMessage } from "../lib/problems";
import { cartPath, orderSuccessPath } from "../lib/routes";

export const CheckoutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lines = useCart();
  const { byId, loading } = useCartProducts(lines);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sending, setSending] = useState(false);
  // Успешное оформление очищает корзину — и делает её пустой. Без этого признака страница
  // тут же решила бы, что оформлять нечего, и увела бы пользователя обратно в корзину.
  const submitted = useRef(false);

  const form = useForm({
    initialValues: {
      method: "delivery" as ShippingMethod,
      recipientName: "",
      phone: "",
      address: "",
    },
    validate: {
      recipientName: (value) => (value.trim() ? null : t(($) => $.checkout.nameRequired)),
      phone: (value) => (value.trim() ? null : t(($) => $.checkout.phoneRequired)),
      // При самовывозе адрес не нужен: пункт выдачи один, город не спрашивается.
      address: (value, values) =>
        values.method === "delivery" && !value.trim() ? t(($) => $.checkout.addressRequired) : null,
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setProblem(null);
    setSending(true);
    try {
      // Клиент отправляет только состав корзины и данные получения. Ни цен, ни итоговой
      // суммы в запросе нет: итог считает бэкенд по текущим ценам товаров.
      const order = await createOrder({
        items: lines,
        shipping: {
          method: values.method,
          recipientName: values.recipientName.trim(),
          phone: values.phone.trim(),
          ...(values.method === "delivery" ? { address: values.address.trim() } : {}),
        },
      });
      submitted.current = true;
      clearCart();
      navigate(orderSuccessPath(), { state: { order } });
    } catch (cause) {
      // Сеть или не-JSON от прокси: подставляем тип about:blank из RFC 9457, дальше
      // сообщение выбирается тем же путём, что и для ответов сервера.
      setProblem(
        cause instanceof ApiError
          ? cause.problem
          : { type: "about:blank", title: "Request failed", status: 0 },
      );
    } finally {
      setSending(false);
    }
  });

  if (lines.length === 0 && !submitted.current) {
    return <Navigate to={cartPath()} replace />;
  }

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  const isDelivery = form.values.method === "delivery";
  const unavailableNames = (problem?.unavailableProductIds ?? []).map(
    (id) => byId.get(id)?.name ?? t(($) => $.checkout.itemFallback, { id }),
  );

  return (
    <Stack gap="lg">
      <Title order={1}>{t(($) => $.checkout.title)}</Title>

      {problem && (
        <Alert color="red" title={t(($) => $.checkout.errorTitle)} data-testid="order-error">
          <Text size="sm">{t(problemMessage(problem))}</Text>
          {unavailableNames.length > 0 && (
            <List size="sm" mt="xs">
              {unavailableNames.map((name) => (
                <List.Item key={name}>{name}</List.Item>
              ))}
            </List>
          )}
        </Alert>
      )}

      <Grid gap="lg" align="start">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder p="lg">
            <form onSubmit={handleSubmit} data-testid="checkout-form">
              <Stack gap="md">
                <Text fw={600}>{t(($) => $.checkout.section)}</Text>
                <NativeSelect
                  label={t(($) => $.checkout.method)}
                  data-testid="checkout-method"
                  data={[
                    { value: "delivery", label: t(($) => $.checkout.delivery) },
                    { value: "pickup", label: t(($) => $.checkout.pickup) },
                  ]}
                  {...form.getInputProps("method")}
                />
                <TextInput
                  label={t(($) => $.checkout.nameLabel)}
                  placeholder={t(($) => $.checkout.namePlaceholder)}
                  data-testid="checkout-name"
                  {...form.getInputProps("recipientName")}
                />
                <TextInput
                  label={t(($) => $.checkout.phoneLabel)}
                  placeholder={t(($) => $.checkout.phonePlaceholder)}
                  data-testid="checkout-phone"
                  {...form.getInputProps("phone")}
                />
                {isDelivery ? (
                  <TextInput
                    label={t(($) => $.checkout.addressLabel)}
                    placeholder={t(($) => $.checkout.addressPlaceholder)}
                    data-testid="checkout-address"
                    {...form.getInputProps("address")}
                  />
                ) : (
                  <Text size="sm" c="dimmed">
                    {t(($) => $.checkout.pickupNote)}
                  </Text>
                )}
                <Button type="submit" size="md" loading={sending} data-testid="checkout-submit">
                  {t(($) => $.checkout.submit)}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder p="lg">
            <Stack gap="sm">
              <Text fw={600}>{t(($) => $.checkout.items)}</Text>
              <Divider />
              {lines.map((line) => {
                const product = byId.get(line.productId);
                return (
                  <Group
                    key={line.productId}
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                    gap="md"
                  >
                    <Text size="sm" style={{ minWidth: 0 }}>
                      {product
                        ? product.name
                        : t(($) => $.checkout.itemFallback, {
                            id: line.productId,
                          })}{" "}
                      × {line.quantity}
                    </Text>
                    <Text size="sm" fw={600} style={{ whiteSpace: "nowrap" }}>
                      {product
                        ? formatMoney({
                            amount: product.price.amount * line.quantity,
                            currency: product.price.currency,
                          })
                        : "—"}
                    </Text>
                  </Group>
                );
              })}
              <Divider />
              <Group justify="space-between" align="baseline">
                <Text c="dimmed">{t(($) => $.checkout.previewTotal)}</Text>
                <Text fz="xl" fw={800}>
                  {formatMoney(cartTotal(lines, byId))}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {t(($) => $.checkout.previewNote)}
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
