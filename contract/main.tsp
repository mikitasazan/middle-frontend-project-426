import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Online Store API" })
@info(#{ version: "1.0.0" })
@server("http://localhost:8080", "Local development / Prism mock")
namespace OnlineStoreApi;

// ---------- Общие модели ----------

@doc("Денежная сумма. amount — целые рубли без копеек: дробные цены дают ошибки округления в итоге заказа.")
@example(#{ amount: 32990, currency: "RUB" })
model Money {
  amount: int32;
  currency: string = "RUB";
}

@doc("""
  Словарь типов проблем. Закрытый: клиент выбирает текст ошибки по type, поэтому новый
  случай начинается с правки этого союза, а не с новой строки в интерфейсе.
  internal-error может прийти от любой операции и в их ответах отдельно не описан.
  """)
union ProblemType {
  @doc("Вход с несуществующим email или неверным паролем (401).")
  invalidCredentials: "https://hexlet.io/problems/invalid-credentials",

  @doc("Регистрация на уже занятый email (409).")
  emailTaken: "https://hexlet.io/problems/email-taken",

  @doc("Оформление доставки без адреса (400).")
  addressRequired: "https://hexlet.io/problems/address-required",

  @doc("Отказ оформления: часть товаров не найдена или недоступна (400). Перечень — в unavailableProductIds.")
  unavailableItems: "https://hexlet.io/problems/unavailable-items",

  @doc("Тело или параметры запроса не прошли валидацию схемы (400).")
  validationError: "https://hexlet.io/problems/validation-error",

  @doc("Операция требует активной сессии (401).")
  unauthorized: "https://hexlet.io/problems/unauthorized",

  @doc("Ресурс не найден (404).")
  notFound: "https://hexlet.io/problems/not-found",

  @doc("Непредвиденная ошибка на сервере (500).")
  internalError: "https://hexlet.io/problems/internal-error",

  @doc("Значение по умолчанию из RFC 9457. Клиент подставляет его сам, когда ответ не является Problem Details, — например пришёл от прокси.")
  blank: "about:blank",
}

@doc("""
  Ошибка API в формате Problem Details (RFC 9457). Пользовательский текст по этому телу
  собирает клиент — по полю type. Поля title и detail предназначены разработчику и логам,
  поэтому в интерфейс не попадают и не переводятся.
  """)
@example(#{
  type: ProblemType.validationError,
  title: "Invalid request data",
  status: 400,
  detail: "/body/password: must NOT have fewer than 6 characters",
})
model ProblemDetails {
  @doc("Стабильный URI типа проблемы. Клиент ветвится по нему, а не по тексту.")
  type: ProblemType;

  @doc("Короткое техническое название типа проблемы, на английском. Для разработчика, не для пользователя.")
  title: string;

  status: int32;

  @doc("Техническое пояснение конкретного случая: идентификаторы, путь поля. Заполняется только когда несёт данные, которых нет в type.")
  detail?: string;

  @doc("Идентификаторы товаров, из-за которых заказ отклонён. Заполняется только при отказе оформления.")
  unavailableProductIds?: string[];
}

@error
@doc("Некорректные данные запроса или нарушенное бизнес-правило (400).")
model BadRequestError {
  @statusCode statusCode: 400;
  @body body: ProblemDetails;
}

@error
@doc("Требуется авторизация (401).")
model UnauthorizedError {
  @statusCode statusCode: 401;
  @body body: ProblemDetails;
}

@error
@doc("Ресурс не найден (404).")
model NotFoundError {
  @statusCode statusCode: 404;
  @body body: ProblemDetails;
}

@error
@doc("Конфликт с текущим состоянием: например, email уже занят (409).")
model ConflictError {
  @statusCode statusCode: 409;
  @body body: ProblemDetails;
}

// ---------- Каталог ----------

@doc("Плоская товарная группа комплектующих. Вложенности нет.")
@example(#{ id: "cat_gpu", slug: "videokarty", name: "Видеокарты" })
model Category {
  id: string;
  slug: string;
  name: string;
}

@doc("Единица каталога — комплектующее для ПК. available — булев признак: числовых остатков и резервирования в проекте нет.")
@example(#{
  id: "prd_rtx4070",
  slug: "nvidia-geforce-rtx-4070",
  name: "NVIDIA GeForce RTX 4070",
  description: "Видеокарта 12 ГБ GDDR6X, 2560 CUDA-ядер.",
  price: #{ amount: 62990, currency: "RUB" },
  categoryId: "cat_gpu",
  imageUrl: "https://example.com/rtx4070.jpg",
  available: true,
})
model Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: Money;
  categoryId: string;

  @doc("URL изображения. Если не задан, интерфейс показывает заглушку.")
  imageUrl?: string;

  available: boolean;
}

@doc("Метаданные постраничной выдачи.")
@example(#{ page: 1, perPage: 6, total: 50, totalPages: 9 })
model PageMeta {
  page: int32;
  perPage: int32;
  total: int32;
  totalPages: int32;
}

@doc("Страница каталога: товары плюс метаданные пагинации.")
model ProductPage {
  items: Product[];
  meta: PageMeta;
}

// ---------- Главная ----------

@doc("""
  Промо-блок главной страницы: текст магазина и товар, к которому этот текст ведёт.
  Живёт в базе, а не в вёрстке, — правка формулировки не требует пересборки фронтенда.
  Товар приходит вложенным: главной нужны его название и цена, и второй запрос за ними
  был бы лишним.
  """)
model Promo {
  id: string;
  title: string;
  text: string;

  @doc("Товар, на страницу которого ведёт промо-блок.")
  product: Product;
}

// ---------- Пользователь и сессия ----------

@doc("Покупатель. Учётная запись и покупатель совпадают — отдельной сущности «клиент» нет.")
@example(#{ id: "usr_1", email: "ivan@example.com" })
model User {
  id: string;
  email: string;
}

@doc("Данные для регистрации и входа.")
@example(#{ email: "ivan@example.com", password: "secret123" })
model Credentials {
  @format("email")
  email: string;

  @minLength(6)
  password: string;
}

// ---------- Заказ ----------

@doc("Способ получения заказа. Магазин работает в одном городе: пункт самовывоза один, доставка только по этому городу.")
enum ShippingMethod {
  delivery,
  pickup,
}

@doc("Данные получения заказа. Город не спрашивается и не хранится — он подразумевается. Email не дублируется, он есть у пользователя.")
@example(#{
  method: ShippingMethod.delivery,
  recipientName: "Иван Петров",
  phone: "+79991234567",
  address: "ул. Ленина, 15, кв. 42",
})
model ShippingDetails {
  method: ShippingMethod;
  recipientName: string;
  phone: string;

  @doc("Улица и дом свободной строкой. Обязателен при delivery, при pickup не заполняется.")
  address?: string;
}

@doc("Позиция корзины в запросе на оформление: только товар и количество. Цен клиент не присылает.")
@example(#{ productId: "prd_rtx4070", quantity: 1 })
model CartItem {
  productId: string;

  @minValue(1)
  quantity: int32;
}

@doc("Позиция заказа со снимком товара на момент покупки. С актуальным товаром не джойнится: переименование или смена цены не меняют старый заказ.")
@example(#{
  productId: "prd_rtx4070",
  productName: "NVIDIA GeForce RTX 4070",
  priceAtPurchase: #{ amount: 62990, currency: "RUB" },
  quantity: 1,
})
model OrderItem {
  productId: string;
  productName: string;
  priceAtPurchase: Money;
  quantity: int32;
}

@doc("Статус заказа. В проекте единственное значение: оформление считается совершённой оплатой, отдельного шага оплаты и отмены заказа нет.")
enum OrderStatus {
  paid,
}

@doc("Исторический документ покупки. Самодостаточен: после создания не зависит от изменений каталога.")
@example(#{
  id: "ord_1",
  status: OrderStatus.paid,
  items: #[
    #{
      productId: "prd_rtx4070",
      productName: "NVIDIA GeForce RTX 4070",
      priceAtPurchase: #{ amount: 62990, currency: "RUB" },
      quantity: 1,
    }
  ],
  shipping: #{
    method: ShippingMethod.delivery,
    recipientName: "Иван Петров",
    phone: "+79991234567",
    address: "ул. Ленина, 15, кв. 42",
  },
  total: #{ amount: 62990, currency: "RUB" },
  createdAt: utcDateTime.fromISO("2026-07-27T12:00:00Z"),
})
model Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  shipping: ShippingDetails;

  @doc("Итог, посчитанный бэкендом по priceAtPurchase. Клиентскому расчёту сервер не доверяет.")
  total: Money;

  createdAt: utcDateTime;
}

@doc("Тело запроса на оформление. Содержит состав корзины и данные получения — и не содержит цен.")
model CreateOrderRequest {
  @minItems(1)
  @doc("Состав корзины. Пустую корзину оформить нельзя.")
  items: CartItem[];

  shipping: ShippingDetails;
}

// ---------- Служебное ----------

@doc("Проверка живости приложения. Используется healthcheck'ом контейнера и CI.")
@example(#{ status: "ok" })
model Health {
  status: string;
}

@route("/api/health")
@tag("Service")
interface HealthCheck {
  @opExample(#{ returnType: #{ status: "ok" } })
  @get
  get(): Health;
}

// ---------- Операции: пользователи и сессия ----------

@route("/api/users")
@tag("Auth")
interface Users {
  @doc("Регистрация. Занятый email — 409 с типом email-taken, некорректные данные — 400.")
  @opExample(
    #{
      parameters: #{ body: #{ email: "ivan@example.com", password: "secret123" } },
      returnType: #{ statusCode: 201, user: #{ id: "usr_1", email: "ivan@example.com" } },
    },
    #{ title: "Регистрация нового покупателя" }
  )
  @post
  register(@body body: Credentials): {
    @statusCode statusCode: 201;
    @body user: User;
  } | BadRequestError | ConflictError;
}

@route("/api/session")
@tag("Auth")
interface Session {
  @doc("Вход. Создаёт серверную сессию. Неверная пара email и пароль — 401 с типом invalid-credentials.")
  @opExample(
    #{
      parameters: #{ body: #{ email: "ivan@example.com", password: "secret123" } },
      returnType: #{ id: "usr_1", email: "ivan@example.com" },
    },
    #{ title: "Успешный вход" }
  )
  @post
  create(@body body: Credentials): User | BadRequestError | UnauthorizedError;

  @doc("Выход. Уничтожает сессию на сервере.")
  @delete
  destroy(): {
    @statusCode statusCode: 204;
  };
}

@route("/api/me")
@tag("Auth")
interface Me {
  @doc("Текущий пользователь. Без активной сессии — 401.")
  @opExample(#{ returnType: #{ id: "usr_1", email: "ivan@example.com" } })
  @get
  get(): User | UnauthorizedError;
}

// ---------- Операции: каталог ----------

@route("/api/categories")
@tag("Catalog")
interface Categories {
  @doc("Список категорий для фильтра каталога.")
  @opExample(
    #{
      returnType: #[
        #{ id: "cat_gpu", slug: "videokarty", name: "Видеокарты" },
        #{ id: "cat_cpu", slug: "processory", name: "Процессоры" },
        #{ id: "cat_mb", slug: "materinskie-platy", name: "Материнские платы" }
      ],
    },
    #{ title: "Категории каталога" }
  )
  @get
  list(): Category[];
}

@route("/api/promos")
@tag("Home")
interface Promos {
  @doc("Промо-блоки главной страницы, в порядке добавления. Пустой список — главная без промо, это не ошибка.")
  @get
  list(): Promo[];
}

@route("/api/products")
@tag("Catalog")
interface Products {
  @doc("Каталог с фильтрацией и пагинацией. Фильтры комбинируются, пустая выдача — 200 с пустым items.")
  @opExample(
    #{
      parameters: #{ category: "videokarty", page: 1, perPage: 6 },
      returnType: #{
        items: #[
          #{
            id: "prd_rtx4070",
            slug: "nvidia-geforce-rtx-4070",
            name: "NVIDIA GeForce RTX 4070",
            description: "Видеокарта 12 ГБ GDDR6X, 2560 CUDA-ядер.",
            price: #{ amount: 62990, currency: "RUB" },
            categoryId: "cat_gpu",
            available: true,
          }
        ],
        meta: #{ page: 1, perPage: 6, total: 10, totalPages: 2 },
      },
    },
    #{ title: "Каталог, отфильтрованный по категории" }
  )
  @get
  list(
    @doc("Слаг категории.")
    @query
    category?: string,

    @doc("Поиск по совпадению в названии товара.")
    @query
    q?: string,

    @query priceMin?: int32,
    @query priceMax?: int32,

    @doc("true — только доступные товары, false — только недоступные, не задан — все.")
    @query
    available?: boolean,

    @query @minValue(1) page?: int32 = 1,

    @doc("Размер страницы. Небольшой по умолчанию, расширяется параметром.")
    @query
    @minValue(1)
    @maxValue(48)
    perPage?: int32 = 6,
  ): ProductPage | BadRequestError;

  @doc("Товар по идентификатору — для карточки товара и прямого захода по ссылке.")
  @get
  @route("/{id}")
  getById(@path id: string): Product | NotFoundError;
}

// ---------- Операции: заказы ----------

@route("/api/orders")
@tag("Orders")
interface Orders {
  @doc("""
    Оформление заказа. Только для авторизованного пользователя (иначе 401).
    Бэкенд сам резолвит товары, берёт priceAtPurchase из текущей цены и считает total.
    Отказ атомарный: если хотя бы один товар не найден или недоступен — 400 с перечнем
    проблемных товаров в unavailableProductIds, заказ не создаётся целиком.
    """)
  @opExample(
    #{
      parameters: #{
        body: #{
          items: #[#{ productId: "prd_rtx4070", quantity: 1 }],
          shipping: #{
            method: ShippingMethod.delivery,
            recipientName: "Иван Петров",
            phone: "+79991234567",
            address: "ул. Ленина, 15, кв. 42",
          },
        },
      },
    },
    #{ title: "Оформление заказа с доставкой" }
  )
  @post
  create(@body body: CreateOrderRequest): {
    @statusCode statusCode: 201;
    @body order: Order;
  } | BadRequestError | UnauthorizedError;

  @doc("Заказы текущего пользователя, новые сверху. Чужие заказы недоступны.")
  @get
  list(): Order[] | UnauthorizedError;

  @doc("Один заказ текущего пользователя. Чужой заказ — 404, а не 403: существование чужих заказов не раскрывается.")
  @get
  @route("/{id}")
  getById(@path id: string): Order | UnauthorizedError | NotFoundError;
}
