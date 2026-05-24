"use client";

 export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";

interface Reservation {
  id: string;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  quantity: number;
  expiresAt: string;
  confirmedAt?: string;
  releasedAt?: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl?: string;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const isExpired = remaining === 0 && expiresAt !== null && new Date(expiresAt).getTime() < Date.now();
  const isCritical = remaining < 60000 && remaining > 0;

  return { minutes, seconds, remaining, isExpired, isCritical };
}

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"confirm" | "cancel" | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [finalState, setFinalState] = useState<"confirmed" | "cancelled" | null>(null);
  const confirmIdempotencyKey = useRef(`confirm-${id}-${Date.now()}`);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setReservation(data);
      if (data.status === "CONFIRMED") setFinalState("confirmed");
      if (data.status === "RELEASED") setFinalState("cancelled");
    } catch {
      setToast({ message: "Could not load reservation.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const { minutes, seconds, isExpired, isCritical } = useCountdown(
    reservation?.status === "PENDING" ? reservation.expiresAt : null
  );

  // Auto-handle expiry
  useEffect(() => {
    if (isExpired && reservation?.status === "PENDING") {
      setFinalState("cancelled");
      setToast({ message: "Your reservation expired. The items have been returned to stock.", type: "info" });
    }
  }, [isExpired, reservation?.status]);

  const handleConfirm = async () => {
    if (!reservation || actionLoading) return;
    setActionLoading("confirm");
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": confirmIdempotencyKey.current,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setFinalState("cancelled");
          setToast({ message: "Reservation expired before confirmation.", type: "error" });
        } else {
          setToast({ message: data.error || "Failed to confirm.", type: "error" });
        }
        return;
      }
      setFinalState("confirmed");
      setReservation((r) => r ? { ...r, status: "CONFIRMED" } : r);
      setToast({ message: "Order confirmed! Thank you for your purchase.", type: "success" });
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!reservation || actionLoading) return;
    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || "Failed to cancel.", type: "error" });
        return;
      }
      setFinalState("cancelled");
      setReservation((r) => r ? { ...r, status: "RELEASED" } : r);
      setToast({ message: "Reservation cancelled. Items returned to stock.", type: "info" });
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontFamily: "var(--font-body)", fontSize: 14 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to catalog
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
              Checkout
            </span>
          </div>
          <div style={{ width: 100 }} />
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
        {loading ? (
          <div className="card" style={{ padding: 32 }}>
            <div style={{ height: 24, background: "var(--bg-elevated)", borderRadius: 4, width: "60%", marginBottom: 16 }} />
            <div style={{ height: 16, background: "var(--bg-elevated)", borderRadius: 4, width: "40%", marginBottom: 10 }} />
            <div style={{ height: 16, background: "var(--bg-elevated)", borderRadius: 4, width: "50%" }} />
          </div>
        ) : !reservation ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)" }}>Reservation not found.</p>
            <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push("/")}>
              Return to catalog
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status Banner */}
            {finalState === "confirmed" && (
              <div style={{
                padding: "16px 20px", borderRadius: 12,
                background: "var(--success-dim)", border: "1px solid rgba(77,255,145,0.3)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--success)", fontSize: 14 }}>Order Confirmed</p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Your purchase is complete. Check your email for details.</p>
                </div>
              </div>
            )}

            {finalState === "cancelled" && (
              <div style={{
                padding: "16px 20px", borderRadius: 12,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", fontSize: 14 }}>Reservation {isExpired ? "Expired" : "Cancelled"}</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Items have been returned to stock.</p>
                </div>
              </div>
            )}

            {/* Countdown Timer (only when pending) */}
            {reservation.status === "PENDING" && !finalState && (
              <div className="card" style={{
                padding: "20px 24px",
                background: isCritical ? "rgba(255,77,77,0.06)" : "var(--accent-dim)",
                border: `1px solid ${isCritical ? "rgba(255,77,77,0.3)" : "var(--accent-border)"}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <p style={{
                    fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: isCritical ? "var(--danger)" : "var(--accent)", marginBottom: 4,
                  }}>
                    {isCritical ? "⚡ Expiring soon" : "Time remaining"}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Complete your purchase before time runs out
                  </p>
                </div>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: isCritical ? "var(--danger)" : "var(--accent)",
                  minWidth: 90, textAlign: "right",
                }}>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>
              </div>
            )}

            {/* Reservation Details */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginBottom: 20, letterSpacing: "-0.02em" }}>
                Order Summary
              </h2>

              <div style={{ display: "flex", gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
                {reservation.product.imageUrl && (
                  <div style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", background: "var(--bg-elevated)", flexShrink: 0 }}>
                    <img src={reservation.product.imageUrl} alt={reservation.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                    {reservation.product.sku}
                  </p>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                    {reservation.product.name}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                    {reservation.warehouse.name} · {reservation.warehouse.location}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Quantity", `${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}`],
                  ["Unit price", formatPrice(reservation.product.price)],
                  ["Reservation ID", reservation.id.slice(0, 12) + "..."],
                  ["Status", reservation.status],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{label}</span>
                    <span style={{
                      fontSize: 14, fontWeight: 500, color: "var(--text-primary)",
                      fontFamily: label === "Reservation ID" ? "monospace" : "var(--font-body)",
                    }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "var(--accent)" }}>
                  {formatPrice(reservation.product.price * reservation.quantity)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {!finalState && reservation.status === "PENDING" && (
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn-danger"
                  style={{ flex: 1, padding: "12px 24px" }}
                  onClick={handleCancel}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "cancel" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Spinner /> Cancelling...
                    </span>
                  ) : "Cancel"}
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 2, padding: "12px 24px", fontSize: 15 }}
                  onClick={handleConfirm}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "confirm" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Spinner color="#000" /> Confirming...
                    </span>
                  ) : "Confirm Purchase"}
                </button>
              </div>
            )}

            {finalState && (
              <button className="btn-ghost" style={{ width: "100%", padding: "12px" }} onClick={() => router.push("/")}>
                Return to Catalog
              </button>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Spinner({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
