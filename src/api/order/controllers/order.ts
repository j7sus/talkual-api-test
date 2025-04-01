/**
 * order controller
 */

import { factories } from "@strapi/strapi";
import { isValidPostalCode } from "../services/coverageService";
import { Order, OrderMeta } from "../../../../types/order";

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async donate(ctx): Promise<any> {
      try {
        const sanitizedQueryParams = await this.sanitizeQuery(ctx);
        const authenticatedUser = ctx.state.user;
        const { order_meta } = ctx.request.body;

        const order = await strapi
          .service("api::order.order")
          .findOne(sanitizedQueryParams, {
            populate: ["order_items", "order_meta"],
          });

        /***** Rest of the code here *****/
        //1 Validar que existe order_meta con los campos requeridos
        if (
          !order_meta ||
          !order_meta.shipping_postal_code ||
          !order_meta.shipping_firstname
        ) {
          return ctx.badRequest("Datos de envío son requeridos");
        }

        //2 Validar código postal
        if (!isValidPostalCode(order_meta.shipping_postal_code)) {
          return ctx.badRequest("Código postal inválido");
        }

        //3 Obtener ID del pedido desde los parametros de la URL
        const { id } = ctx.params;

        //4 Obtener pedido original by id
        const originalOrder = (await strapi.entityService.findOne(
          "api::order.order",
          id,
          {
            populate: ["order_items", "order_meta", "user"],
          }
        )) as Order;

        if (!originalOrder) {
          return ctx.NotFound("Pedido no encontrado");
        }

        //5 Validar el pedido si puede ser donado
        if (originalOrder.user?.id !== authenticatedUser?.id) {
          return ctx.forbidden("Sólo es posible donar pedidos propios");
        }

        //6 Actualizar el estado de pedido original a "cancelled"
        await strapi.entityService.update("api::order.order", id, {
          data: { status: "cancelled" } as Partial<Order>,
        });

        //7 Crear una donacion con los datos del pedido original
        const donation = (await strapi.entityService.create("api::order.order", {
          data: {
            status: "processing",
            type: "donation",
            user: originalOrder.user.id,
            delivery_date: originalOrder.delivery_date || null,
          },
        })) as Order;

        //8 Crear nuevo Order Meta
        const newOrderMeta = (await strapi.entityService.create(
          "api::order-meta.order-meta",
          {
            data: {
              shipping_postal_code: order_meta.shipping_postal_code,
              shipping_firstname: order_meta.shipping_firstname,
              order: donation.id,
            },
          }
        )) as unknown as { shipping_postal_code: string; shipping_firstname: string; order: number };

        //9 Copiar items del pedido original al nuevo pedido
        if (originalOrder.order_items && originalOrder.order_items.length > 0) {
          for (const item of originalOrder.order_items) {
            await strapi.entityService.create("api::order-item.order-item", {
              data: {
                quantity: item.quantity,
                sku: item.sku,
                price: item.price,
                order: donation.id,
              },
            });
          }
        }

        // Enviar notificación por email (simulado)
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
      } catch (error) {
        console.error("Error exportando ordenes", error);
        return ctx.internalServerError("Error al procesar la donación");
      }
    },
  })
);
