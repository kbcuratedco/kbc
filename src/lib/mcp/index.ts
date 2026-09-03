import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import getProduct from "./tools/get-product";
import shopInfo from "./tools/shop-info";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kb-curated-co-mcp",
  title: "KB Curated Co",
  version: "0.1.0",
  instructions:
    "MCP server for KB Curated Co, a hand-painted stationery, banner, and sports gift shop. Sign in with your KB Curated Co account to use these tools. Use `list_products` to browse the catalog (optionally filtered by category), `get_product` for details on a specific item, and `shop_info` for shipping rules and how ordering works.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, getProduct, shopInfo],
});
