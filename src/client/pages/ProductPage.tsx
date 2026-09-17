import {
  Alert,
  Anchor,
  Breadcrumbs,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  List,
  Loader,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { fetchProduct, type Product } from "../api";
import { AvailabilityBadge } from "../components/AvailabilityBadge";
import { ProductImage } from "../components/ProductImage";
import { addToCart } from "../lib/cart";
import { formatMoney } from "../lib/format";
import { cartPath, catalogPath } from "../lib/routes";

export const ProductPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [missing, setMissing] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;
    setAdded(false);
    fetchProduct(id)
      .then((loaded) => {
        if (active) {
          setProduct(loaded);
          setMissing(false);
        }
      })
      .catch(() => {
        if (active) {
          setMissing(true);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (missing) {
    return (
      <Stack>
        <Alert color="red" data-testid="product-error">
          {t(($) => $.product.notFound)}
        </Alert>
        <Anchor component={Link} to={catalogPath()}>
          {t(($) => $.product.backToCatalog)}
        </Anchor>
      </Stack>
    );
  }

  if (!product) {
    return (
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Skeleton height={360} radius="lg" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Stack>
            <Skeleton height={36} radius="sm" />
            <Skeleton height={24} width="40%" radius="sm" />
            <Skeleton height={80} radius="sm" />
            <Center py="md">
              <Loader size="sm" />
            </Center>
          </Stack>
        </Grid.Col>
      </Grid>
    );
  }

  return (
    <Stack gap="lg">
      <Breadcrumbs separator="→">
        <Anchor component={Link} to={catalogPath()} c="dimmed" size="sm">
          {t(($) => $.nav.catalog)}
        </Anchor>
        <Text size="sm" c="dimmed" lineClamp={1}>
          {product.name}
        </Text>
      </Breadcrumbs>

      <Grid gap="xl" align="start">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card padding={0} style={{ overflow: "hidden" }}>
            <ProductImage product={product} ratio={1} />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Stack gap="md">
            <Stack gap="xs">
              <Title order={1} data-testid="product-name">
                {product.name}
              </Title>
              <AvailabilityBadge available={product.available} />
            </Stack>

            <Text data-testid="product-description">{product.description}</Text>

            <Paper withBorder p="lg" bg="gray.0">
              <Stack gap="md">
                <Text fz={32} fw={800} lh={1} data-testid="product-price">
                  {formatMoney(product.price)}
                </Text>
                {/* Недоступный товар остаётся в каталоге, но положить его в корзину нельзя. */}
                <Button
                  size="md"
                  fullWidth
                  disabled={!product.available}
                  onClick={() => {
                    addToCart(product.id);
                    setAdded(true);
                  }}
                  data-testid="product-add-to-cart"
                >
                  {product.available
                    ? t(($) => $.product.addToCart)
                    : t(($) => $.product.unavailable)}
                </Button>
                {added && (
                  <Alert color="teal" py="xs">
                    {t(($) => $.product.added)}{" "}
                    <Anchor component={Link} to={cartPath()} fw={600}>
                      {t(($) => $.product.goToCheckout)}
                    </Anchor>
                  </Alert>
                )}
              </Stack>
            </Paper>

            <Divider />

            <List size="sm" spacing={4} c="dimmed">
              <List.Item>{t(($) => $.product.facts.price)}</List.Item>
              <List.Item>{t(($) => $.product.facts.shipping)}</List.Item>
              <List.Item>{t(($) => $.product.facts.payment)}</List.Item>
            </List>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
