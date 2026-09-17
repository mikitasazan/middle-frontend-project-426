/* eslint eslint-comments/no-unlimited-disable: off */
/* eslint-disable */
// This document was generated automatically by openapi-box

/**
 * @typedef {import('@sinclair/typebox').TSchema} TSchema
 */

/**
 * @template {TSchema} T
 * @typedef {import('@sinclair/typebox').Static<T>} Static
 */

/**
 * @typedef {import('@sinclair/typebox').SchemaOptions} SchemaOptions
 */

/**
 * @typedef {{
 *  [Path in keyof typeof schema]: {
 *    [Method in keyof typeof schema[Path]]: {
 *      [Prop in keyof typeof schema[Path][Method]]: typeof schema[Path][Method][Prop] extends TSchema ?
 *        Static<typeof schema[Path][Method][Prop]> :
 *        undefined
 *    }
 *  }
 * }} SchemaType
 */

/**
 * @typedef {{
 *  [ComponentType in keyof typeof _components]: {
 *    [ComponentName in keyof typeof _components[ComponentType]]: typeof _components[ComponentType][ComponentName] extends TSchema ?
 *      Static<typeof _components[ComponentType][ComponentName]> :
 *      undefined
 *  }
 * }} ComponentType
 */

import { Type as T, TypeRegistry, Kind, CloneType } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/**
 * @typedef {{
 *  [Kind]: 'Binary'
 *  static: string | File | Blob | Uint8Array
 *  anyOf: [{
 *    type: 'object',
 *    additionalProperties: true
 *  }, {
 *    type: 'string',
 *    format: 'binary'
 *  }]
 * } & TSchema} TBinary
 */

/**
 * @returns {TBinary}
 */
const Binary = () => {
  /**
   * @param {TBinary} schema
   * @param {unknown} value
   * @returns {boolean}
   */
  function BinaryCheck(schema, value) {
    const type = Object.prototype.toString.call(value);
    return (
      type === "[object Blob]" ||
      type === "[object File]" ||
      type === "[object String]" ||
      type === "[object Uint8Array]"
    );
  }

  if (!TypeRegistry.Has("Binary")) TypeRegistry.Set("Binary", BinaryCheck);

  return /** @type {TBinary} */ ({
    anyOf: [
      {
        type: "object",
        additionalProperties: true,
      },
      {
        type: "string",
        format: "binary",
      },
    ],
    [Kind]: "Binary",
  });
};

const ComponentsSchemasCategory = T.Object({
  id: T.String(),
  slug: T.String(),
  name: T.String(),
});
const ComponentsSchemasHealth = T.Object({
  status: T.String(),
});
const ComponentsSchemasUser = T.Object({
  id: T.String(),
  email: T.String(),
});
const ComponentsSchemasProblemType = T.Union([
  T.Literal("https://hexlet.io/problems/invalid-credentials"),
  T.Literal("https://hexlet.io/problems/email-taken"),
  T.Literal("https://hexlet.io/problems/address-required"),
  T.Literal("https://hexlet.io/problems/unavailable-items"),
  T.Literal("https://hexlet.io/problems/validation-error"),
  T.Literal("https://hexlet.io/problems/unauthorized"),
  T.Literal("https://hexlet.io/problems/not-found"),
  T.Literal("https://hexlet.io/problems/internal-error"),
  T.Literal("about:blank"),
]);
const ComponentsSchemasProblemDetails = T.Object({
  type: T.Intersect([CloneType(ComponentsSchemasProblemType)]),
  title: T.String(),
  status: T.Integer({ format: "int32" }),
  detail: T.Optional(T.String()),
  unavailableProductIds: T.Optional(T.Array(T.String())),
});
const ComponentsSchemasOrderStatus = T.Literal("paid");
const ComponentsSchemasMoney = T.Object({
  amount: T.Integer({ format: "int32" }),
  currency: T.String({ default: "RUB" }),
});
const ComponentsSchemasOrderItem = T.Object({
  productId: T.String(),
  productName: T.String(),
  priceAtPurchase: CloneType(ComponentsSchemasMoney),
  quantity: T.Integer({ format: "int32" }),
});
const ComponentsSchemasShippingMethod = T.Union([T.Literal("delivery"), T.Literal("pickup")]);
const ComponentsSchemasShippingDetails = T.Object({
  method: CloneType(ComponentsSchemasShippingMethod),
  recipientName: T.String(),
  phone: T.String(),
  address: T.Optional(T.String()),
});
const ComponentsSchemasOrder = T.Object({
  id: T.String(),
  status: CloneType(ComponentsSchemasOrderStatus),
  items: T.Array(CloneType(ComponentsSchemasOrderItem)),
  shipping: CloneType(ComponentsSchemasShippingDetails),
  total: T.Intersect([CloneType(ComponentsSchemasMoney)]),
  createdAt: T.String({ format: "date-time" }),
});
const ComponentsSchemasCartItem = T.Object({
  productId: T.String(),
  quantity: T.Integer({ format: "int32", minimum: 1 }),
});
const ComponentsSchemasCreateOrderRequest = T.Object({
  items: T.Array(CloneType(ComponentsSchemasCartItem), { minItems: 1 }),
  shipping: CloneType(ComponentsSchemasShippingDetails),
});
const ComponentsSchemasProduct = T.Object({
  id: T.String(),
  slug: T.String(),
  name: T.String(),
  description: T.String(),
  price: CloneType(ComponentsSchemasMoney),
  categoryId: T.String(),
  imageUrl: T.Optional(T.String()),
  available: T.Boolean(),
});
const ComponentsSchemasPageMeta = T.Object({
  page: T.Integer({ format: "int32" }),
  perPage: T.Integer({ format: "int32" }),
  total: T.Integer({ format: "int32" }),
  totalPages: T.Integer({ format: "int32" }),
});
const ComponentsSchemasProductPage = T.Object({
  items: T.Array(CloneType(ComponentsSchemasProduct)),
  meta: CloneType(ComponentsSchemasPageMeta),
});
const ComponentsSchemasPromo = T.Object({
  id: T.String(),
  title: T.String(),
  text: T.String(),
  product: T.Intersect([CloneType(ComponentsSchemasProduct)]),
});
const ComponentsSchemasCredentials = T.Object({
  email: T.String({ format: "email" }),
  password: T.String({ minLength: 6 }),
});

const schema = {
  "/api/categories": {
    GET: {
      args: T.Void(),
      data: T.Array(CloneType(ComponentsSchemasCategory), {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([T.Any({ "x-status-code": "default" })]),
    },
  },
  "/api/health": {
    GET: {
      args: T.Void(),
      data: CloneType(ComponentsSchemasHealth, {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([T.Any({ "x-status-code": "default" })]),
    },
  },
  "/api/me": {
    GET: {
      args: T.Void(),
      data: CloneType(ComponentsSchemasUser, {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "401",
          "x-content-type": "application/json",
        }),
      ]),
    },
  },
  "/api/orders": {
    POST: {
      args: T.Object({
        body: CloneType(ComponentsSchemasCreateOrderRequest, {
          "x-content-type": "application/json",
        }),
      }),
      data: CloneType(ComponentsSchemasOrder, {
        "x-status-code": "201",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "400",
          "x-content-type": "application/json",
        }),
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "401",
          "x-content-type": "application/json",
        }),
      ]),
    },
    GET: {
      args: T.Void(),
      data: T.Array(CloneType(ComponentsSchemasOrder), {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "401",
          "x-content-type": "application/json",
        }),
      ]),
    },
  },
  "/api/orders/{id}": {
    GET: {
      args: T.Object({
        params: T.Object({
          id: T.String({ "x-in": "path" }),
        }),
      }),
      data: CloneType(ComponentsSchemasOrder, {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "401",
          "x-content-type": "application/json",
        }),
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "404",
          "x-content-type": "application/json",
        }),
      ]),
    },
  },
  "/api/products": {
    GET: {
      args: T.Optional(
        T.Object({
          query: T.Optional(
            T.Object({
              category: T.Optional(T.String({ "x-in": "query" })),
              q: T.Optional(T.String({ "x-in": "query" })),
              priceMin: T.Optional(T.Integer({ format: "int32", "x-in": "query" })),
              priceMax: T.Optional(T.Integer({ format: "int32", "x-in": "query" })),
              available: T.Optional(T.Boolean({ "x-in": "query" })),
              page: T.Optional(
                T.Integer({
                  format: "int32",
                  minimum: 1,
                  default: 1,
                  "x-in": "query",
                }),
              ),
              perPage: T.Optional(
                T.Integer({
                  format: "int32",
                  minimum: 1,
                  maximum: 48,
                  default: 6,
                  "x-in": "query",
                }),
              ),
            }),
          ),
        }),
      ),
      data: CloneType(ComponentsSchemasProductPage, {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "400",
          "x-content-type": "application/json",
        }),
      ]),
    },
  },
  "/api/products/{id}": {
    GET: {
      args: T.Object({
        params: T.Object({
          id: T.String({ "x-in": "path" }),
        }),
      }),
      data: CloneType(ComponentsSchemasProduct, {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "404",
          "x-content-type": "application/json",
        }),
      ]),
    },
  },
  "/api/promos": {
    GET: {
      args: T.Void(),
      data: T.Array(CloneType(ComponentsSchemasPromo), {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([T.Any({ "x-status-code": "default" })]),
    },
  },
  "/api/session": {
    POST: {
      args: T.Object({
        body: CloneType(ComponentsSchemasCredentials, {
          "x-content-type": "application/json",
        }),
      }),
      data: CloneType(ComponentsSchemasUser, {
        "x-status-code": "200",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "400",
          "x-content-type": "application/json",
        }),
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "401",
          "x-content-type": "application/json",
        }),
      ]),
    },
    DELETE: {
      args: T.Void(),
      data: T.Any({ "x-status-code": "204" }),
      error: T.Union([T.Any({ "x-status-code": "default" })]),
    },
  },
  "/api/users": {
    POST: {
      args: T.Object({
        body: CloneType(ComponentsSchemasCredentials, {
          "x-content-type": "application/json",
        }),
      }),
      data: CloneType(ComponentsSchemasUser, {
        "x-status-code": "201",
        "x-content-type": "application/json",
      }),
      error: T.Union([
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "400",
          "x-content-type": "application/json",
        }),
        CloneType(ComponentsSchemasProblemDetails, {
          "x-status-code": "409",
          "x-content-type": "application/json",
        }),
      ]),
    },
  },
};

const _components = {
  schemas: {
    CartItem: CloneType(ComponentsSchemasCartItem),
    Category: CloneType(ComponentsSchemasCategory),
    CreateOrderRequest: CloneType(ComponentsSchemasCreateOrderRequest),
    Credentials: CloneType(ComponentsSchemasCredentials),
    Health: CloneType(ComponentsSchemasHealth),
    Money: CloneType(ComponentsSchemasMoney),
    Order: CloneType(ComponentsSchemasOrder),
    OrderItem: CloneType(ComponentsSchemasOrderItem),
    OrderStatus: CloneType(ComponentsSchemasOrderStatus),
    PageMeta: CloneType(ComponentsSchemasPageMeta),
    ProblemDetails: CloneType(ComponentsSchemasProblemDetails),
    ProblemType: CloneType(ComponentsSchemasProblemType),
    Product: CloneType(ComponentsSchemasProduct),
    ProductPage: CloneType(ComponentsSchemasProductPage),
    Promo: CloneType(ComponentsSchemasPromo),
    ShippingDetails: CloneType(ComponentsSchemasShippingDetails),
    ShippingMethod: CloneType(ComponentsSchemasShippingMethod),
    User: CloneType(ComponentsSchemasUser),
  },
};

export { schema, _components as components };
