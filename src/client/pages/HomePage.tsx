import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { fetchPromos, type Promo } from "../api";
import { ProductImage } from "../components/ProductImage";
import { formatMoney } from "../lib/format";
import { catalogPath, productPath } from "../lib/routes";

// Промо-блок ведёт на страницу своего товара: клик по нему — это тот же переход, что клик по
// названию товара в каталоге. Отдельной страницы промо в проекте нет.
const PromoCard = ({ promo }: { promo: Promo }) => {
  return (
    <Card
      component={Link}
      to={productPath(promo.product.id)}
      padding="md"
      h="100%"
      style={{ display: "flex" }}
      data-testid="home-promo-item"
    >
      <Card.Section>
        <ProductImage product={promo.product} />
      </Card.Section>
      <Stack gap="xs" mt="md" style={{ flex: 1 }}>
        <Title order={3} fz="h4" lineClamp={2}>
          {promo.title}
        </Title>
        {/* Текст промо приходит из базы: правка формулировки не требует пересборки. */}
        <Text size="sm" c="dimmed" lineClamp={3}>
          {promo.text}
        </Text>
        <Group justify="space-between" align="center" mt="auto" pt="xs">
          <Text fz="lg" fw={700}>
            {formatMoney(promo.product.price)}
          </Text>
          <Badge variant="light">{promo.product.name}</Badge>
        </Group>
      </Stack>
    </Card>
  );
};

export const HomePage = () => {
  const { t } = useTranslation();
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPromos()
      .then((loaded) => {
        if (active) {
          setPromos(loaded);
          setFailed(false);
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

  const items = promos ?? [];

  return (
    <Stack gap="xl">
      <Stack gap="sm" align="start">
        <Title order={1}>{t(($) => $.home.title)}</Title>
        <Text c="dimmed" maw={640}>
          {t(($) => $.home.subtitle)}
        </Text>
        <Button component={Link} to={catalogPath()} size="md" mt="xs">
          {t(($) => $.home.toCatalog)}
        </Button>
      </Stack>

      {failed && (
        <Alert color="red" data-testid="home-error">
          {t(($) => $.home.loadFailed)}
        </Alert>
      )}

      {promos === null && !failed && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {[0, 1, 2].map((placeholder) => (
            <Skeleton key={placeholder} height={320} radius="lg" />
          ))}
        </SimpleGrid>
      )}

      {items.length > 0 && (
        <Stack gap="md">
          <Title order={2} fz="h3">
            {t(($) => $.home.promoTitle)}
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" data-testid="home-promo">
            {items.map((promo) => (
              <PromoCard key={promo.id} promo={promo} />
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {/* Пустой список промо — не ошибка: магазин может ничего не рекламировать, и главная
          остаётся рабочей — с неё всё равно виден вход в каталог. */}
      {promos !== null && items.length === 0 && (
        <Text c="dimmed" data-testid="home-promo-empty">
          {t(($) => $.home.promoEmpty)}
        </Text>
      )}
    </Stack>
  );
};
