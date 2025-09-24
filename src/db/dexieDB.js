import Dexie from "dexie";

export const db = new Dexie("posDB");

// Refined schema: keep products + one unified sales table
db.version(4).stores({
  // Products: inventory items
  products: "++id, name, imei, costPrice, salePrice, stock",

  // Sales: each sold phone with profit tracking
  sales: "++id, productId, name, imei, costPrice, salePrice, profit, date",
});

// Preload iPhone models 12 → 17 Pro Max (only models, no IMEIs yet)
export async function preloadIphones() {
  const existing = await db.products.count();
  if (existing === 0) {
    const models = [
      "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
      "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
      "iPhone 14", "iPhone 14 Pro", "iPhone 14 Pro Max",
      "iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max",
      "iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max",
      "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max",
    ];

    await db.products.bulkAdd(
      models.map((m) => ({
        name: m,
        imei: "",     // IMEIs will be added individually when stocked
        costPrice: 0,
        salePrice: 0,
        stock: 0,
      }))
    );
  }
}
