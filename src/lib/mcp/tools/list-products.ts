import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PRODUCTS, CATEGORY_LABELS, type ProductCategory } from "@/lib/products";

export default defineTool({
  name: "list_products",
  title: "List products",
  description:
    "List KB Curated Co products. Optionally filter by category (stationery, banner, sports).",
  inputSchema: {
    category: z
      .enum(["stationery", "banner", "sports"])
      .optional()
      .describe("Filter by product category."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category }) => {
    const items = (category
      ? PRODUCTS.filter((p) => p.category === category)
      : PRODUCTS
    ).map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      categoryLabel: CATEGORY_LABELS[p.category as ProductCategory],
      price: p.price,
      description: p.description,
      image: p.image,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { count: items.length, items },
    };
  },
});