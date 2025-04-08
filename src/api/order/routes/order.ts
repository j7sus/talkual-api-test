/**
 * order router
 */

import { factories } from "@strapi/strapi";
import middlewares from "../../../../config/middlewares";

// export default factories.createCoreRouter('api::order.order');

export default {
  routes: [
    {
      method: "POST",
      path: "/orders/:id/donate",
      handler: "order.donate",
      config: {
        au: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
