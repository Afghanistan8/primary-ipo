// components/WalletConnect.jsx
// RainbowKit-style connect modal (Installed / Popular sections) wired to
// genlayer-js. OKX primary, MetaMask fallback. No wagmi/RainbowKit dependency
// — keeps the genlayer-js Viem version clean.

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

// ── Hook: wallet state ──────────────────────────────────────────────────
export function useWallet() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);

  // Restore from a previous session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage?.getItem("primary_wallet");
    if (saved) setAddress(saved);
  }, []);

  const connect = useCallback(async (walletId) => {
    setConnecting(true);
    try {
      let provider = null;
      if (walletId === "okx") provider = window.okxwallet;
      else if (walletId === "metamask") provider = window.ethereum;
      else provider = window.okxwallet || window.ethereum;

      if (!provider) {
        const urls = {
          okx: "https://www.okx.com/web3",
          metamask: "https://metamask.io/download/",
        };
        window.open(urls[walletId] || urls.metamask, "_blank");
        return null;
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const acct = accounts?.[0] || null;
      if (acct) {
        setAddress(acct);
        window.sessionStorage?.setItem("primary_wallet", acct);
      }
      return acct;
    } catch (e) {
      console.error("Wallet connect failed:", e);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    window.sessionStorage?.removeItem("primary_wallet");
  }, []);

  return { address, connecting, connect, disconnect };
}

// ── Wallet option rows ──────────────────────────────────────────────────
const INSTALLED = [
  { id: "okx", name: "OKX Wallet", tag: "Recent", check: () => typeof window !== "undefined" && !!window.okxwallet },
  { id: "metamask", name: "MetaMask", check: () => typeof window !== "undefined" && !!window.ethereum },
];
const POPULAR = [
  { id: "metamask", name: "MetaMask" },
  { id: "walletconnect", name: "WalletConnect" },
];

function WalletIcon({ id }) {
  const colors = {
    okx: "#000000",
    metamask: "#E2761B",
    walletconnect: "#3B99FC",
  };
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: colors[id] || "#444",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {id === "okx" ? "OKX" : id === "metamask" ? "🦊" : "WC"}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────
export function WalletModal({ open, onClose, onConnect }) {
  if (!open) return null;

  const installed = INSTALLED.filter((w) => (w.check ? w.check() : true));

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 92vw)",
          minHeight: 480,
          background: "#1A1A1F",
          borderRadius: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          overflow: "hidden",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#fff",
        }}
      >
        {/* Left — wallet list */}
        <div style={{ padding: 28, borderRight: "1px solid #2A2A30" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 28 }}>
            Connect a Wallet
          </h2>

          <div style={{ fontSize: 12, fontWeight: 600, color: "#C97939", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>
            Installed
          </div>
          {installed.map((w) => (
            <button
              key={w.id}
              onClick={() => onConnect(w.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "10px 8px", marginBottom: 6,
                background: "transparent", border: "none", borderRadius: 12,
                cursor: "pointer", color: "#fff", textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#26262C")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <WalletIcon id={w.id} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{w.name}</div>
                {w.tag && <div style={{ fontSize: 13, color: "#C97939" }}>{w.tag}</div>}
              </div>
            </button>
          ))}

          <div style={{ fontSize: 12, fontWeight: 600, color: "#8A8578", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: 1 }}>
            Popular
          </div>
          {POPULAR.map((w) => (
            <button
              key={w.id}
              onClick={() => onConnect(w.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "10px 8px", marginBottom: 6,
                background: "transparent", border: "none", borderRadius: 12,
                cursor: "pointer", color: "#fff", textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#26262C")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <WalletIcon id={w.id} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>{w.name}</div>
            </button>
          ))}
        </div>

        {/* Right — explainer */}
        <div style={{ padding: 28, position: "relative" }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 20, right: 20,
              width: 36, height: 36, borderRadius: "50%",
              background: "#2A2A30", border: "none", cursor: "pointer",
              color: "#999", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>

          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginTop: 30, marginBottom: 40 }}>
            What is a Wallet?
          </h2>

          <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "#26262C", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>💎</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>A Home for your Digital Assets</div>
              <div style={{ fontSize: 14, color: "#999", lineHeight: 1.5 }}>
                Wallets are used to send, receive, store, and display digital assets like GEN and NFTs.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "#26262C", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔑</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>A New Way to Log In</div>
              <div style={{ fontSize: 14, color: "#999", lineHeight: 1.5 }}>
                Instead of creating new accounts and passwords, just connect your wallet.
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 44 }}>
            <button
              onClick={() => window.open("https://www.okx.com/web3", "_blank")}
              style={{
                background: "#C97939", color: "#0B0E12", border: "none",
                padding: "12px 28px", borderRadius: 999, fontSize: 15,
                fontWeight: 700, cursor: "pointer",
              }}
            >
              Get a Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
