/**
 * order controller
 */

import { factories } from "@strapi/strapi";
import { isValidPostalCode } from "../services/coverageService";
import { Order } from "../../../../types/order";

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async donate(ctx): Promise<any> {
      try {
        const sanitizedQueryParams = await this.sanitizeQuery(ctx);
        const authenticatedUser = ctx.state.user;
        const { order_meta } = ctx.request.body;
        const { id } = ctx.params;

        // Verificacion de donacion existente
        const originalOrder = (await strapi.entityService.findOne(
          "api::order.order",
          id,
          {
            populate: ["order_items", "order_meta", "user"],
          }
        )) as Order;

        if (originalOrder.type === "donation" as Order["type"]) {
          return ctx.throw(400, "El pedido ya es una donación");
        }
        
        if (!originalOrder) {
          return ctx.NotFound("Pedido no encontrado");
        }


        // Validar que existe order_meta con los campos requeridos
        if (
          !order_meta ||
          !order_meta.shipping_postal_code ||
          !order_meta.shipping_firstname
        ) {
          return ctx.badRequest("Datos de envío son requeridos");
        }

        // Validar código postal
        if (!isValidPostalCode(order_meta.shipping_postal_code)) {
          return ctx.badRequest("Código postal inválido");
        }

        // Validar el pedido si puede ser donado
        if (originalOrder.user?.id !== authenticatedUser?.id) {
          return ctx.forbidden("Sólo es posible donar pedidos propios");
        }

        return await strapi.db.transaction(async (trx) => {
          const { order: donation, order_meta: newOrderMeta } = await strapi
            .service("api::order.donationService")
            .createDontationFromOrder(
              originalOrder,
              order_meta,
              authenticatedUser?.id,
              trx
            );

          await strapi.service("api::order.donation").cancelOrder(id, trx);

          console.log(
            `${order_meta.shipping_firstname} su pedido se enviará en breve.`
          );

          return {
            order: {
              id: donation.id,
              status: donation.status,
              type: donation.type,
              delivery_date: donation.delivery_date,
              createdAt: donation.createdAt,
              updatedAt: donation.updatedAt,
            },
            order_meta: {
              shipping_postal_code: newOrderMeta.shipping_postal_code,
              shipping_firstname: newOrderMeta.shipping_firstname,
            },
            authenticatedUser: {
              id: authenticatedUser?.id,
              email: authenticatedUser?.email,
            },
          };
        });
      } catch (error) {
        console.error("Error exportando ordenes", error);
        return ctx.internalServerError("Error al procesar la donación");
      }
    },
  })
);
