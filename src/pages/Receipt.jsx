import React from "react";
import { createRoot } from "react-dom/client";

export default function Receipt({ items, branch, logo }) {
  // Compute totals
  const phoneTotal = items
    .filter((i) => i.category === "Phone")
    .reduce((sum, i) => sum + i.salePrice * (i.quantity || 1), 0);

  const accessoryTotal = items
    .filter((i) => i.category === "Accessory")
    .reduce((sum, i) => sum + i.salePrice * (i.quantity || 1), 0);

  const grandTotal = phoneTotal + accessoryTotal;

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
        fontSize: 14,
        color: "#111",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
	{logo && (
          <img src={logo} alt="Branch Logo" style={{ height: 48, objectFit: "contain" }} />
        )}
        <h1 style={{ margin: 0, color: "#2563eb" }}> {branch}</h1>
        <p style={{ margin: 0 }}>Date: {new Date().toLocaleString()}</p>
        <hr style={{ margin: "10px 0", borderColor: "#ccc" }} />
      </div>

      {/* Items Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 20,
        }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Category</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Model</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>IMEI</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Qty</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Price (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr
              key={idx}
              style={{
                background: idx % 2 === 0 ? "#fff" : "#f9f9f9",
              }}
            >
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {i.category}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{i.model}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {i.imei || "N/A"}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {i.quantity || 1}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                Rs.{(i.salePrice * (i.quantity || 1)).toLocaleString()}
              </td>
            </tr>
          ))}

          {/* Totals */}
          <tr style={{ background: "#fef9c3", fontWeight: "bold" }}>
            <td colSpan={4} style={{ border: "1px solid #ccc", padding: 8 }}>
              📱 Phones Total
            </td>
            <td style={{ border: "1px solid #ccc", padding: 8 }}>
              Rs.{phoneTotal.toLocaleString()}
            </td>
          </tr>
          <tr style={{ background: "#d1fae5", fontWeight: "bold" }}>
            <td colSpan={4} style={{ border: "1px solid #ccc", padding: 8 }}>
              🎧 Accessories Total
            </td>
            <td style={{ border: "1px solid #ccc", padding: 8 }}>
              Rs.{accessoryTotal.toLocaleString()}
            </td>
          </tr>
          <tr style={{ background: "#e0f7fa", fontWeight: "bold" }}>
            <td colSpan={4} style={{ border: "1px solid #ccc", padding: 8 }}>
              Grand Total
            </td>
            <td style={{ border: "1px solid #ccc", padding: 8 }}>
              Rs.{grandTotal.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer / Policies */}
      <div style={{ marginTop: 20, fontSize: 12, lineHeight: 1.4 }}>
        <div style={{ marginTop: 15, fontSize: 12, lineHeight: 1.4 }}>
          <br />
          <p>
            🔹 Please verify all accessories, IMEI, and device condition at the
            counter. No claims accepted after leaving the shop.
          </p>
          <p>🔹 Warranty only covers display, camera, and battery check on spot.</p>
          <p>
            🔹 Warranty claims are valid only if original packaging and invoice are
            retained.
          </p>
        </div>
        <p style={{ margin: "5px 0" }}>🔹 Thank you for shopping!</p>
        <p
          style={{
            marginTop: 10,
            fontStyle: "italic",
            color: "#555",
            textAlign: "right",
          }}
        >
          <br />
          <br />
          Powered by Maks POS
        </p>
      </div>
    </div>
  );
}

// ✅ Utility to show receipt in a new window
Receipt.show = (items, branch, logo) => {
  const win = window.open("", "_blank");
  const container = win.document.createElement("div");
  win.document.body.style.margin = "0";
  win.document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<Receipt items={items} branch={branch} logo={logo} />);

  setTimeout(() => win.print(), 200);
};