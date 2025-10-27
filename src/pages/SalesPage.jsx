// src/pages/SalesPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import Receipt from "./Receipt";
import { CheckCircle2, ShoppingCart, Trash2, Loader2, Package } from "lucide-react";

/**
 * Toast (renders via portal so it is always on top)
 * message: string
 * type: "error" | "success" | "info"
 * onClose: fn
 */
const ToastPortal = ({ message, type = "info", onClose }) => {
  // create a small element to render into body
  const el = typeof document !== "undefined" && document.getElementById("app-toast-root")
    ? document.getElementById("app-toast-root")
    : null;

  const toastNode = (
    <AnimatePresence>
      {message && (
        <motion.div
          key="toast"
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={`fixed bottom-6 right-6 z-[99999] max-w-xs px-4 py-3 rounded-lg shadow-2xl text-sm font-medium flex items-center gap-3
            ${type === "error" ? "bg-red-600 text-white border-red-500/40" : "bg-green-600 text-white border-green-400/40"}`}
          style={{ pointerEvents: "auto" }}
          onClick={onClose}
        >
          <span className="truncate">{message}</span>
          <button className="ml-2 px-2 py-0.5 rounded hover:bg-white/10 text-white/90" onClick={onClose}>✕</button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // If root exists use portal, else render inline (SSR-safe)
  return el ? createPortal(toastNode, el) : toastNode;
};

export default function SalesPage({ branch, logo }) {
  // state
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedIMEI, setSelectedIMEI] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [salePriceInput, setSalePriceInput] = useState("");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // show toast (portal)
  const toast = (msg, type = "error") => {
    setToastMsg({ msg, type });
    // auto hide after 3s
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ------------------ Fetch products ------------------
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setProducts([]);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, user_id, name, imei, category, cost_price, sale_price, status, quantity, created_at"
        )
        .eq("user_id", userId)
        .eq("status", "in_stock")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch products error:", error);
        toast("❌ Failed to load products", "error");
      } else {
        setProducts(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ensure toast root exists (append to body) so portal always has a mount
    if (typeof document !== "undefined" && !document.getElementById("app-toast-root")) {
      const troot = document.createElement("div");
      troot.id = "app-toast-root";
      // ensure the toast root doesn't create an unwanted stacking context
      troot.style.zIndex = "99999";
      troot.style.position = "fixed";
      troot.style.bottom = "0";
      troot.style.right = "0";
      document.body.appendChild(troot);
    }

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------ Group products ------------------
  const groupedProducts = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.category] = acc[p.category] || {};
      acc[p.category][p.name] = acc[p.category][p.name] || [];
      acc[p.category][p.name].push(p);
      return acc;
    }, {});
  }, [products]);

  // ------------------ Add to cart ------------------
  const handleAddToCart = () => {
    if (!category || !selectedModel) return toast("⚠️ Select category & model", "error");
    const salePrice = parseFloat(salePriceInput);
    if (!salePrice || salePrice <= 0) return toast("⚠️ Enter valid sale price", "error");

    if (category === "phone") {
      if (!selectedIMEI) return toast("⚠️ Select IMEI", "error");
      const phone = products.find((p) => p.imei === selectedIMEI && p.name === selectedModel);
      if (!phone) return toast("❌ Phone not found (may have been sold)", "error");
      if (cart.some((c) => c.id === phone.id)) return toast("⚠️ Phone already in cart", "error");

      setCart((c) => [
        ...c,
        { id: phone.id, name: phone.name, imei: phone.imei, cost_price: phone.cost_price, salePrice, type: "phone", quantity: 1 },
      ]);
    } else {
      // Accessory
      const accessoryRows = groupedProducts["accessory"]?.[selectedModel] || [];
      if (!accessoryRows.length) return toast("❌ Accessory not found in stock", "error");

      if (quantity <= 0) return toast("⚠️ Enter valid quantity", "error");

      // Compute total available in stock
      const totalAvailable = accessoryRows.reduce(
        (sum, r) => sum + (typeof r.quantity !== "undefined" && r.quantity !== null ? r.quantity : 1),
        0
      );

      // Compute already-in-cart quantity for this accessory
      const alreadyInCart = cart
        .filter((c) => c.type === "accessory" && c.name === selectedModel)
        .reduce((sum, c) => sum + c.quantity, 0);

      if (quantity + alreadyInCart > totalAvailable) {
        return toast(`❌ Not enough stock for "${selectedModel}". Available: ${totalAvailable - alreadyInCart}`, "error");
      }

      setCart((c) => [
        ...c,
        {
          id: null,
          name: selectedModel,
          salePrice,
          cost_price: accessoryRows[0]?.cost_price ?? 0,
          type: "accessory",
          quantity: Math.max(1, Math.floor(quantity)),
        },
      ]);
    }

    // Reset
    setSelectedModel("");
    setSelectedIMEI("");
    setSalePriceInput("");
    setQuantity(1);
    toast("✅ Added to cart", "success");
  };

  const handleRemoveFromCart = (idx) => setCart((prev) => prev.filter((_, i) => i !== idx));

  // ------------------ Totals ------------------
  const totalSale = useMemo(
    () => cart.reduce((sum, it) => sum + it.salePrice * it.quantity, 0),
    [cart]
  );
  const totalProfit = useMemo(
    () => cart.reduce((sum, it) => sum + (it.salePrice - (it.cost_price ?? 0)) * it.quantity, 0),
    [cart]
  );

  // ------------------ Checkout ------------------
  const handleCheckout = async () => {
    if (cart.length === 0) return toast("⚠️ Cart is empty!", "error");
    if (checkingOut) return;
    setCheckingOut(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not logged in");
      const userId = userData.user.id;

      // ----- Validate phones -----
      const phoneItems = cart.filter((c) => c.type === "phone");
      const phoneIds = phoneItems.map((p) => p.id).filter(Boolean);
      if (phoneIds.length) {
        const { data: livePhones, error: liveErr } = await supabase
          .from("products")
          .select("id")
          .in("id", phoneIds)
          .eq("user_id", userId)
          .eq("status", "in_stock");

        if (liveErr) throw liveErr;
        const liveIds = new Set((livePhones || []).map((r) => r.id));
        const missing = phoneIds.filter((id) => !liveIds.has(id));
        if (missing.length) {
          toast("❌ Some phones are no longer available. Remove them.", "error");
          setCheckingOut(false);
          return;
        }
      }

      // ----- Validate accessories -----
      const accessoryItems = cart.filter((c) => c.type === "accessory");
      const accessoryPlans = {}; // name -> { units, updates, deletes }

      for (const item of accessoryItems) {
        const neededQty = item.quantity;

        const { data: rows, error: rowsErr } = await supabase
          .from("products")
          .select("id, quantity, cost_price")
          .eq("user_id", userId)
          .eq("name", item.name)
          .eq("category", "accessory")
          .eq("status", "in_stock")
          .order("created_at", { ascending: true })
          .limit(500);

        if (rowsErr) throw rowsErr;

        if (!rows || rows.length === 0) {
          toast(`❌ Accessory "${item.name}" is out of stock`, "error");
          setCheckingOut(false);
          return;
        }

        const totalAvailable = rows.reduce(
          (s, r) => s + (typeof r.quantity !== "undefined" && r.quantity !== null ? r.quantity : 1),
          0
        );
        if (totalAvailable < neededQty) {
          toast(`❌ Not enough "${item.name}" in stock (need ${neededQty}, have ${totalAvailable})`, "error");
          setCheckingOut(false);
          return;
        }

        // Plan units, updates, deletes
        let remaining = neededQty;
        const units = [];
        const updates = [];
        const deletes = [];

        for (const r of rows) {
          if (remaining <= 0) break;
          const hasQty = typeof r.quantity !== "undefined" && r.quantity !== null;
          if (hasQty) {
            const available = Number(r.quantity || 0);
            if (available <= 0) continue;
            const take = Math.min(available, remaining);
            for (let i = 0; i < take; i++) units.push({ id: r.id, cost_price: r.cost_price });
            const newQty = available - take;
            if (newQty > 0) updates.push({ id: r.id, newQty });
            else deletes.push(r.id);
            remaining -= take;
          } else {
            units.push({ id: r.id, cost_price: r.cost_price });
            deletes.push(r.id);
            remaining -= 1;
          }
        }

        accessoryPlans[item.name] = { units, updates, deletes };
      }

      // ----- Insert sales rows -----
      const saleRows = [];

      phoneItems.forEach((p) => {
        saleRows.push({
          user_id: userId,
          product_id: p.id,
          product_name: p.name,
          imei: p.imei || null,
          cost_price: p.cost_price ?? 0,
          sale_price: p.salePrice,
          created_at: new Date().toISOString(),
        });
      });

      Object.entries(accessoryPlans).forEach(([name, plan]) => {
        plan.units.forEach((u) => {
          const salePrice = cart.find((c) => c.type === "accessory" && c.name === name)?.salePrice ?? 0;
          saleRows.push({
            user_id: userId,
            product_id: u.id || null,
            product_name: name,
            imei: null,
            cost_price: u.cost_price ?? 0,
            sale_price: salePrice,
            created_at: new Date().toISOString(),
          });
        });
      });

      const { error: saleInsertErr } = await supabase.from("sales").insert(saleRows);
      if (saleInsertErr) throw saleInsertErr;

      // ----- Update inventory: delete phones -----
      if (phoneIds.length) {
        const { error: delPhoneErr } = await supabase.from("products").delete().in("id", phoneIds);
        if (delPhoneErr) console.error("Failed to delete phones:", delPhoneErr);
      }

      // ----- Update accessory rows -----
      const accessoryUpdatePromises = [];
      const accessoryDeleteIds = [];

      Object.values(accessoryPlans).forEach((plan) => {
        plan.updates.forEach((u) => accessoryUpdatePromises.push(
          supabase.from("products").update({ quantity: u.newQty }).eq("id", u.id)
        ));
        if (plan.deletes.length) accessoryDeleteIds.push(...plan.deletes);
      });

      if (accessoryUpdatePromises.length) {
        await Promise.all(accessoryUpdatePromises);
      }

      if (accessoryDeleteIds.length) {
        const { error: delAccErr } = await supabase.from("products").delete().in("id", accessoryDeleteIds);
        if (delAccErr) console.error("Failed to delete accessory rows:", delAccErr);
      }

      // ----- Done -----
      printReceipt();
      toast("✅ Sale completed successfully!", "success");
      setCart([]);
      setCategory("");
      setSelectedModel("");
      setSelectedIMEI("");
      setSalePriceInput("");
      setQuantity(1);

      // Refresh products for UI and analytics
      await fetchProducts();
    } catch (err) {
      console.error("Checkout failed:", err);
      toast("❌ " + (err.message || "Checkout failed"), "error");
    } finally {
      setCheckingOut(false);
    }
  };

  // ------------------ Receipt ------------------
  const printReceipt = () => {
    const receiptData = cart.flatMap((p) =>
      Array.from({ length: p.quantity }).map(() => ({
        model: p.name,
        imei: p.imei || "N/A",
        salePrice: p.salePrice,
        category: p.type === "phone" ? "Phone" : "Accessory",
        date: new Date().toLocaleString(),
      }))
    );
    Receipt.show(receiptData, branch, logo);
  };

  // ------------------ JSX ------------------
  return (
    <div className="bg-gray-950 min-h-screen p-6 text-white flex flex-col md:flex-row gap-6">
      {/* Toast Portal (renders in body at highest z) */}
      {toastMsg && <ToastPortal message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}

      {/* Left: Selection */}
      <motion.div className="flex-1 bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-800" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-blue-400 mb-6 flex items-center gap-2"><Package size={20} /> Make a Sale</h2>

        {loading ? <div className="animate-pulse text-gray-400">⏳ Loading...</div> : (
          <>
            {/* Category */}
            <div className="mb-4">
              <label className="block mb-2 text-gray-300 font-medium">Select Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setSelectedModel(""); setSelectedIMEI(""); setQuantity(1); }}
                className="p-3 rounded-lg bg-gray-800 text-white border border-gray-600 w-full">
                <option value="">-- Choose Category --</option>
                <option value="phone">📱 Phone</option>
                <option value="accessory">🎧 Accessory</option>
              </select>
            </div>

            {/* Model */}
            {category && (
              <div className="mb-4">
                <label className="block mb-2 text-gray-300 font-medium">Select Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="p-3 rounded-lg bg-gray-800 text-white border border-gray-600 w-full">
                  <option value="">-- Choose Model --</option>
                  {Object.keys(groupedProducts[category] || {}).map((model) => (
                    <option key={model} value={model}>
                      {model} ({(groupedProducts[category]?.[model] || []).reduce((s, r) => s + (r.quantity ?? 1), 0)} in stock)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Phone → IMEI */}
            {category === "phone" && selectedModel && (
              <div className="mb-4">
                <label className="block mb-2 text-gray-300 font-medium">Select IMEI</label>
                <select
                  value={selectedIMEI}
                  onChange={(e) => setSelectedIMEI(e.target.value)}
                  className="p-3 rounded-lg bg-gray-800 text-white border border-gray-600 w-full">
                  <option value="">-- Choose IMEI --</option>
                  {(groupedProducts["phone"]?.[selectedModel] || []).map((p) => (
                    <option key={p.id} value={p.imei}>
                      {p.imei} | Rs.{p.cost_price}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Accessory → Quantity */}
            {category === "accessory" && selectedModel && (
              <div className="mb-4">
                <label className="block mb-2 text-gray-300 font-medium">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  min={1}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="p-3 rounded-lg bg-gray-800 text-white border border-gray-600 w-full"
                />
              </div>
            )}

            {/* Sale Price */}
            {selectedModel && (
              <div className="mb-4">
                <label className="block mb-2 text-gray-300 font-medium">Enter Sale Price (per unit)</label>
                <input
                  type="number"
                  value={salePriceInput}
                  onChange={(e) => setSalePriceInput(e.target.value)}
                  placeholder="Enter price (Rs.)"
                  className="p-3 rounded-lg bg-gray-800 text-white border border-gray-600 w-full"
                />
              </div>
            )}

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddToCart} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold w-full transition flex items-center justify-center gap-2">
              <ShoppingCart size={18} /> Add to Cart
            </motion.button>
          </>
        )}
      </motion.div>

      {/* Right: Cart */}
      <motion.div className="w-full md:w-96 bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-800" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">🛒 Cart ({cart.length})</h2>
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="text-gray-400">Cart is empty</div>
            ) : (
              cart.map((item, idx) => (
                <motion.li key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    {item.imei && <div className="text-xs text-gray-300">IMEI: {item.imei}</div>}
                    <div className="text-sm">
                      Qty: {item.quantity} | Sale: <span className="text-green-400">Rs.{item.salePrice}</span> | Profit: <span className="text-yellow-400">Rs.{((item.salePrice - (item.cost_price ?? 0)) * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveFromCart(idx)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">❌ Remove</button>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>

        {cart.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="font-semibold text-right">Total Sale: Rs.{totalSale}</div>
            <div className="font-semibold text-right text-green-400">Profit: Rs.{totalProfit.toFixed(2)}</div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckout} disabled={checkingOut}
              className={`mt-3 w-full px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${checkingOut ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {checkingOut ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><CheckCircle2 size={18} /> Checkout & Save</>}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
