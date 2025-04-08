import { Order, OrderMeta } from "../../../../types/order";

export default ({ strapi }) => ({
  async createDontationFromOrder(
    originalOrder: Order,
    donationMeta: { shipping_postal_code: string; shipping_firstname: string },
    userId: number,
    trx?: any
  ): Promise<{ order: Order; order_meta: OrderMeta }> {
    // Crear donación
    const donation = (await strapi.entityService.create(
      "api::order.order",
      {
        data: {
          status: "pending",
          type: "donation",
          delivery_date: originalOrder.delivery_date || null,
          user: userId,
        },
      },
      { trasaction: trx }
    )) as Order;

    // Crear nuevo Order Meta
    const newOrderMeta = (await strapi.entityService.create(
      "api::order-meta.order-meta",
      {
        data: {
          shipping_postal_code: donationMeta.shipping_postal_code,
          shipping_firstname: donationMeta.shipping_firstname,
          order: donation.id,
        },
      },
      { trasaction: trx }
    )) as OrderMeta;

    // Copiar ítems del pedido original al nuevo pedido
    if (originalOrder.order_items && originalOrder.order_items.length > 0) {
      for (const item of originalOrder.order_items) {
        await strapi.entityService.create(
          "api::order-item.order-item",
          {
            data: {
              quatify: item.quantity,
              sku: item.sku,
              price: item.price,
              order: donation.id,
            },
          },
          { trasaction: trx }
        );
      }
    }
    return { order: donation, order_meta: newOrderMeta };
  },

  async cancelOrder(orderId: number, trx?: any): Promise<Order> {
    return (await strapi.entityService.update(
      "api::order.order",
      orderId,
      {
        data: { status: "cancelled" } as Partial<Order>,
      },
      { trasaction: trx }
    )) as Order;
  },
});
