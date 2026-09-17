import {
  Alert,
  Anchor,
  Button,
  Card,
  Checkbox,
  Grid,
  Group,
  NativeSelect,
  Pagination,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import {
  type Category,
  fetchCategories,
  fetchProducts,
  isAborted,
  type Product,
  type ProductPage,
} from "../api";
import { AvailabilityBadge } from "../components/AvailabilityBadge";
import { ProductImage } from "../components/ProductImage";
import { addToCart } from "../lib/cart";
import { formatMoney } from "../lib/format";
import { productPath } from "../lib/routes";

// Состояние каталога живёт в адресной строке: фильтры и номер страницы восстанавливаются при
// перезагрузке, «назад» и «вперёд» работают, ссылкой на выдачу можно поделиться. Локального
// состояния фильтров нет вовсе — иначе появилось бы два источника правды, которые расходятся.
const AVAILABLE_ON = "1";

// Пауза перед запросом при вводе в поиск. Достаточно, чтобы не отправлять запрос на каждую
// букву, и незаметна на глаз.
const SEARCH_DEBOUNCE_MS = 300;

// Пустые параметры в адрес не пишем: он остаётся читаемым, и `priceMin=` пустой строкой не
// уезжает в запрос, где схема ждёт целое число. Правка фильтра возвращает на первую страницу —
// иначе выдача из трёх товаров на третьей странице выглядит как пустой каталог.
const withParams = (
  current: URLSearchParams,
  patch: Record<string, string>,
  keepPage = false,
): URLSearchParams => {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  if (!keepPage) {
    next.delete("page");
  }
  return next;
};

const CatalogItem = ({ product }: { product: Product }) => {
  const { t } = useTranslation();

  return (
    // h="100%" плюс прижатый к низу футер: описание в одну или две строки больше не сдвигает
    // цену, и сетка карточек стоит ровно.
    <Card padding="md" h="100%" style={{ display: "flex" }} data-testid="catalog-item">
      <Card.Section>
        <ProductImage product={product} />
      </Card.Section>
      <Stack gap="xs" mt="md" style={{ flex: 1 }}>
        {/* Название — ссылка на страницу товара: именно по нему открывают карточку. */}
        <Anchor
          component={Link}
          to={productPath(product.id)}
          fw={600}
          c="dark.7"
          lineClamp={2}
          data-testid="catalog-item-name"
        >
          {product.name}
        </Anchor>
        <Text size="sm" c="dimmed" lineClamp={2}>
          {product.description}
        </Text>

        <Group justify="space-between" align="center" mt="auto" pt="xs">
          <Text fz="xl" fw={700} data-testid="catalog-item-price">
            {formatMoney(product.price)}
          </Text>
          <AvailabilityBadge available={product.available} testId="catalog-item-availability" />
        </Group>
        <Button
          variant={product.available ? "light" : "default"}
          disabled={!product.available}
          onClick={() => addToCart(product.id)}
          fullWidth
        >
          {t(($) => $.catalog.addToCart)}
        </Button>
      </Stack>
    </Card>
  );
};

export const CatalogPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productPage, setProductPage] = useState<ProductPage | null>(null);
  const [failed, setFailed] = useState(false);

  const category = searchParams.get("category") ?? "";
  const q = searchParams.get("q") ?? "";
  const priceMin = searchParams.get("priceMin") ?? "";
  const priceMax = searchParams.get("priceMax") ?? "";
  const available = searchParams.get("available") === AVAILABLE_ON;
  const page = Number(searchParams.get("page") ?? "1") || 1;

  // Два контрола держат своё состояние, потому что обязаны отзываться мгновенно, а обновление
  // адреса роутером доезжает до компонента лишь на следующем кадре: в поле поиска буквы должны
  // появляться сразу, а галочка — переключаться в тот же клик (иначе браузер вернёт её в прежнее
  // положение, и тест увидит, что клик ничего не изменил). Источник правды остаётся адресом:
  // запрос собирается из него, а черновики подтягиваются обратно, когда адрес меняется не
  // пользовательским вводом — переходом по ссылке или кнопкой «назад».
  const [searchDraft, setSearchDraft] = useState(q);
  const [availableDraft, setAvailableDraft] = useState(available);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    setAvailableDraft(available);
  }, [available]);

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((loaded) => {
        if (active) {
          setCategories(loaded);
        }
      })
      .catch(() => {
        // Без списка категорий фильтр по категории просто останется пустым.
      });
    return () => {
      active = false;
    };
  }, []);

  const updateParams = (patch: Record<string, string>, keepPage = false): void => {
    setSearchParams(withParams(searchParams, patch, keepPage));
  };

  useEffect(() => {
    if (searchDraft === q) {
      return;
    }
    const timer = setTimeout(() => {
      // Ввод в поиск не плодит историю: иначе одна фраза из десяти букв потребовала бы
      // десять нажатий «назад», чтобы вернуться к выдаче до неё.
      setSearchParams((previous) => withParams(previous, { q: searchDraft }), {
        replace: true,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [searchDraft, q, setSearchParams]);

  useEffect(() => {
    // Фильтрация и пагинация — на сервере, поэтому каждое изменение адреса это новый запрос.
    // Предыдущий отменяем: ответы приходят не в том порядке, в котором ушли запросы, и
    // устаревший ответ иначе перезаписал бы актуальную выдачу.
    const controller = new AbortController();
    fetchProducts({ category, q, priceMin, priceMax, available, page }, controller.signal)
      .then((loaded) => {
        setProductPage(loaded);
        setFailed(false);
      })
      .catch((error: unknown) => {
        if (isAborted(error)) {
          return;
        }
        setFailed(true);
      });
    return () => {
      controller.abort();
    };
  }, [category, q, priceMin, priceMax, available, page]);

  const resetFilters = (): void => {
    setSearchDraft("");
    setSearchParams(new URLSearchParams());
  };

  const items = productPage?.items ?? [];
  const meta = productPage?.meta;

  return (
    <Grid gap="lg" align="start">
      {/* Фильтры — первая колонка и в разметке, и на экране, поэтому порядок
          табуляции совпадает с визуальным на любой ширине. */}
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Paper withBorder p="lg" data-testid="catalog-filters">
          <Stack gap="md">
            {/* В колонке поля идут в столбик, а когда панель разворачивается во
                всю ширину — по два в ряд: иначе она отжимает товары вниз. */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 1 }} spacing="md">
              <NativeSelect
                label={t(($) => $.catalog.filters.category)}
                data-testid="filter-category"
                // Пустое значение — «все категории», значения остальных опций — слаги категорий.
                data={[
                  { value: "", label: t(($) => $.catalog.filters.allCategories) },
                  ...categories.map((category) => ({
                    value: category.slug,
                    label: category.name,
                  })),
                ]}
                value={category}
                onChange={(event) => updateParams({ category: event.currentTarget.value })}
              />
              <TextInput
                label={t(($) => $.catalog.filters.name)}
                placeholder={t(($) => $.catalog.filters.namePlaceholder)}
                data-testid="filter-search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.currentTarget.value)}
              />
              <TextInput
                type="number"
                min={0}
                label={t(($) => $.catalog.filters.priceMin)}
                placeholder={t(($) => $.catalog.filters.priceMinPlaceholder)}
                data-testid="filter-price-min"
                value={priceMin}
                onChange={(event) => updateParams({ priceMin: event.currentTarget.value })}
              />
              <TextInput
                type="number"
                min={0}
                label={t(($) => $.catalog.filters.priceMax)}
                placeholder={t(($) => $.catalog.filters.priceMaxPlaceholder)}
                data-testid="filter-price-max"
                value={priceMax}
                onChange={(event) => updateParams({ priceMax: event.currentTarget.value })}
              />
            </SimpleGrid>

            <Checkbox
              label={t(($) => $.catalog.filters.availableOnly)}
              data-testid="filter-available"
              checked={availableDraft}
              onChange={(event) => {
                const { checked } = event.currentTarget;
                setAvailableDraft(checked);
                updateParams({ available: checked ? AVAILABLE_ON : "" });
              }}
            />

            <Button variant="default" fullWidth onClick={resetFilters} data-testid="filter-reset">
              {t(($) => $.catalog.filters.reset)}
            </Button>
          </Stack>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 9 }}>
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>{t(($) => $.catalog.title)}</Title>
            <Text c="dimmed">{t(($) => $.catalog.subtitle)}</Text>
          </Stack>

          {/* Счётчик описывает выдачу, а не фильтры, поэтому стоит над сеткой,
              а не в панели. */}
          {meta !== undefined && (
            <Text size="sm" c="dimmed">
              {t(($) => $.catalog.found, { total: meta.total })}
            </Text>
          )}

          {failed && (
            <Alert color="red" data-testid="catalog-error">
              {t(($) => $.catalog.loadFailed)}
            </Alert>
          )}

          {productPage === null && !failed && (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {[0, 1, 2, 3, 4, 5].map((placeholder) => (
                <Skeleton key={placeholder} height={360} radius="lg" />
              ))}
            </SimpleGrid>
          )}

          {/* Три карточки в ряд — только от lg: в колонке шириной 9/12 на
              средних экранах третья карточка становится слишком узкой. */}
          {items.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" data-testid="catalog-list">
              {items.map((product) => (
                <CatalogItem key={product.id} product={product} />
              ))}
            </SimpleGrid>
          )}

          {productPage !== null && items.length === 0 && (
            <Paper withBorder p="xl" data-testid="catalog-empty">
              <Stack align="center" gap="xs">
                <Title order={3}>{t(($) => $.catalog.empty.title)}</Title>
                <Text c="dimmed" ta="center">
                  {t(($) => $.catalog.empty.text)}
                </Text>
                <Button variant="light" mt="sm" onClick={resetFilters}>
                  {t(($) => $.catalog.empty.action)}
                </Button>
              </Stack>
            </Paper>
          )}

          {meta !== undefined && meta.totalPages > 0 && (
            <Group justify="center" data-testid="catalog-pagination">
              {/* Кнопки «назад» и «вперёд» — обычные button с disabled на границах:
                  состояние пагинации должно читаться и человеком, и машиной. */}
              <Pagination.Root
                total={meta.totalPages}
                value={meta.page}
                onChange={(next) => updateParams({ page: String(next) }, true)}
              >
                <Group gap="xs" justify="center">
                  <Pagination.Previous data-testid="catalog-page-prev" />
                  <Pagination.Items />
                  <Pagination.Next data-testid="catalog-page-next" />
                </Group>
              </Pagination.Root>
            </Group>
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  );
};
