import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PRODUCTS, BANNER_SIZES } from "@/lib/products";

export default defineTool({
  name: "get_product",
  title: "Get product details",
  description:
    "Get full details for a single product by id, including banner size pricing when applicable.",
  inputSchema: {
    id: z.string().describe("Product id, e.g. 'ban-birthday' or 'stat-boys'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) {
      return {
        content: [{ type: "text", text: `No product found with id "${id}".` }],
        isError: true,
      };
    }
    const details = {
      ...product,
      ...(product.category === "banner" ? { bannerSizes: BANNER_SIZES } : {}),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
      structuredContent: details,
    };
  },
});
