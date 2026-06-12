// lib/genlayer.js
// Reads + writes against PRIMARY contracts via genlayer-js on Bradbury.
// Client setup matched to the proven wc-predict-web/lib/contract.js pattern.

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

// ── Deployed contract addresses (Bradbury, chain 4221) ──────────────────
export const REGISTRY_ADDRESS = "0x3637B1f271d891332845eD200E5bB21C52FbC2DB";
export const REPUTATION_ADDRESS = "0x0d732F756a8dB3FD3bdE4e5F62E75414781A5aed";

// Submission bond: 0.1 GEN in wei
export const SUBMISSION_BOND = 10n ** 17n;

// ── Read-only client (no account — matches working pattern) ─────────────
let _readClient = null;
function readClient() {
  if (_readClient) return _readClient;
  _readClient = createClient({ chain: testnetBradbury });
  return _readClient;
}

// ── Wallet provider: OKX primary, MetaMask fallback ─────────────────────
export function getProvider() {
  if (typeof window === "undefined") return null;
  if (window.okxwallet) return window.okxwallet;
  return window.ethereum;
}

async function writeClient() {
  const provider = getProvider();
  if (!provider) throw new Error("No wallet provider available.");
  const accounts = await provider.request({ method: "eth_accounts" });
  const addr = accounts?.[0];
  if (!addr) throw new Error("Wallet not connected.");
  return createClient({
    chain: testnetBradbury,
    account: addr,
    transport: { type: "custom", provider },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────
const ONE_GEN = 10n ** 18n;
export function toWei(genAmount) {
  const [whole, frac = ""] = String(genAmount).split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * ONE_GEN + BigInt(fracPadded || "0");
}

// ── Reads (each wrapped, safe fallback — never crashes the UI) ──────────
export async function listAll() {
  try {
    const c = readClient();
    const result = await c.readContract({
      address: REGISTRY_ADDRESS,
      functionName: "list_all",
      args: [],
    });
    return result || [];
  } catch (e) {
    console.warn("listAll error:", e.message);
    return [];
  }
}

export async function getCount() {
  try {
    const c = readClient();
    const result = await c.readContract({
      address: REGISTRY_ADDRESS,
      functionName: "count",
      args: [],
    });
    return BigInt(result ?? 0);
  } catch (e) {
    console.warn("getCount error:", e.message);
    return 0n;
  }
}

export async function getTips(oppId) {
  try {
    const c = readClient();
    const result = await c.readContract({
      address: REGISTRY_ADDRESS,
      functionName: "get_tips",
      args: [oppId],
    });
    return result || [];
  } catch (e) {
    console.warn("getTips error:", e.message);
    return [];
  }
}

export async function getReputation(address) {
  try {
    const c = readClient();
    const result = await c.readContract({
      address: REPUTATION_ADDRESS,
      functionName: "get_reputation",
      args: [address],
    });
    return BigInt(result ?? 0);
  } catch (e) {
    console.warn("getReputation error:", e.message);
    return 0n;
  }
}

// ── Writes (wallet required) ────────────────────────────────────────────
export async function submitOpportunity(opp) {
  const c = await writeClient();
  const hash = await c.writeContract({
    address: REGISTRY_ADDRESS,
    functionName: "submit_opportunity",
    args: [
      opp.opp_id,
      opp.name,
      opp.type,
      opp.continent,
      opp.country,
      opp.flag_emoji,
      opp.source_url,
      opp.status_hint || "open",
    ],
    value: SUBMISSION_BOND,
  });
  return hash;
}

export async function vouch(oppId) {
  const c = await writeClient();
  return c.writeContract({
    address: REGISTRY_ADDRESS,
    functionName: "vouch",
    args: [oppId],
  });
}

export async function flag(oppId, reason) {
  const c = await writeClient();
  return c.writeContract({
    address: REGISTRY_ADDRESS,
    functionName: "flag",
    args: [oppId, reason],
  });
}

export async function addTip(oppId, jurisdiction, content) {
  const c = await writeClient();
  return c.writeContract({
    address: REGISTRY_ADDRESS,
    functionName: "add_tip",
    args: [oppId, jurisdiction, content],
  });
}

export async function addToWatchlist(oppId) {
  const c = await writeClient();
  return c.writeContract({
    address: REGISTRY_ADDRESS,
    functionName: "add_to_watchlist",
    args: [oppId],
  });
}
