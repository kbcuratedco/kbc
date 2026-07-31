import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  base64: z.string().min(1).max(8_000_000),
  contentType: z.string().max(80).default("image/jpeg"),
});

export const uploadInspoImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { getInspoStorageClient, buildUploadPath, uploadAndSign, base64ToBytes } = await import(
      "@/lib/inspo-storage.server"
    );
    // userId comes from the verified bearer token, never from the request body.
    const { client, userId } = await getInspoStorageClient();
    const path = buildUploadPath(userId, data.contentType);
    const url = await uploadAndSign(path, base64ToBytes(data.base64), data.contentType, client);
    return { url };
  });
