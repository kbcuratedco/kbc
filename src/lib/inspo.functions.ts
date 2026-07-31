import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  base64: z.string().min(1).max(8_000_000),
  contentType: z.string().max(80).default("image/jpeg"),
});

export const uploadInspoImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    import { supabase } from "@/integrations/supabase/client";
    const bin = atob(data.base64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ext = data.contentType.split("/")[1]?.split("+")[0] ?? "jpg";
    const path = `pending/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
const up = await supabase.storage
  .from("order-inspo")
  .upload(path, buf, {
    contentType: data.contentType,
    upsert: false,
  });

console.log("UPLOAD RESULT:", JSON.stringify(up, null, 2));

if (up.error) {
  console.error("UPLOAD ERROR:", JSON.stringify(up.error, null, 2));
  throw up.error;
}
    // 90 days — customers usually submit the cart within minutes, but this
    // keeps the link alive if they close the tab and come back later.
    const signed = await supabase.storage
      .from("order-inspo")
      .createSignedUrl(path, 60 * 60 * 24 * 90);
    if (!signed.data?.signedUrl) throw new Error("Could not sign uploaded image");
    return { url: signed.data.signedUrl };
  });