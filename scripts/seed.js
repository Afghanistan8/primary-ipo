// scripts/seed.js
//
// Local seed script for PRIMARY. Reads opportunities from seed-data.json
// and submits each one to the on-chain OpportunityRegistry, signing with
// the deployer's private key. Each submission triggers the full GenLayer
// Equivalence Principle: validators fetch the source URL, an LLM checks
// the claim, and consensus stamps the entry VERIFIED or REJECTED.
//
// Run:
//   cd "$env:USERPROFILE\Desktop\IPO Build\frontend"
//   node --env-file=.env scripts/seed.js
//
// Required env var in .env:
//   DEPLOYER_PRIVATE_KEY=0x...      (the primary-deployer account's key)

import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const REGISTRY = "0x3637B1f271d891332845eD200E5bB21C52FbC2DB";
const BOND_WEI = 10n ** 17n;                  // 0.1 GEN per submission
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "seed-data.json");

function log(msg) {
  process.stdout.write(`${new Date().toISOString().slice(11, 19)}  ${msg}\n`);
}

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("Missing DEPLOYER_PRIVATE_KEY in .env");
    console.error("Create frontend/.env with:");
    console.error("  DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE");
    process.exit(1);
  }

  const entries = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error("seed-data.json must contain a non-empty array.");
    process.exit(1);
  }

  const account = createAccount(pk);
  const client = createClient({ chain: testnetBradbury, account });

  log(`Registry: ${REGISTRY}`);
  log(`Submitter: ${account.address}`);
  log(`Entries to seed: ${entries.length}`);
  log(`Bond per entry: 0.1 GEN  (refundable on VERIFIED)\n`);

  let verified = 0;
  let rejected = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const o = entries[i];
    const tag = `[${i + 1}/${entries.length}] ${o.opp_id}`;

    // Basic shape check
    const required = ["opp_id", "name", "type", "continent", "country", "flag_emoji", "source_url", "status_hint"];
    const missing = required.filter((k) => !o[k]);
    if (missing.length) {
      log(`${tag}  ✗ skipped — missing fields: ${missing.join(", ")}`);
      skipped++;
      continue;
    }

    log(`${tag}  submitting...`);

    let hash;
    try {
      hash = await client.writeContract({
        address: REGISTRY,
        functionName: "submit_opportunity",
        args: [
          o.opp_id, o.name, o.type, o.continent,
          o.country, o.flag_emoji, o.source_url, o.status_hint,
        ],
        value: BOND_WEI,
      });
    } catch (e) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("already exists")) {
        log(`${tag}  · already on chain, skipping`);
        skipped++;
        continue;
      }
      log(`${tag}  ✗ submit failed: ${e?.message || e}`);
      failed++;
      continue;
    }

    log(`${tag}  tx ${hash}`);
    log(`${tag}  waiting for validator consensus (60–120s)...`);

    try {
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 60,
        interval: 5000,
      });
      const verdict =
        receipt?.data?.execution_result?.return_value ??
        receipt?.consensus_data?.leader_receipt?.[0]?.result ??
        "unknown";
      const verdictStr = String(verdict).toUpperCase();
      if (verdictStr.includes("VERIFIED")) {
        log(`${tag}  ✓ VERIFIED\n`);
        verified++;
      } else if (verdictStr.includes("REJECTED")) {
        log(`${tag}  ✗ REJECTED by validators\n`);
        rejected++;
      } else {
        log(`${tag}  · landed (verdict unclear: ${verdictStr})\n`);
        verified++;
      }
    } catch (e) {
      log(`${tag}  ✗ receipt wait failed: ${e?.message || e}\n`);
      failed++;
    }
  }

  log("───────────────────────────────────────────────");
  log(`Verified: ${verified}   Rejected: ${rejected}   Skipped: ${skipped}   Failed: ${failed}`);
  log(`Explorer: https://explorer-bradbury.genlayer.com/address/${REGISTRY}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
