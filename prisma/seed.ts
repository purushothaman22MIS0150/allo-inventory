// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up
  await prisma.reservation.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Warehouses
  const [mumbai, delhi, bangalore] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Mumbai Central", location: "Mumbai, MH" },
    }),
    prisma.warehouse.create({
      data: { name: "Delhi North", location: "New Delhi, DL" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore Hub", location: "Bengaluru, KA" },
    }),
  ]);

  // Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Wireless Noise-Cancelling Headphones",
        sku: "WH-NC-001",
        description:
          "Premium over-ear headphones with 30-hour battery life and active noise cancellation.",
        price: 12999,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Mechanical Keyboard TKL",
        sku: "KB-MEC-002",
        description:
          "Tenkeyless mechanical keyboard with Cherry MX switches and RGB backlighting.",
        price: 7499,
        imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Ultrawide Monitor 34\"",
        sku: "MON-UW-003",
        description:
          '34-inch curved ultrawide IPS monitor, 144Hz, perfect for immersive productivity.',
        price: 54999,
        imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Ergonomic Office Chair",
        sku: "CHR-ERG-004",
        description:
          "Lumbar support, adjustable armrests, breathable mesh back for all-day comfort.",
        price: 24999,
        imageUrl: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "USB-C Docking Station",
        sku: "DOCK-UC-005",
        description:
          "12-in-1 USB-C hub with dual 4K HDMI, 100W PD, Ethernet, and SD card slots.",
        price: 5999,
        imageUrl: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Portable SSD 1TB",
        sku: "SSD-PRT-006",
        description:
          "NVMe portable SSD with 1050 MB/s read speeds. Shock and dust resistant.",
        price: 8499,
        imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400",
      },
    }),
  ]);

  // Stock levels (intentionally low on some to demo race conditions)
  const stockData = [
    // Headphones
    { productId: products[0].id, warehouseId: mumbai.id, totalUnits: 15, reserved: 0 },
    { productId: products[0].id, warehouseId: delhi.id, totalUnits: 8, reserved: 0 },
    { productId: products[0].id, warehouseId: bangalore.id, totalUnits: 3, reserved: 0 },
    // Keyboard
    { productId: products[1].id, warehouseId: mumbai.id, totalUnits: 20, reserved: 0 },
    { productId: products[1].id, warehouseId: delhi.id, totalUnits: 5, reserved: 0 },
    // Monitor (scarce!)
    { productId: products[2].id, warehouseId: mumbai.id, totalUnits: 2, reserved: 0 },
    { productId: products[2].id, warehouseId: bangalore.id, totalUnits: 1, reserved: 0 },
    // Chair
    { productId: products[3].id, warehouseId: mumbai.id, totalUnits: 10, reserved: 0 },
    { productId: products[3].id, warehouseId: delhi.id, totalUnits: 6, reserved: 0 },
    { productId: products[3].id, warehouseId: bangalore.id, totalUnits: 4, reserved: 0 },
    // Dock
    { productId: products[4].id, warehouseId: mumbai.id, totalUnits: 30, reserved: 0 },
    { productId: products[4].id, warehouseId: bangalore.id, totalUnits: 12, reserved: 0 },
    // SSD (very scarce!)
    { productId: products[5].id, warehouseId: delhi.id, totalUnits: 1, reserved: 0 },
    { productId: products[5].id, warehouseId: bangalore.id, totalUnits: 3, reserved: 0 },
  ];

  await prisma.stockLevel.createMany({ data: stockData });

  console.log(`✅ Seeded ${products.length} products, 3 warehouses, ${stockData.length} stock levels`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
