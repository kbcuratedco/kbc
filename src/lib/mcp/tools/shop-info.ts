import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "shop_info",
  title: "Shop info",
  description:
    "Return KB Curated Co shop info: about the maker, shipping rules, and ordering flow.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const info = {
      name: "KB Curated Co",
      maker: "Karen B",
      tagline: "Hand-painted details for life's best moments.",
      about:
        "Personalized paper goods, custom party décor, and one-of-a-kind gifts — painted by hand, one order at a time.",
      shipping: {
        stationery: 6.95,
        sports: 10,
        banners: 15,
        freeShippingThreshold: 75,
        houstonLocalPickup: "free",
      },
      ordering:
        "Customers submit a request through the site; I review the order and email an invoice for payment.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      structuredContent: info,
    };
  },
});
