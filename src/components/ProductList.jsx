import React from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexieDB';

export default function ProductList({ onEdit }) {
  const products = useLiveQuery(() => db.products.toArray(), []);

  const remove = async (id) => {
    await db.products.delete(id);
  };

  if (!products) return <div className="p-4 bg-gray-800 rounded text-base">Loading...</div>;

  // Low-stock alert (console for now; can upgrade to toast)
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5);
  if (lowStockProducts.length > 0) {
    console.log(`⚠ Low stock: ${lowStockProducts.map(p => p.name).join(', ')}`);
  }

  return (
    <div className="bg-gray-800 rounded p-4">
      {products.length === 0 && <div className="text-gray-400 text-base">No products yet.</div>}
      <ul>
        <AnimatePresence>
          {products.map(p => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10, height: 0, margin: 0, padding: 0 }}
              className={`flex justify-between items-center py-2 border-b ${
                p.stock === 0 ? 'border-red-500' : 'border-gray-700'
              }`}
            >
              {/* Product name + stock */}
              <div className="flex flex-col gap-0.5">
                <div className="font-semibold text-lg">{p.name}</div>
                <div className="text-sm flex gap-2 items-center">
                  <span
                    className={`font-medium ${
                      p.stock === 0
                        ? 'text-red-500'
                        : p.stock <= 5
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}
                  >
                    Stock: {p.stock}
                  </span>
                  {p.stock === 0 && <span>❌ Out of stock</span>}
                  {p.stock > 0 && p.stock <= 5 && <span>⚠ Low stock!</span>}
                </div>
              </div>

              {/* Price on right */}
              <div className="font-semibold text-lg text-blue-400 ml-4">{p.price} Rs</div>

              {/* Edit/Delete buttons */}
              <div className="flex gap-2 ml-4">
                <button onClick={() => onEdit(p)} className="px-2 py-1 bg-yellow-500 rounded text-sm">
                  Edit
                </button>
                <button onClick={() => remove(p.id)} className="px-2 py-1 bg-red-600 rounded text-sm">
                  Delete
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
