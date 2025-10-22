// src/pages/InventoryPage.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

/* ---------- Toast Component ---------- */
const Toast = ({ toasts, remove }) => (
  <div className="fixed top-5 right-5 z-50 flex flex-col gap-3">
    <AnimatePresence>
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          onClick={() => remove(t.id)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-xl shadow-lg cursor-pointer hover:scale-105 transform transition"
        >
          {t.msg}
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

/* ---------- Inventory Page ---------- */
export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", imei: "", cost_price: "", category: "phone", quantity: 1 });
  const [toasts, setToasts] = useState([]);
  const channelRef = useRef(null);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const fetchUserId = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  }, []);

  const fetchProducts = useCallback(async (userIdOverride = null) => {
    setLoading(true);
    try {
      const userId = userIdOverride ?? (await fetchUserId());
      if (!userId) return setProducts([]);

      const { data, error } = await supabase
        .from("products")
        .select(`id, name, imei, category, cost_price, status, created_at, user_id, quantity`)
        .eq("user_id", userId)
        .eq("status", "in_stock")
        .order("created_at", { ascending: false });

      if (error) pushToast("❌ Failed to load products");
      else setProducts(data || []);
    } catch {
      pushToast("❌ Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [fetchUserId]);

  const setupRealtime = useCallback(async (userId) => {
    if (channelRef.current) {
      try { await supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    if (!userId) return;

    const chan = supabase.channel(`public:products:user=${userId}`);
    chan.on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `user_id=eq.${userId}` }, (payload) => {
      const ev = payload?.eventType || payload?.type || payload?.event || "";
      const newRow = payload?.new ?? payload?.record;
      const oldRow = payload?.old ?? payload?.previous;

      setProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        if (ev.includes("INSERT") && newRow?.status === "in_stock") map.set(newRow.id, newRow);
        if (ev.includes("UPDATE")) {
          if (newRow?.status === "in_stock") map.set(newRow.id, newRow);
          else map.delete(newRow.id);
        }
        if (ev.includes("DELETE") && oldRow) map.delete(oldRow.id);
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
    });
    chan.subscribe();
    channelRef.current = chan;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = await fetchUserId();
      if (!mounted) return;
      await fetchProducts(userId);
      await setupRealtime(userId);
    })();
    return () => { mounted = false; if (channelRef.current) supabase.removeChannel(channelRef.current).catch(() => {}); };
  }, [fetchProducts, fetchUserId, setupRealtime]);

  /* ---------- Add Product ---------- */
  const addProduct = async () => {
    if (!form.name.trim() || !form.cost_price) return pushToast("⚠️ Name & cost required");
    if (form.category === "phone" && (!form.imei || form.imei.length !== 15)) return pushToast("❌ IMEI required (15 digits)");
    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Not logged in");

      if (form.category === "phone") {
        const { data: exists } = await supabase.from("products").select("id").eq("imei", form.imei.trim()).eq("user_id", userId).maybeSingle();
        if (exists) return pushToast("❌ IMEI already exists");
      }

      if (form.category === "accessory") {
        const { data: existing } = await supabase.from("products").select("id, quantity").eq("user_id", userId).eq("category", "accessory").eq("name", form.name.trim()).maybeSingle();
        if (existing && typeof existing.quantity !== "undefined") {
          const newQty = (existing.quantity || 0) + (parseInt(form.quantity, 10) || 1);
          const { error } = await supabase.from("products").update({ quantity: newQty }).eq("id", existing.id);
          if (error) throw error;
          pushToast("✅ Accessory quantity updated");
          return setForm({ name: "", imei: "", cost_price: "", category: "phone", quantity: 1 });
        }
      }

      const insertRow = { name: form.name.trim(), imei: form.imei?.trim() || null, category: form.category, cost_price: parseFloat(form.cost_price) };
      const { error } = await supabase.from("products").insert([insertRow]);
      if (error) pushToast("❌ Error adding product: " + error.message);
      else pushToast("✅ Product added");
      await fetchProducts(userId);
      setForm({ name: "", imei: "", cost_price: "", category: "phone", quantity: 1 });
    } catch (err) { pushToast("❌ Add failed: " + (err.message || err)); }
    finally { setSubmitting(false); }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", userId);
      if (error) pushToast("❌ Delete failed");
      else { pushToast("✅ Deleted"); setProducts((prev) => prev.filter((p) => p.id !== id)); }
    } catch { pushToast("❌ Delete failed"); }
  };

  /* ---------- Derived Data ---------- */
  const { phonesByModel, accessoriesSummary, phonesCount, accessoriesCount } = useMemo(() => {
    const phones = [], accessories = [];
    products.forEach((p) => p.category === "accessory" ? accessories.push(p) : phones.push(p));

    const phonesByModel = phones.reduce((acc, p) => { acc[p.name] = acc[p.name] || []; acc[p.name].push(p); return acc; }, {});
    const accessoriesSummary = accessories.reduce((acc, p) => {
      if (!acc[p.name]) acc[p.name] = { qty: 0, sample: p };
      const qty = typeof p.quantity !== "undefined" ? (p.quantity || 0) : 1;
      acc[p.name].qty += qty;
      return acc;
    }, {});

    return {
      phonesByModel,
      accessoriesSummary,
      phonesCount: phones.length,
      accessoriesCount: accessories.reduce((s, r) => s + (typeof r.quantity !== "undefined" ? (r.quantity || 0) : 1), 0),
    };
  }, [products]);

  return (
    <div className="bg-gray-950 min-h-screen p-6 text-white font-sans">
      <h2 className="text-4xl font-bold text-gradient-to-r from-purple-500 to-blue-400 mb-6">📦 Inventory</h2>

      {/* Add Product Form */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900 p-6 rounded-2xl mb-6 border border-gray-700 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <input
            className="p-3 rounded-xl bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            placeholder="Name (model or accessory)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addProduct()}
          />

          <select
            className="p-3 rounded-xl bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="phone">Phone</option>
            <option value="accessory">Accessory</option>
          </select>

          {form.category === "phone" ? (
            <input
              className="p-3 rounded-xl bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="IMEI (15 digits)"
              value={form.imei}
              onChange={(e) => setForm({ ...form, imei: e.target.value })}
            />
          ) : (
            <input
              className="p-3 rounded-xl bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="Quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value || 1) })}
            />
          )}

          <input
            className="p-3 rounded-xl bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            placeholder="Cost price (Rs.)"
            type="number"
            value={form.cost_price}
            onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
          />
        </div>

        <div className="mt-5 flex gap-4">
          <button
            onClick={addProduct}
            disabled={submitting}
            className={`px-5 py-3 rounded-xl ${submitting ? "bg-gray-700" : "bg-purple-600 hover:bg-purple-700"} transition text-white font-semibold`}
          >
            {submitting ? "⏳ Adding..." : "✅ Add"}
          </button>
          <button
            onClick={() => setForm({ name: "", imei: "", cost_price: "", category: "phone", quantity: 1 })}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-white font-semibold"
          >
            Reset
          </button>
          <button
            onClick={async () => { await fetchProducts((await fetchUserId()) || null); pushToast("🔄 Refreshed"); }}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-white font-semibold"
          >
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Inventory Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phones Panel */}
        <div className="bg-gray-900 p-5 rounded-2xl border border-gray-700 shadow-inner">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-xl">📱 Phones ({phonesCount})</h3>
            <span className="text-sm text-gray-400">Grouped by model</span>
          </div>
          {loading ? <div className="text-gray-400">⏳ Loading phones…</div> : (
            Object.keys(phonesByModel).length === 0 ? <div className="italic text-gray-400">No phones in stock.</div> : (
              <div className="space-y-4">
                {Object.entries(phonesByModel).map(([model, items]) => (
                  <div key={model} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{model}</div>
                        <div className="text-sm text-gray-400">{items.length} in stock</div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {items.map((p) => (
                        <div key={p.id} className="flex justify-between bg-gray-700 p-3 rounded-xl items-center transition hover:bg-gray-600">
                          <div>
                            <div className="text-xs text-gray-300">IMEI: {p.imei}</div>
                            <div className="text-sm">Cost: Rs. {p.cost_price}</div>
                          </div>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="px-3 py-1 bg-red-600 rounded-lg text-xs hover:bg-red-700 transition font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Accessories Panel */}
        <div className="bg-gray-900 p-5 rounded-2xl border border-gray-700 shadow-inner">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-xl">🔌 Accessories ({accessoriesCount})</h3>
            <span className="text-sm text-gray-400">Grouped by name</span>
          </div>
          {loading ? <div className="text-gray-400">⏳ Loading accessories…</div> : (
            Object.keys(accessoriesSummary).length === 0 ? <div className="italic text-gray-400">No accessories in stock.</div> : (
              <div className="space-y-3">
                {Object.entries(accessoriesSummary).map(([name, { qty, sample }]) => (
                  <div key={name} className="flex justify-between items-center bg-gray-800 p-4 rounded-xl transition hover:bg-gray-700">
                    <div>
                      <div className="font-semibold">{name}</div>
                      <div className="text-sm text-gray-400">{qty} units</div>
                      {sample && typeof sample.quantity !== "undefined" && <div className="text-xs text-gray-500">(tracked with quantity)</div>}
                    </div>
                    <span className="text-sm text-gray-300">—</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
