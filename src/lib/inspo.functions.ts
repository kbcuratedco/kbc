import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const uploadInspoImage = createServerFn({ method: "POST" })
  .validator(
    (data: {
      contentType: string;
      base64: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const bytes = Buffer.from(data.base64, "base64");

    const filename = `${crypto.randomUUID()}.${data.contentType.split("/")[1]}`;

    const up = await supabase.storage
      .from("order-inspo")
      .upload(filename, bytes, {
        contentType: data.contentType,
        upsert: false,
      });

    if (up.error) {
      console.error("Upload error:", up.error);
      throw up.error;
    }

    console.log("Upload succeeded:", up.data);

    const signed = await supabase.storage
      .from("order-inspo")
      .createSignedUrl(up.data.path, 60 * 60);

    if (signed.error) {
      console.error("Signed URL error:", signed.error);
      console.error("Uploaded path:", up.data.path);
      throw signed.error;
    }

    console.log("Signed URL created:", signed.data);

    return {
      url: signed.data.signedUrl,
    };
  });