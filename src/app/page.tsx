"use client";

import { useEffect, useState } from "react";
import ReserveModal from "@/components/ReserveModal";
import Toast from "@/components/Toast";

interface StockInfo {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  available: number;
  total: number;
  reserved: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: StockInfo[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const totalAvailable = (stock: StockInfo[]) =>
    stock.reduce((sum, s) => sum + s.available, 0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              allo<span style={{ color: "var(--accent)" }}>.</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Inventory
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 32px" }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
            Multi-Warehouse Catalog
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
            Browse & Reserve
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 480, lineHeight: 1.6 }}>
            Items are held for <strong style={{ color: "var(--text-primary)" }}>10 minutes</strong> once reserved. Complete your payment before the timer expires.
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: 20, animation: "pulse 1.5s ease-in-out infinite" }}>
                <div style={{ height: 180, background: "var(--bg-elevated)", borderRadius: 8, marginBottom: 16 }} />
                <div style={{ height: 20, background: "var(--bg-elevated)", borderRadius: 4, marginBottom: 10, width: "70%" }} />
                <div style={{ height: 14, background: "var(--bg-elevated)", borderRadius: 4, width: "50%" }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {products.map((product) => {
              const total = totalAvailable(product.stock);
              const isLow = total > 0 && total <= 3;
              const isOut = total === 0;

              return (
                <div
                  key={product.id}
                  className="card"
                  style={{
                    overflow: "hidden",
                    transition: "border-color 0.15s, transform 0.15s",
                    cursor: isOut ? "default" : "pointer",
                    opacity: isOut ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isOut) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-border)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Image */}
                  <div style={{ position: "relative", height: 180, background: "var(--bg-elevated)", overflow: "hidden" }}>
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    {isLow && !isOut && (
                      <div style={{
                        position: "absolute", top: 10, right: 10,
                        background: "var(--warning-dim)", border: "1px solid rgba(255,170,77,0.35)",
                        borderRadius: 6, padding: "3px 8px",
                        fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 600, color: "var(--warning)",
                        letterSpacing: "0.06em", backdropFilter: "blur(8px)",
                      }}>
                        ONLY {total} LEFT
                      </div>
                    )}
                    {isOut && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(10,10,10,0.7)", backdropFilter: "blur(4px)",
                      }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                          OUT OF STOCK
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: 20 }}>
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                        {product.sku}
                      </p>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                        {product.name}
                      </h3>
                    </div>

                    {product.description && (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {product.description}
                      </p>
                    )}

                    {/* Stock per warehouse */}
                    <div style={{ marginBottom: 16 }}>
                      {product.stock.map((s) => (
                        <div key={s.warehouseId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            {s.warehouseName}
                          </span>
                          <span style={{
                            fontSize: 12, fontWeight: 500, fontFamily: "var(--font-display)",
                            color: s.available === 0 ? "var(--text-muted)" : s.available <= 3 ? "var(--warning)" : "var(--success)",
                          }}>
                            {s.available === 0 ? "—" : `${s.available} avail`}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                        {formatPrice(product.price)}
                      </span>
                      <button
                        className="btn-primary"
                        disabled={isOut}
                        onClick={() => !isOut && setSelectedProduct(product)}
                        style={{ fontSize: 13, padding: "8px 16px" }}
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ReserveModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onReserved={(reservationId) => {
            setSelectedProduct(null);
            window.location.href = `/checkout/${reservationId}`;
          }}
          onError={(msg) => {
            setToast({ message: msg, type: "error" });
            setSelectedProduct(null);
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
