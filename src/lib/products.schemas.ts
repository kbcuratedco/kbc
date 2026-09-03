import { z } from "zod";

export const categorySchema = z.enum(["stationery", "banner", "sports"]);

export const productSchema = z.object({
  title: z.string().min(1),
  category: categorySchema,
  price: z.number().min(0),
  description: z.string(),
  images: z.array(z.string()).min(1),
  active: z.boolean().default(true),
  freeShipping: z.boolean().default(false),
  digital: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const idSchema = z.object({ id: z.string().uuid() });

export const updateProductSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).optional(),
    category: categorySchema.optional(),
    price: z.number().min(0).optional(),
    description: z.string().optional(),
    images: z.array(z.string()).min(1).optional(),
    active: z.boolean().optional(),
    freeShipping: z.boolean().optional(),
    digital: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "Nothing changed.",
  });

export const toggleProductSchema = z.object({ id: z.string().uuid(), active: z.boolean() });

export const importProductsSchema = z.object({ products: z.array(z.unknown()) });

export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
