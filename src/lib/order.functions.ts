import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";

const personalizationSchema = z
  .object({
    name: z.string().min(1).max(100),
    colorNotes: z.string().max(1000).optional(),
    inspoImage: z.string().max(8_000_000).optional(), // data URL
    sportsDetails: z
      .object({
        notes: z.string().max(2000).optional(),
      })
      .optional(),
  })
  .optional();

const bannerDetailsSchema = z
  .object({
    dateNeeded: z.string().max(40),
    name: z.string().max(100),
    theme: z.string().max(2000),
    inspoImages: z.array(z.string().max(8_000_000)).max(4),
  })
  .optional();

const itemSchema = z.object({
  productId: z.string().max(100),
  title: z.string().max(300),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99),
  category: z.string().max(50).optional(),
  personalization: personalizationSchema,
  bannerSize: z.string().max(20).optional(),
  bannerDetails: bannerDetailsSchema,
});

const payloadSchema = z
  .object({
    customerName: z.string().trim().min(1).max(120),
    customerEmail: z.string().trim().email().max(200),
    notes: z.string().max(2000).optional(),
    pickup: z.boolean(),
    zipCode: z.string().trim().max(20).optional(),
    subtotal: z.number().nonnegative(),
    shipping: z.number().nonnegative(),
    total: z.number().nonnegative(),
    items: z.array(itemSchema).min(1).max(50),
  })
  .refine((data) => data.pickup || Boolean(data.zipCode?.trim()), {
    message: "Zip code is required for shipping.",
    path: ["zipCode"],
  });

export type OrderRequestPayload = z.infer<typeof payloadSchema>;

const RECIPIENT = "orders@kbcuratedco.com";

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function addBusinessDays(startDate: Date, businessDays: number) {
  const date = new Date(startDate);
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) {
      added += 1;
    }
  }
  return date;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEarliestDeliveryDate(): string {
  const now = new Date();
  const businessDays = now.getHours() >= 15 ? 4 : 3;
  return formatLocalDate(addBusinessDays(now, businessDays));
}

function dataUrlToBuffer(dataUrl: string): { buffer: Uint8Array; contentType: string; ext: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1];
  const b64 = m[2];
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  return { buffer: buf, contentType, ext };
}

export const submitOrderRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => payloadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orderId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Upload inspo images -> signed URLs (7 days)
    async function uploadDataUrl(dataUrl: string, label: string, idx: number): Promise<string | null> {
      // Already a URL (uploaded at add-to-cart time) — pass straight through.
      if (/^https?:\/\//i.test(dataUrl)) return dataUrl;
      const parsed = dataUrlToBuffer(dataUrl);
      if (!parsed) return null;
      const path = `${orderId}/${label}-${idx}.${parsed.ext}`;
      const up = await supabaseAdmin.storage
        .from("order-inspo")
        .upload(path, parsed.buffer, { contentType: parsed.contentType, upsert: true });
      if (up.error) {
        console.error("inspo upload failed", up.error);
        return null;
      }
      const signed = await supabaseAdmin.storage
        .from("order-inspo")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      return signed.data?.signedUrl ?? null;
    }

    const processedItems = await Promise.all(
      data.items.map(async (item, i) => {
        let personalizationInspoUrl: string | null = null;
        if (item.personalization?.inspoImage) {
          personalizationInspoUrl = await uploadDataUrl(item.personalization.inspoImage, `item${i}-name`, 0);
        }
        let bannerInspoUrls: string[] = [];
        if (item.bannerDetails?.inspoImages?.length) {
          bannerInspoUrls = (
            await Promise.all(
              item.bannerDetails.inspoImages.map((img, j) => uploadDataUrl(img, `item${i}-banner`, j)),
            )
          ).filter((u): u is string => !!u);
        }
        return { item, personalizationInspoUrl, bannerInspoUrls };
      }),
    );

    // Build HTML + plain text email
    const rows = processedItems
      .map(({ item, personalizationInspoUrl, bannerInspoUrls }) => {
        const lineTotal = (item.unitPrice * item.quantity).toFixed(2);
        const extras: string[] = [];
        if (item.personalization) {
          if (item.category === "sports") {
            extras.push(`<div><strong>Child's name:</strong> ${escape(item.personalization.name)}</div>`);
            if (item.personalization.sportsDetails?.notes)
              extras.push(`<div><strong>Team details:</strong> ${escape(item.personalization.sportsDetails.notes)}</div>`);
          } else {
            extras.push(`<div><strong>Personalize:</strong> ${escape(item.personalization.name)}</div>`);
            if (item.personalization.colorNotes)
              extras.push(`<div><strong>Color/vibe:</strong> ${escape(item.personalization.colorNotes)}</div>`);
          }
          if (personalizationInspoUrl)
            extras.push(`<div><a href="${personalizationInspoUrl}">View inspo photo</a></div>`);
        }
        if (item.bannerDetails) {
          extras.push(`<div><strong>Size:</strong> ${escape(item.bannerSize ?? "")}</div>`);
          extras.push(`<div><strong>Date needed:</strong> ${escape(item.bannerDetails.dateNeeded)}</div>`);
          extras.push(`<div><strong>Name on banner:</strong> ${escape(item.bannerDetails.name)}</div>`);
          extras.push(`<div><strong>Theme:</strong> ${escape(item.bannerDetails.theme)}</div>`);
          if (bannerInspoUrls.length)
            extras.push(
              `<div><strong>Inspo:</strong> ${bannerInspoUrls
                .map((u, k) => `<a href="${u}">Photo ${k + 1}</a>`)
                .join(" · ")}</div>`,
            );
        }
        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top">
              <div style="font-weight:600">${escape(item.title)}</div>
              <div style="color:#888;font-size:12px">Qty ${item.quantity} · $${item.unitPrice.toFixed(2)} each</div>
              <div style="margin-top:6px;font-size:13px;color:#333">${extras.join("")}</div>
            </td>
            <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;font-weight:600">$${lineTotal}</td>
          </tr>`;
      })
      .join("");

    const html = `
      <div style="font-family:Georgia,serif;background:#fdf7f4;padding:24px">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #f2e6df;border-radius:12px;overflow:hidden">
          <div style="padding:24px 28px;background:linear-gradient(135deg,#f9e3dc,#f4ccc3)">
            <h1 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#3d2b28">New order request</h1>
            <div style="color:#7a5c56;font-size:13px;margin-top:4px">KB Curated Co</div>
          </div>
          <div style="padding:24px 28px">
            <p style="margin:0 0 8px"><strong>From:</strong> ${escape(data.customerName)} &lt;${escape(data.customerEmail)}&gt;</p>
            <p style="margin:0 0 8px"><strong>Fulfillment:</strong> ${data.pickup ? "Houston local pickup" : "Ship"}</p>
            ${!data.pickup && data.zipCode ? `<p style="margin:0 0 8px"><strong>Zip code:</strong> ${escape(data.zipCode)}</p>` : ""}
            ${!data.pickup ? `<p style="margin:0 0 12px;font-style:italic;color:#555;font-size:13px">Earliest delivery date estimate: ${escape(getEarliestDeliveryDate())}</p>` : ""}
            ${data.notes ? `<p style="margin:0 0 12px"><strong>Notes:</strong> ${escape(data.notes)}</p>` : ""}
            <table style="width:100%;border-collapse:collapse;margin-top:8px">${rows}</table>
            <table style="width:100%;margin-top:12px;font-size:14px">
              <tr><td>Subtotal</td><td style="text-align:right">$${data.subtotal.toFixed(2)}</td></tr>
              <tr><td>Shipping</td><td style="text-align:right">$${data.shipping.toFixed(2)}</td></tr>
              <tr><td style="padding-top:6px;font-weight:700;font-size:16px">Estimated total</td><td style="padding-top:6px;text-align:right;font-weight:700;font-size:16px">$${data.total.toFixed(2)}</td></tr>
            </table>
            <p style="margin-top:20px;color:#7a5c56;font-size:12px">Inspo photo links expire in 7 days. Reply to this email to reach ${escape(data.customerName)}.</p>
          </div>
        </div>
      </div>`;

    const text = `New order request from ${data.customerName} <${data.customerEmail}>
Fulfillment: ${data.pickup ? "Houston local pickup" : "Ship"}
${!data.pickup && data.zipCode ? `Zip code: ${data.zipCode}
` : ""}${!data.pickup ? `Earliest delivery date estimate: ${getEarliestDeliveryDate()}
` : ""}${data.notes ? `Notes: ${data.notes}\n` : ""}
Items:
${processedItems
  .map(
    ({ item, personalizationInspoUrl, bannerInspoUrls }) =>
      `- ${item.title} x${item.quantity} @ $${item.unitPrice.toFixed(2)} = $${(item.unitPrice * item.quantity).toFixed(2)}` +
      (item.personalization
        ? item.category === "sports"
          ? `\n    Child's name: ${item.personalization.name}` +
            (item.personalization.sportsDetails?.notes ? `\n    Team details: ${item.personalization.sportsDetails.notes}` : "")
          : `\n    Name: ${item.personalization.name}` +
            (item.personalization.colorNotes ? `\n    Color: ${item.personalization.colorNotes}` : "")
        : "") +
      (personalizationInspoUrl ? `\n    Inspo: ${personalizationInspoUrl}` : "") +
      (item.bannerDetails
        ? `\n    Banner: ${item.bannerSize} / ${item.bannerDetails.dateNeeded} / ${item.bannerDetails.name}\n    Theme: ${item.bannerDetails.theme}` +
          (bannerInspoUrls.length ? `\n    Inspo: ${bannerInspoUrls.join(" | ")}` : "")
        : ""),
  )
  .join("\n")}

Subtotal: $${data.subtotal.toFixed(2)}
Shipping: $${data.shipping.toFixed(2)}
Total: $${data.total.toFixed(2)}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) throw new Error("Email service is not configured yet.");

    const resend = new Resend(resendApiKey);
    try {
      await resend.emails.send({
        from: `KB Curated Co <${RECIPIENT}>`,
        to: RECIPIENT,
        reply_to: data.customerEmail,
        subject: `New order request from ${data.customerName} — $${data.total.toFixed(2)}`,
        html,
        text,
      });
    } catch (err) {
      console.error("email send failed", err);
      throw new Error("Couldn't send the order email. Please try again in a moment.");
    }

    return { ok: true as const };
  });

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
}