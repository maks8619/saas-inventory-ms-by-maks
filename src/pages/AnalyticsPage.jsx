import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { CSVLink } from "react-csv";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSales();
  }, []);

  // ✅ Fetch sales from Supabase
  const loadSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("❌ Fetch sales error:", error.message);
      return;
    }

    setSales(data || []);
    setFilteredSales(data || []);
  };

  // 🔍 Search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredSales(sales);
    } else {
      const query = search.toLowerCase();
      setFilteredSales(
        sales.filter(
          (s) =>
            s.product?.toLowerCase().includes(query) ||
            s.imei?.toLowerCase().includes(query)
        )
      );
    }
  }, [search, sales]);

  // 🗑 Delete Sale
  const deleteSale = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sale?")) return;

    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) {
      alert("❌ Error deleting: " + error.message);
    } else {
      loadSales();
    }
  };

  // 📅 Today’s filter
  const today = new Date().toISOString().split("T")[0];
  const dailySales = filteredSales.filter((s) => s.date?.startsWith(today));

  // Totals
  const calcTotals = (data) => ({
    totalSales: data.reduce((sum, s) => sum + Number(s.salePrice || 0), 0),
    totalProfit: data.reduce((sum, s) => sum + Number(s.profit || 0), 0),
  });
  const dailyTotals = calcTotals(dailySales);
  const allTotals = calcTotals(filteredSales);

  // 📊 Group by date for chart
  const groupByDate = (data) => {
    const grouped = {};
    data.forEach((s) => {
      const date = s.date?.split("T")[0] || "Unknown";
      if (!grouped[date]) grouped[date] = { date, sales: 0, profit: 0 };
      grouped[date].sales += Number(s.salePrice || 0);
      grouped[date].profit += Number(s.profit || 0);
    });
    return Object.values(grouped).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  const dailyChartData = groupByDate(dailySales);
  const allChartData = groupByDate(filteredSales);

  return (
    <div className="p-6 space-y-6 text-white">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
        📊 Sales Analytics
      </h1>

      {/* Tabs */}
      <div className="flex mb-4 space-x-3">
        {["daily", "all"].map((tab) => (
          <button
            key={tab}
            className={`px-5 py-2 rounded-lg font-medium transition-all backdrop-blur-xl ${
              activeTab === tab
                ? "bg-white/20 text-white shadow-lg border border-white/20"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "daily" ? "Daily Sales" : "All Sales"}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="backdrop-blur-2xl bg-white/10 rounded-xl p-4 text-center border border-white/10">
          <p className="text-gray-300">Total Sales</p>
          <h2 className="text-xl font-bold text-blue-400">
            Rs {activeTab === "daily" ? dailyTotals.totalSales : allTotals.totalSales}
          </h2>
        </div>
        <div className="backdrop-blur-2xl bg-white/10 rounded-xl p-4 text-center border border-white/10">
          <p className="text-gray-300">Total Profit</p>
          <h2 className="text-xl font-bold text-green-400">
            Rs {activeTab === "daily" ? dailyTotals.totalProfit : allTotals.totalProfit}
          </h2>
        </div>
      </div>

      {/* 🔍 Search */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="🔍 Search by Product or IMEI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-md text-white w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Data Table */}
      <div className="backdrop-blur-2xl bg-white/10 p-4 rounded-xl border border-white/10 shadow-xl overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3">
          {activeTab === "daily" ? "Today's Sales" : "All Sales"}
        </h2>
        <table className="w-full border-collapse text-sm text-gray-200">
          <thead>
            <tr className="bg-white/10 text-gray-300">
              <th className="border border-white/10 p-2">Product</th>
              <th className="border border-white/10 p-2">IMEI</th>
              <th className="border border-white/10 p-2">Cost Price</th>
              <th className="border border-white/10 p-2">Sale Price</th>
              <th className="border border-white/10 p-2">Profit</th>
              <th className="border border-white/10 p-2">Date</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === "daily" ? dailySales : filteredSales).map((s, i) => (
              <tr
                key={s.id}
                className={`${
                  i % 2 === 0 ? "bg-white/5" : "bg-white/0"
                } hover:bg-white/20 transition`}
              >
                <td className="border border-white/10 p-2">{s.product || "N/A"}</td>
                <td className="border border-white/10 p-2">{s.imei || "N/A"}</td>
                <td className="border border-white/10 p-2">Rs {s.costPrice || 0}</td>
                <td className="border border-white/10 p-2 text-blue-400">Rs {s.salePrice || 0}</td>
                <td className="border border-white/10 p-2 text-green-400">Rs {s.profit || 0}</td>
                <td className="border border-white/10 p-2">
                  {s.date ? new Date(s.date).toLocaleString() : "N/A"}
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => deleteSale(s.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📊 Chart */}
      <div className="h-96 backdrop-blur-2xl bg-white/10 p-4 rounded-xl border border-white/10 shadow-xl">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeTab === "daily" ? dailyChartData : allChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#555" />
            <XAxis dataKey="date" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip contentStyle={{ backgroundColor: "#111", border: "none" }} />
            <Legend />
            <Bar dataKey="sales" fill="#60a5fa" barSize={40} radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ⬇ Export */}
      <div className="mt-6 flex justify-end">
        <CSVLink
          data={activeTab === "daily" ? dailySales : filteredSales}
          filename={activeTab === "daily" ? "daily_sales.csv" : "all_sales.csv"}
          className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          ⬇ Export CSV
        </CSVLink>
      </div>
    </div>
  );
};

export default AnalyticsPage;
