import { Schema } from "@strapi/strapi";

export interface Order {
  id: number;
  status: "processing" | "completed" | "cancelled";
  type: "string";
  delivery_date?: string;
  user?: { id: number };
  order_items?: OrderItem[];
  order_meta?: OrderMeta;
  createdAt: string;
  updatedAt: string;
}

export interface OrderMeta {
  id: number;
  shipping_postal_code: string;
  shipping_firstname: string;
  order?: { id: number };
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  quantity: number;
  sku: string;
  price: number;
  order?: { id: number };
  createdAt: string;
  updatedAt: string;
}

declare module "@strapi/types" {
  export module Shared {
    export interface ContentTypes {
      "api::order.order": Order;
      "api::order-meta.order-meta": OrderMeta;
      "api::order-item.order-item": OrderItem;
    }
  }
}
