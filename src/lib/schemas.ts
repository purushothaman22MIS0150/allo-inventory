// src/lib/schemas.ts
import { z } from "zod";

export const ReserveSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(10),
});

export const ReservationStatusSchema = z.enum(["PENDING", "CONFIRMED", "RELEASED"]);

export type ReserveInput = z.infer<typeof ReserveSchema>;
