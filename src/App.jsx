import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import { supabase } from "./supabaseClient";

export default function App() {
  const [page, setPage] = useState("inventory");
  const [user, setUser] = useState(null);
  const [branch, setBranch] = useState("MAKS OS");

  // 🔹 Fetch user & metadata efficiently
  const fetchUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user;
    setUser(currentUser);
    setBranch(currentUser?.user_metadata?.branch || "MAKS OS");
  }, []);

  useEffect(() => {
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setBranch(currentUser?.user_metadata?.branch || "MAKS OS");
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchUser]);

  // 🔹 Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBranch("MAKS OS");
  };

  // 🔹 Tabs
  const tabs = [
    { id: "inventory", label: "📦 Inventory" },
    { id: "sales", label: "🛒 Sales" },
    { id: "analytics", label: "📊 Analytics" },
  ];

  if (!user) return <LoginPage onLogin={fetchUser} />;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white relative overflow-hidden">
      {/* ===== Background Glow (lightened for performance) ===== */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-2xl top-[-60px] left-[-60px]" />
        <div className="absolute w-80 h-80 bg-pink-500/20 rounded-full blur-xl bottom-[-90px] right-[-60px]" />
      </div>

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/5 border-b border-white/10 shadow-sm">
        <div className="max-w-6xl mx-auto py-4 px-4 flex flex-col items-center">
          {/* Branch Title */}
          <motion.h1
            className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          >
            {branch}
          </motion.h1>

          <p className="mt-1 text-sm text-gray-300 italic">
            Inventory & Sales Management — Powered by MAKS OS
          </p>

          {/* Navigation Tabs */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                className={`px-4 py-2 rounded-2xl font-medium backdrop-blur-xl border transition-all ${
                  page === tab.id
                    ? "bg-white/20 text-white border-white/30 shadow-sm scale-105"
                    : "bg-white/10 text-gray-200 border-white/20 hover:bg-white/20"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.label}
              </motion.button>
            ))}

            {/* Logout */}
            <motion.button
              onClick={handleLogout}
              className="ml-2 px-4 py-2 rounded-2xl font-medium backdrop-blur-xl bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🚪 Logout
            </motion.button>
          </div>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <div className="backdrop-blur-md bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg">
          <AnimatePresence mode="wait">
            {page === "inventory" && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <InventoryPage />
              </motion.div>
            )}
            {page === "sales" && (
              <motion.div
                key="sales"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <SalesPage branch={branch} />
              </motion.div>
            )}
            {page === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <AnalyticsPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="mt-4 py-3 text-sm text-center backdrop-blur-md bg-white/5 border-t border-white/10 shadow-inner">
        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
          © {new Date().getFullYear()} {branch}
        </span>{" "}
        • Crafted with ❤️ by{" "}
        <span className="bg-gradient-to-r from-green-400 via-yellow-300 to-red-400 bg-clip-text text-transparent font-bold">
          MAKS
        </span>
      </footer>
    </div>
  );
}
