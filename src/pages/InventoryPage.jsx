import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", imei: "", costPrice: "" });
  const [expandedModel, setExpandedModel] = useState(null);

  // ✅ Fetch products only for logged-in user
  const fetchProducts = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Fetch error:", error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ Add product
  const addProduct = async () => {
    if (!form.name || !form.imei || !form.costPrice) {
      alert("⚠️ Please fill all fields!");
      return;
    }
    if (form.imei.length !== 15) {
      alert("❌ IMEI must be 15 digits long!");
      return;
    }

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("❌ You must be logged in!");
      setSubmitting(false);
      return;
    }

    // Check duplicate IMEI
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("imei", form.imei)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      alert("❌ This IMEI already exists in your stock!");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("products").insert([
      {
        name: form.name.trim(),
        imei: form.imei,
        cost_price: parseFloat(form.costPrice),
        user_id: user.id, // ✅ important for RLS
      },
    ]);

    if (error) {
      alert("❌ Error adding product: " + error.message);
    } else {
      setForm({ name: "", imei: "", costPrice: "" });
      fetchProducts();
    }
    setSubmitting(false);
  };

  // ✅ Delete product
  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this IMEI?")) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert("❌ Delete failed: " + error.message);
    } else {
      fetchProducts();
    }
  };

  // ✅ Group by model
  const groupedProducts = {};
  products?.forEach((p) => {
    if (!groupedProducts[p.name]) groupedProducts[p.name] = [];
    groupedProducts[p.name].push(p);
  });

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-white">
      <h2 className="text-3xl font-bold text-blue-400 mb-6">
        📦 Inventory Management
      </h2>

      {/* Add Product Form */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 p-6 rounded-xl mb-8 border border-gray-700 shadow-lg"
      >
        <h3 className="text-xl font-semibold text-green-400 mb-4">
          ➕ Add New Device
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Model (e.g. iPhone 16 Pro Max)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="IMEI (15 digits)"
            value={form.imei}
            onChange={(e) => setForm({ ...form, imei: e.target.value })}
            className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Cost Price (Rs.)"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={addProduct}
          disabled={submitting}
          className={`mt-5 px-6 py-3 rounded-lg font-semibold w-full md:w-auto transition ${
            submitting
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {submitting ? "⏳ Adding..." : "✅ Add to Inventory"}
        </button>
      </motion.div>

      {/* Inventory List */}
      <h3 className="text-xl font-semibold text-yellow-400 mb-4">
        📋 Current Stock
      </h3>
      {loading ? (
        <div className="text-gray-400">⏳ Loading...</div>
      ) : Object.keys(groupedProducts).length === 0 ? (
        <div className="text-gray-400 italic">
          No devices in stock. Add some above 👆
        </div>
      ) : (
        <div className="space-y-5">
          {Object.keys(groupedProducts).map((model) => {
            const phones = groupedProducts[model];
            return (
              <motion.div
                key={model}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 p-5 rounded-xl shadow border border-gray-700"
              >
                {/* Model Header */}
                <div
                  className="flex justify-between items-center cursor-pointer select-none"
                  onClick={() =>
                    setExpandedModel(expandedModel === model ? null : model)
                  }
                >
                  <div>
                    <div className="font-bold text-lg">{model}</div>
                    <div className="text-sm text-gray-400">
                      {phones.length} in stock
                    </div>
                  </div>
                  <div className="text-blue-400 text-sm font-medium">
                    {expandedModel === model ? "▲ Hide" : "▼ Show"}
                  </div>
                </div>

                {/* Expandable IMEI List */}
                <AnimatePresence>
                  {expandedModel === model && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-3"
                    >
                      {phones.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition"
                        >
                          <div>
                            <div className="text-xs text-gray-300">
                              IMEI: {p.imei}
                            </div>
                            <div className="text-sm">
                              Cost Price:{" "}
                              <span className="text-yellow-300">
                                Rs.{p.cost_price}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition"
                          >
                            ❌ Delete
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
