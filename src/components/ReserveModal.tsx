"use client";

import { useState } from "react";

interface StockInfo {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  available: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string | null;
  stock: StockInfo[];
}

interface Props {
  product: Product;
  onClose: () => void;
  onReserved: (reservationId: string) => void;
  onError: (message: string) => void;
}

export default function ReserveModal({ product, onClose, onReserved, onError }: Props) {
  const availableStock = product.stock.filter((s) => s.available > 0);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    availableStock[0]?.warehouseId ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const selectedStock = availableStock.find((s) => s.warehouseId === selectedWarehouseId);
  const maxQty = Math.min(selectedStock?.available ?? 1, 10);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  const handleReserve = async () => {
    if (!selectedWarehouseId || loading) return;
    setLoading(true);
    try {
      const idempotencyKey = `reserve-${product.id}-${selectedWarehouseId}-${Date.now()}`;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          onError(`Not enough stock available. ${data.error}`);
        } else if (res.status === 429) {
          onError("Too many people are checking out this item right now. Please try again.");
        } else {
          onError(data.error ?? "Failed to create reservation.");
        }
        return;
      }

      onReserved(data.id);
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.15s ease",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: "100%", maxWidth: 440, padding: 28,
          animation: "slideUp 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
              {product.sku}
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, marginTop: -4, marginRight: -4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Warehouse Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.04em", display: "block", marginBottom: 8 }}>
            SHIP FROM
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {availableStock.map((s) => (
              <label
                key={s.warehouseId}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${selectedWarehouseId === s.warehouseId ? "var(--accent-border)" : "var(--border)"}`,
                  background: selectedWarehouseId === s.warehouseId ? "var(--accent-dim)" : "var(--bg-elevated)",
                  transition: "all 0.1s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="radio"
                    name="warehouse"
                    value={s.warehouseId}
                    checked={selectedWarehouseId === s.warehouseId}
                    onChange={() => { setSelectedWarehouseId(s.warehouseId); setQuantity(1); }}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{s.warehouseName}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.warehouseLocation}</p>
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, fontFamily: "var(--font-display)",
                  color: s.available <= 3 ? "var(--warning)" : "var(--success)",
                }}>
                  {s.available} avail
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Quantity Selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", fontFamily: "var(--font-display)", letterSpacing: "0.04em", display: "block", marginBottom: 8 }}>
            QUANTITY
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                cursor: quantity <= 1 ? "not-allowed" : "pointer", color: "var(--text-primary)",
                fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: quantity <= 1 ? 0.4 : 1,
              }}
            >−</button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, minWidth: 24, textAlign: "center" }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                cursor: quantity >= maxQty ? "not-allowed" : "pointer", color: "var(--text-primary)",
                fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: quantity >= maxQty ? 0.4 : 1,
              }}
            >+</button>
          </div>
        </div>

        {/* Info */}
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          marginBottom: 20, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Items are held for <strong style={{ color: "var(--text-primary)" }}>10 minutes</strong>. You must complete payment before the timer expires.
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Total</p>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              {formatPrice(product.price * quantity)}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={handleReserve}
            disabled={loading || !selectedWarehouseId}
            style={{ padding: "12px 24px", fontSize: 15 }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                  </path>
                </svg>
                Reserving...
              </span>
            ) : "Reserve Now"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
