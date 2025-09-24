// SalesPage.jsx
import React, { useState, useEffect, useMemo } from "react"
import { supabase } from "../supabaseClient"
import { motion, AnimatePresence } from "framer-motion"

export default function SalesPage() {
  const [products, setProducts] = useState([])
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedIMEI, setSelectedIMEI] = useState("")
  const [salePriceInput, setSalePriceInput] = useState("")
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)

  // ✅ Fetch available products
  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) console.error("❌ Fetch error:", error.message)
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // ✅ Group products by model
  const groupedProducts = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.name] = acc[p.name] || []
      acc[p.name].push(p)
      return acc
    }, {})
  }, [products])

  // ✅ Add to cart
  const handleAddToCart = () => {
    if (!selectedModel || !selectedIMEI) return toast("⚠️ Select model & IMEI")

    const phone = products.find((p) => p.imei === selectedIMEI)
    if (!phone) return toast("❌ IMEI not found in stock")

    const salePrice = parseFloat(salePriceInput)
    if (!salePrice || salePrice <= 0) return toast("⚠️ Enter valid sale price")

    if (cart.some((c) => c.imei === phone.imei))
      return toast("⚠️ This IMEI is already in cart")

    setCart((prev) => [...prev, { ...phone, salePrice }])
    setSelectedIMEI("")
    setSalePriceInput("")
  }

  // ✅ Remove from cart
  const handleRemoveFromCart = (imei) =>
    setCart((prev) => prev.filter((p) => p.imei !== imei))

  // ✅ Totals
  const totalSale = useMemo(
    () => cart.reduce((sum, item) => sum + item.salePrice, 0),
    [cart]
  )
  const totalProfit = useMemo(
    () =>
      cart.reduce((sum, item) => sum + (item.salePrice - item.cost_price), 0),
    [cart]
  )

  // ✅ Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return toast("⚠️ Cart is empty!")

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("Not logged in")

      // Insert sales rows
      const saleRows = cart.map((item) => ({
        product: item.name,
        imei: item.imei,
        costPrice: item.cost_price,
        salePrice: item.salePrice,
        profit: item.salePrice - item.cost_price,
        user_id: user.id // 👈 required for RLS
      }))

      const { error: saleError } = await supabase.from("sales").insert(saleRows)
      if (saleError) throw saleError

      // ❌ Delete products instead of updating
      const ids = cart.map((c) => c.id)
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .in("id", ids)

      if (deleteError) throw deleteError

      printReceipt()
      toast("✅ Sale completed successfully!")

      setCart([])
      setSelectedModel("")
      setSelectedIMEI("")
      fetchProducts()
    } catch (err) {
      console.error("Checkout failed:", err)
      toast("❌ " + err.message)
    }
  }

  // ✅ Print receipt
  const printReceipt = () => {
    const itemsHtml = cart
      .map(
        (p) => `<tr>
          <td>${p.name}</td>
          <td>${p.imei}</td>
          <td>Rs.${p.salePrice}</td>
          <td>Rs.${p.salePrice - p.cost_price}</td>
        </tr>`
      )
      .join("")

    const html = `
      <html>
        <head><title>Receipt</title></head>
        <body style="font-family: Arial, sans-serif; padding: 16px;">
          <h2 style="color:#2563eb;">📱 MALIK TRADERS</h2>
          <p>Date: ${new Date().toLocaleString()}</p>
          <table border="1" cellpadding="5" cellspacing="0" style="width:100%; margin-top:10px; border-collapse: collapse;">
            <tr style="background:#f3f4f6;">
              <th>Model</th>
              <th>IMEI</th>
              <th>Sale Price</th>
              <th>Profit</th>
            </tr>
            ${itemsHtml}
          </table>
          <h3 style="margin-top:10px;">Total Sale: Rs.${totalSale}</h3>
          <h3 style="margin-top:5px; color:green;">Profit: Rs.${totalProfit}</h3>
        </body>
      </html>
    `
    const win = window.open("", "_blank")
    win.document.write(html)
    win.document.close()
    win.print()
  }

  // ✅ Inline toast
  const toast = (msg) => window.alert(msg)

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-white flex flex-col md:flex-row gap-6">
      {/* Product selection */}
      <motion.div
        className="flex-1 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-blue-400 mb-6">
          📦 Available iPhones
        </h2>

        {loading ? (
          <div className="text-gray-400">⏳ Loading...</div>
        ) : (
          <>
            {/* Select Model */}
            <div className="mb-4">
              <label className="block mb-2 text-gray-300 font-medium">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value)
                  setSelectedIMEI("")
                  setSalePriceInput("")
                }}
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 w-full"
              >
                <option value="">-- Choose Model --</option>
                {Object.keys(groupedProducts).map((model) => (
                  <option key={model} value={model}>
                    {model} ({groupedProducts[model].length} in stock)
                  </option>
                ))}
              </select>
            </div>

            {/* Select IMEI */}
            {selectedModel && (
              <div className="mb-4">
                <label className="block mb-2 text-gray-300 font-medium">
                  Select IMEI
                </label>
                <select
                  value={selectedIMEI}
                  onChange={(e) => setSelectedIMEI(e.target.value)}
                  className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 w-full"
                >
                  <option value="">-- Choose IMEI --</option>
                  {groupedProducts[selectedModel].map((p) => (
                    <option key={p.imei} value={p.imei}>
                      {p.imei}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sale Price Input */}
            {selectedIMEI && (
              <div className="mb-4">
                <label className="block mb-2 text-gray-300 font-medium">
                  Enter Sale Price
                </label>
                <input
                  type="number"
                  value={salePriceInput}
                  onChange={(e) => setSalePriceInput(e.target.value)}
                  placeholder="Enter price (Rs.)"
                  className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 w-full"
                />
              </div>
            )}

            <button
              onClick={handleAddToCart}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold w-full transition"
            >
              ➕ Add to Cart
            </button>
          </>
        )}
      </motion.div>

      {/* Cart Section */}
      <motion.div
        className="w-full md:w-96 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">🛒 Cart</h2>
        <AnimatePresence>
          {cart.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400"
            >
              Cart is empty
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="space-y-3">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.li
                key={item.imei}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, margin: 0, padding: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"
              >
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-xs text-gray-300">IMEI: {item.imei}</div>
                  <div className="text-sm">
                    Sale:{" "}
                    <span className="text-green-400">Rs.{item.salePrice}</span>{" "}
                    | Profit:{" "}
                    <span className="text-yellow-400">
                      Rs.{item.salePrice - item.cost_price}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFromCart(item.imei)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                >
                  ❌ Remove
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {cart.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="font-semibold text-right">
              Total Sale: Rs.{totalSale}
            </div>
            <div className="font-semibold text-right text-green-400">
              Profit: Rs.{totalProfit}
            </div>
            <button
              onClick={handleCheckout}
              className="mt-3 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
            >
              ✅ Checkout & Save
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
