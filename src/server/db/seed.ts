import { createDb, createPool, waitForDb } from "./client.js";
import { categories, products, promos } from "./schema.js";

// Сид выполняется в составе make build, то есть при каждом деплое. Отсюда требование
// идемпотентности: вставка идёт с onConflictDoNothing по естественному ключу slug.
//
// Состав подобран так, чтобы фильтры и пагинация были проверяемы (см. __data__/checklist.md):
// шесть категорий, 50 товаров, минимум по два в категории, четыре недоступны, цены разного
// порядка (2 490 … 199 990 ₽), восемь товаров без изображения — под заглушку в интерфейсе.
//
// Картинки лежат в public/images и отдаются тем же приложением: внешний хостинг заглушек
// зависел бы от сети, а single-origin (ADR 0005) не требует ни CORS, ни настроек.
// При размере страницы 6 получается девять страниц — этого хватает, чтобы проверить и переход
// на следующую страницу, и возврат фильтром на первую, и неполную последнюю.

const CATEGORY_SEED = [
  { slug: "videokarty", name: "Видеокарты" },
  { slug: "processory", name: "Процессоры" },
  { slug: "materinskie-platy", name: "Материнские платы" },
  { slug: "operativnaya-pamyat", name: "Оперативная память" },
  { slug: "nakopiteli", name: "Накопители" },
  { slug: "bloki-pitaniya", name: "Блоки питания" },
];

type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  price: number;
  categorySlug: string;
  imageUrl?: string;
  available?: boolean;
};

const PRODUCT_SEED: ProductSeed[] = [
  {
    slug: "nvidia-geforce-rtx-4070",
    name: "NVIDIA GeForce RTX 4070",
    description: "Видеокарта 12 ГБ GDDR6X, 5888 CUDA-ядер, разъём PCIe 4.0.",
    price: 62990,
    categorySlug: "videokarty",
    imageUrl: "/images/nvidia-geforce-rtx-4070.svg",
  },
  {
    slug: "nvidia-geforce-rtx-4060-ti",
    name: "NVIDIA GeForce RTX 4060 Ti",
    description: "Видеокарта 8 ГБ GDDR6, компактная, для сборок среднего уровня.",
    price: 44990,
    categorySlug: "videokarty",
    imageUrl: "/images/nvidia-geforce-rtx-4060-ti.svg",
  },
  {
    slug: "amd-radeon-rx-7800-xt",
    name: "AMD Radeon RX 7800 XT",
    description: "Видеокарта 16 ГБ GDDR6, архитектура RDNA 3.",
    price: 54990,
    categorySlug: "videokarty",
    imageUrl: "/images/amd-radeon-rx-7800-xt.svg",
  },
  {
    slug: "nvidia-geforce-rtx-4090",
    name: "NVIDIA GeForce RTX 4090",
    description: "Флагманская видеокарта 24 ГБ GDDR6X. Временно нет в наличии.",
    price: 199990,
    categorySlug: "videokarty",
    imageUrl: "/images/nvidia-geforce-rtx-4090.svg",
    // Недоступный товар остаётся в каталоге, помечен, и его нельзя добавить в корзину.
    // Стоит в начале списка сознательно: при размере страницы 6 он попадает на первую
    // страницу, и эталон не зависит от того, как далеко тест дойдёт по пагинации.
    available: false,
  },
  {
    slug: "intel-arc-a770",
    name: "Intel Arc A770",
    description: "Видеокарта 16 ГБ GDDR6, аппаратное кодирование AV1.",
    price: 28990,
    categorySlug: "videokarty",
    // Без изображения — интерфейс показывает заглушку.
  },
  {
    slug: "nvidia-geforce-rtx-4080-super",
    name: "NVIDIA GeForce RTX 4080 SUPER",
    description: "Видеокарта 16 ГБ GDDR6X, 10240 CUDA-ядер, для 4K.",
    price: 109990,
    categorySlug: "videokarty",
    imageUrl: "/images/nvidia-geforce-rtx-4080-super.svg",
  },
  {
    slug: "amd-radeon-rx-7600",
    name: "AMD Radeon RX 7600",
    description: "Видеокарта 8 ГБ GDDR6, для игр в 1080p.",
    price: 24990,
    categorySlug: "videokarty",
    imageUrl: "/images/amd-radeon-rx-7600.svg",
  },
  {
    slug: "nvidia-geforce-rtx-4060",
    name: "NVIDIA GeForce RTX 4060",
    description: "Видеокарта 8 ГБ GDDR6, низкое энергопотребление.",
    price: 32990,
    categorySlug: "videokarty",
    imageUrl: "/images/nvidia-geforce-rtx-4060.svg",
  },
  {
    slug: "amd-radeon-rx-7900-xtx",
    name: "AMD Radeon RX 7900 XTX",
    description: "Видеокарта 24 ГБ GDDR6, флагман RDNA 3. Ожидается поставка.",
    price: 129990,
    categorySlug: "videokarty",
    imageUrl: "/images/amd-radeon-rx-7900-xtx.svg",
    available: false,
  },
  {
    slug: "intel-arc-a750",
    name: "Intel Arc A750",
    description: "Видеокарта 8 ГБ GDDR6, бюджетный вариант с трассировкой лучей.",
    price: 19990,
    categorySlug: "videokarty",
  },
  {
    slug: "amd-ryzen-5-7600x",
    name: "AMD Ryzen 5 7600X",
    description: "Процессор 6 ядер, 12 потоков, сокет AM5.",
    price: 21990,
    categorySlug: "processory",
    imageUrl: "/images/amd-ryzen-5-7600x.svg",
  },
  {
    slug: "amd-ryzen-7-7800x3d",
    name: "AMD Ryzen 7 7800X3D",
    description: "Процессор 8 ядер с 3D V-Cache, выбор для игровых сборок.",
    price: 38990,
    categorySlug: "processory",
    imageUrl: "/images/amd-ryzen-7-7800x3d.svg",
  },
  {
    slug: "intel-core-i5-13400f",
    name: "Intel Core i5-13400F",
    description: "Процессор 10 ядер, 16 потоков, без встроенной графики.",
    price: 17990,
    categorySlug: "processory",
  },
  {
    slug: "intel-core-i7-14700k",
    name: "Intel Core i7-14700K",
    description: "Процессор 20 ядер, 28 потоков, разблокированный множитель.",
    price: 42990,
    categorySlug: "processory",
    imageUrl: "/images/intel-core-i7-14700k.svg",
  },
  {
    slug: "amd-ryzen-9-7950x",
    name: "AMD Ryzen 9 7950X",
    description: "Процессор 16 ядер, 32 потока, для рабочих станций.",
    price: 59990,
    categorySlug: "processory",
    imageUrl: "/images/amd-ryzen-9-7950x.svg",
  },
  {
    slug: "intel-core-i9-14900k",
    name: "Intel Core i9-14900K",
    description: "Процессор 24 ядра, 32 потока, максимальная частота 6,0 ГГц.",
    price: 74990,
    categorySlug: "processory",
    imageUrl: "/images/intel-core-i9-14900k.svg",
  },
  {
    slug: "amd-ryzen-5-5600",
    name: "AMD Ryzen 5 5600",
    description: "Процессор 6 ядер, 12 потоков, сокет AM4.",
    price: 9990,
    categorySlug: "processory",
    imageUrl: "/images/amd-ryzen-5-5600.svg",
  },
  {
    slug: "intel-core-i3-13100f",
    name: "Intel Core i3-13100F",
    description: "Процессор 4 ядра, 8 потоков, для офисных сборок.",
    price: 8490,
    categorySlug: "processory",
    imageUrl: "/images/intel-core-i3-13100f.svg",
  },
  {
    slug: "amd-ryzen-7-5800x3d",
    name: "AMD Ryzen 7 5800X3D",
    description: "Процессор 8 ядер с 3D V-Cache на сокете AM4.",
    price: 27990,
    categorySlug: "processory",
    imageUrl: "/images/amd-ryzen-7-5800x3d.svg",
  },
  {
    slug: "intel-core-i5-14600k",
    name: "Intel Core i5-14600K",
    description: "Процессор 14 ядер, 20 потоков, разблокированный множитель.",
    price: 31990,
    categorySlug: "processory",
  },
  {
    slug: "asus-prime-b650m-a",
    name: "ASUS PRIME B650M-A",
    description: "Материнская плата mATX, сокет AM5, два слота M.2.",
    price: 12990,
    categorySlug: "materinskie-platy",
    imageUrl: "/images/asus-prime-b650m-a.svg",
  },
  {
    slug: "msi-mag-b760-tomahawk",
    name: "MSI MAG B760 TOMAHAWK",
    description: "Материнская плата ATX, сокет LGA1700, поддержка DDR5.",
    price: 18990,
    categorySlug: "materinskie-platy",
    imageUrl: "/images/msi-mag-b760-tomahawk.svg",
  },
  {
    slug: "gigabyte-x670-aorus-elite",
    name: "Gigabyte X670 AORUS Elite",
    description: "Материнская плата ATX, сокет AM5, четыре слота M.2.",
    price: 27990,
    categorySlug: "materinskie-platy",
    imageUrl: "/images/gigabyte-x670-aorus-elite.svg",
  },
  {
    slug: "asrock-a620m-hdv",
    name: "ASRock A620M-HDV",
    description: "Материнская плата mATX, сокет AM5, бюджетное решение.",
    price: 7490,
    categorySlug: "materinskie-platy",
  },
  {
    slug: "asus-rog-strix-z790-e",
    name: "ASUS ROG STRIX Z790-E",
    description: "Материнская плата ATX, сокет LGA1700, Wi-Fi 6E.",
    price: 46990,
    categorySlug: "materinskie-platy",
    imageUrl: "/images/asus-rog-strix-z790-e.svg",
  },
  {
    slug: "msi-pro-b650m-p",
    name: "MSI PRO B650M-P",
    description: "Материнская плата mATX, сокет AM5, четыре слота DDR5.",
    price: 10990,
    categorySlug: "materinskie-platy",
    imageUrl: "/images/msi-pro-b650m-p.svg",
  },
  {
    slug: "gigabyte-b760m-ds3h",
    name: "Gigabyte B760M DS3H",
    description: "Материнская плата mATX, сокет LGA1700, два слота M.2.",
    price: 11490,
    categorySlug: "materinskie-platy",
    imageUrl: "/images/gigabyte-b760m-ds3h.svg",
  },
  {
    slug: "asrock-b650-pg-lightning",
    name: "ASRock B650 PG Lightning",
    description: "Материнская плата ATX, сокет AM5. Ожидается поставка.",
    price: 14990,
    categorySlug: "materinskie-platy",
    imageUrl: "/images/asrock-b650-pg-lightning.svg",
    available: false,
  },
  {
    slug: "kingston-fury-beast-32gb-ddr5",
    name: "Kingston FURY Beast 32 ГБ DDR5",
    description: "Комплект 2×16 ГБ, 5600 МТ/с, радиаторы.",
    price: 13990,
    categorySlug: "operativnaya-pamyat",
    imageUrl: "/images/kingston-fury-beast-32gb-ddr5.svg",
  },
  {
    slug: "corsair-vengeance-32gb-ddr5",
    name: "Corsair VENGEANCE 32 ГБ DDR5",
    description: "Комплект 2×16 ГБ, 6000 МТ/с, профиль EXPO.",
    price: 15490,
    categorySlug: "operativnaya-pamyat",
    imageUrl: "/images/corsair-vengeance-32gb-ddr5.svg",
  },
  {
    slug: "crucial-pro-16gb-ddr5",
    name: "Crucial Pro 16 ГБ DDR5",
    description: "Комплект 2×8 ГБ, 5600 МТ/с, без радиаторов.",
    price: 6490,
    categorySlug: "operativnaya-pamyat",
    imageUrl: "/images/crucial-pro-16gb-ddr5.svg",
  },
  {
    slug: "gskill-trident-z5-32gb-ddr5",
    name: "G.Skill Trident Z5 32 ГБ DDR5",
    description: "Комплект 2×16 ГБ, 6400 МТ/с, подсветка RGB.",
    price: 18990,
    categorySlug: "operativnaya-pamyat",
    imageUrl: "/images/gskill-trident-z5-32gb-ddr5.svg",
  },
  {
    slug: "kingston-fury-beast-16gb-ddr4",
    name: "Kingston FURY Beast 16 ГБ DDR4",
    description: "Комплект 2×8 ГБ, 3200 МТ/с, сокет AM4 и LGA1200.",
    price: 4290,
    categorySlug: "operativnaya-pamyat",
    imageUrl: "/images/kingston-fury-beast-16gb-ddr4.svg",
  },
  {
    slug: "corsair-vengeance-lpx-32gb-ddr4",
    name: "Corsair VENGEANCE LPX 32 ГБ DDR4",
    description: "Комплект 2×16 ГБ, 3600 МТ/с, низкий профиль.",
    price: 7990,
    categorySlug: "operativnaya-pamyat",
  },
  {
    slug: "patriot-viper-steel-16gb-ddr4",
    name: "Patriot Viper Steel 16 ГБ DDR4",
    description: "Комплект 2×8 ГБ, 3600 МТ/с, стальные радиаторы.",
    price: 3990,
    categorySlug: "operativnaya-pamyat",
    imageUrl: "/images/patriot-viper-steel-16gb-ddr4.svg",
  },
  {
    slug: "crucial-ballistix-8gb-ddr4",
    name: "Crucial Ballistix 8 ГБ DDR4",
    description: "Один модуль 8 ГБ, 3200 МТ/с, для апгрейда старой сборки.",
    price: 2490,
    categorySlug: "operativnaya-pamyat",
    imageUrl: "/images/crucial-ballistix-8gb-ddr4.svg",
  },
  {
    slug: "samsung-990-pro-2tb",
    name: "Samsung 990 PRO 2 ТБ",
    description: "NVMe M.2, PCIe 4.0, чтение до 7450 МБ/с.",
    price: 21990,
    categorySlug: "nakopiteli",
    imageUrl: "/images/samsung-990-pro-2tb.svg",
  },
  {
    slug: "samsung-980-1tb",
    name: "Samsung 980 1 ТБ",
    description: "NVMe M.2, PCIe 3.0, без DRAM-буфера.",
    price: 9990,
    categorySlug: "nakopiteli",
    imageUrl: "/images/samsung-980-1tb.svg",
  },
  {
    slug: "wd-black-sn850x-1tb",
    name: "WD Black SN850X 1 ТБ",
    description: "NVMe M.2, PCIe 4.0, игровой накопитель.",
    price: 12990,
    categorySlug: "nakopiteli",
    imageUrl: "/images/wd-black-sn850x-1tb.svg",
  },
  {
    slug: "crucial-p3-plus-1tb",
    name: "Crucial P3 Plus 1 ТБ",
    description: "NVMe M.2, PCIe 4.0, бюджетный вариант.",
    price: 7490,
    categorySlug: "nakopiteli",
    imageUrl: "/images/crucial-p3-plus-1tb.svg",
  },
  {
    slug: "kingston-nv2-500gb",
    name: "Kingston NV2 500 ГБ",
    description: "NVMe M.2, PCIe 4.0, под систему и несколько игр.",
    price: 3990,
    categorySlug: "nakopiteli",
    imageUrl: "/images/kingston-nv2-500gb.svg",
  },
  {
    slug: "seagate-barracuda-2tb-hdd",
    name: "Seagate BarraCuda 2 ТБ",
    description: 'Жёсткий диск 3,5", 7200 об/мин, под архив.',
    price: 5990,
    categorySlug: "nakopiteli",
  },
  {
    slug: "wd-blue-4tb-hdd",
    name: "WD Blue 4 ТБ",
    description: 'Жёсткий диск 3,5", 5400 об/мин, тихий.',
    price: 9490,
    categorySlug: "nakopiteli",
    imageUrl: "/images/wd-blue-4tb-hdd.svg",
  },
  {
    slug: "samsung-870-evo-1tb-sata",
    name: "Samsung 870 EVO 1 ТБ",
    description: 'SATA SSD 2,5", для апгрейда старых сборок. Ожидается поставка.',
    price: 8990,
    categorySlug: "nakopiteli",
    imageUrl: "/images/samsung-870-evo-1tb-sata.svg",
    available: false,
  },
  {
    slug: "corsair-rm850x",
    name: "Corsair RM850x",
    description: "Блок питания 850 Вт, 80 PLUS Gold, полностью модульный.",
    price: 16990,
    categorySlug: "bloki-pitaniya",
    imageUrl: "/images/corsair-rm850x.svg",
  },
  {
    slug: "seasonic-focus-gx-750",
    name: "Seasonic FOCUS GX-750",
    description: "Блок питания 750 Вт, 80 PLUS Gold, тихий вентилятор.",
    price: 13990,
    categorySlug: "bloki-pitaniya",
    imageUrl: "/images/seasonic-focus-gx-750.svg",
  },
  {
    slug: "be-quiet-pure-power-12-m-650",
    name: "be quiet! Pure Power 12 M 650W",
    description: "Блок питания 650 Вт, 80 PLUS Gold, модульный.",
    price: 10990,
    categorySlug: "bloki-pitaniya",
    imageUrl: "/images/be-quiet-pure-power-12-m-650.svg",
  },
  {
    slug: "deepcool-pk650d",
    name: "Deepcool PK650D",
    description: "Блок питания 650 Вт, 80 PLUS Bronze.",
    price: 5990,
    categorySlug: "bloki-pitaniya",
    imageUrl: "/images/deepcool-pk650d.svg",
  },
  {
    slug: "cooler-master-mwe-550",
    name: "Cooler Master MWE 550 Bronze",
    description: "Блок питания 550 Вт, 80 PLUS Bronze, для офисных сборок.",
    price: 4490,
    categorySlug: "bloki-pitaniya",
  },
  {
    slug: "corsair-hx1200i",
    name: "Corsair HX1200i",
    description: "Блок питания 1200 Вт, 80 PLUS Platinum, с телеметрией.",
    price: 34990,
    categorySlug: "bloki-pitaniya",
    imageUrl: "/images/corsair-hx1200i.svg",
  },
];

// Промо-блоки главной. Товар выбирается по слагу — тому же естественному ключу, по которому
// идемпотентен сид товаров. Все три товара доступны: реклама того, что нельзя купить, вводит
// покупателя в заблуждение (__data__/checklist.md, требования к сиду).
const PROMO_SEED = [
  {
    title: "Игровая сборка на RTX 4070",
    text: "12 ГБ GDDR6X и DLSS 3 — комфортный 1440p без переплаты за флагман.",
    productSlug: "nvidia-geforce-rtx-4070",
  },
  {
    title: "Процессор для игр",
    text: "3D V-Cache даёт прирост в играх там, где частота уже не помогает.",
    productSlug: "amd-ryzen-7-7800x3d",
  },
  {
    title: "Плата с запасом на будущее",
    text: "DDR5, два слота M.2 и питание с запасом под разгон процессора.",
    productSlug: "msi-mag-b760-tomahawk",
  },
];

const run = async (): Promise<void> => {
  const pool = createPool();
  try {
    await waitForDb(pool);
    const db = createDb(pool);

    await db.insert(categories).values(CATEGORY_SEED).onConflictDoNothing();

    const savedCategories = await db.select().from(categories);
    const categoryIdBySlug = new Map(savedCategories.map((row) => [row.slug, row.id]));

    const rows = PRODUCT_SEED.map((item) => {
      const categoryId = categoryIdBySlug.get(item.categorySlug);
      if (categoryId === undefined) {
        throw new Error(`Категория ${item.categorySlug} не найдена — сид категорий не выполнился`);
      }
      return {
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId,
        imageUrl: item.imageUrl ?? null,
        available: item.available ?? true,
      };
    });

    await db.insert(products).values(rows).onConflictDoNothing();

    const savedProducts = await db.select().from(products);
    const productIdBySlug = new Map(savedProducts.map((row) => [row.slug, row.id]));

    const promoRows = PROMO_SEED.map((item) => {
      const productId = productIdBySlug.get(item.productSlug);
      if (productId === undefined) {
        throw new Error(`Товар ${item.productSlug} не найден — сид товаров не выполнился`);
      }
      return { title: item.title, text: item.text, productId };
    });

    // Конфликт по product_id: повторный запуск не плодит промо-блоки на один и тот же товар.
    await db.insert(promos).values(promoRows).onConflictDoNothing();

    console.log(
      `Каталог наполнен: категорий ${savedCategories.length}, товаров ${PRODUCT_SEED.length}, промо-блоков ${PROMO_SEED.length}.`,
    );
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Не удалось наполнить каталог:", error);
  process.exit(1);
});
