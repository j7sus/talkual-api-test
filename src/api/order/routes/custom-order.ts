export default {
  routes: [
    {
      method: "POST",
      path: "/orders/:id/donate",
      handler: "order.donate",
      
    },
  ],
};
