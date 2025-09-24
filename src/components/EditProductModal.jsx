import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../db/dexieDB';

export default function EditProductModal({ product, onClose }) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock);

  const update = async () => {
    if (!name) return;

    const existing = await db.products
      .where('name')
      .equalsIgnoreCase(name.trim())
      .first();

    if (existing && existing.id !== product.id) {
      // merge stock if another product exists with same name
      await db.products.update(existing.id, {
        stock: Number(existing.stock) + Number(stock || 0),
        price: Number(price || existing.price)
      });
      // delete the edited product if merged
      await db.products.delete(product.id);
    } else {
      await db.products.update(product.id, {
        name: name.trim(),
        price: Number(price || 0),
        stock: Number(stock || 0)
      });
    }

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-30"
    >
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-gray-800 rounded-lg p-6 w-96 shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-3">Edit Product</h3>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-700"/>
        <input value={price} onChange={e => setPrice(e.target.value)} type="number" className="w-full mb-2 p-2 rounded bg-gray-700"/>
        <input value={stock} onChange={e => setStock(e.target.value)} type="number" className="w-full mb-4 p-2 rounded bg-gray-700"/>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
          <button onClick={update} className="px-3 py-1 bg-blue-600 rounded">Update</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
