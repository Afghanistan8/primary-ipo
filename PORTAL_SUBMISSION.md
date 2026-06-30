# Portal Submission Notes — PRIMARY

> Response to reviewer feedback (Joaquin, Jun 29 2026).

## Reviewer feedback → addressed

### 1. "Please add your contract file to the repo"

The contracts now live in [`/contracts/`](./contracts) at the root of this repo:

- [`contracts/opportunity_registry.py`](./contracts/opportunity_registry.py) — the main intelligent contract: payable `submit_opportunity` with on-chain Equivalence Principle, plus `vouch`, `flag`, `add_tip`, `add_to_watchlist`, and a full set of public views.
- [`contracts/reputation_ledger.py`](./contracts/reputation_ledger.py) — a separate contract tracking per-user reputation scores. Deployed and linked.

Both are the actual sources of the deployed contracts on Bradbury (chain 4221):

| Contract | Address |
| --- | --- |
| `OpportunityRegistry` | [`0x3637B1f271d891332845eD200E5bB21C52FbC2DB`](https://explorer-bradbury.genlayer.com/address/0x3637B1f271d891332845eD200E5bB21C52FbC2DB) |
| `ReputationLedger` | [`0x0d732F756a8dB3FD3bdE4e5F62E75414781A5aed`](https://explorer-bradbury.genlayer.com/address/0x0d732F756a8dB3FD3bdE4e5F62E75414781A5aed) |

### 2. "The site isn't really interactive it just displays data"

True for the version reviewed — fixed in this update. The earlier read-only build has been replaced. Live at **https://primary-ipo.vercel.app**, anyone can now:

- **Connect a wallet** (OKX or MetaMask, RainbowKit-style modal)
- **Submit a new opportunity** — opens a form, sends a 0.1 GEN bond, triggers the on-chain Equivalence Principle
- **Vouch** for an entry (builds your on-chain reputation)
- **Flag** an entry as outdated, wrong, or suspicious
- **Watchlist** an entry to your wallet address

Each of these is a real GenLayer write that the validators process. The `+ Submit` flow in particular exercises the full intelligent-contract stack: payable bond, web access, LLM consensus, EP.

### 3. "Please can you build it in a way that it can be used by everyone"

Same fix as #2. The submit flow is now open to any wallet, not admin-only. The framing is explicit throughout: this is for *contributing* opportunities to the registry, not for buying shares (which the app doesn't and can't do — that always happens through the linked broker/platform).

A user's journey:

1. Lands on the site → sees the public verified feed
2. Sees an opportunity they care about → clicks a "Where to participate" link → goes to the real broker
3. Spots an opportunity that's missing → clicks **+ Submit** → fills in name, country, type, source URL → pays the 0.1 GEN bond → validators verify → entry appears for everyone

The submit copy explains exactly what the bond does: *refunded if validators verify the entry, otherwise kept by the contract.*

## What a reviewer should do to verify

1. **Visit the live site** → see the existing verified-on-chain entries (Dangote, SpaceX) with green ✓ badges.
2. **Click "+ Submit"** → triggers wallet connect.
3. **Connect OKX or MetaMask** (you'll need testnet GEN from the Bradbury faucet).
4. **Submit a real opportunity** — e.g. name: `Klarna`, type: `IPO`, continent: `Europe`, country: `Sweden`, flag: `SE`, source URL: `https://en.wikipedia.org/wiki/Klarna`.
5. **Watch the toast** — "Submitting + running validator consensus (60–180s)…". The receipt updates when 5 validators reach consensus.
6. **Refresh** — your entry now appears in the Europe tab, either VERIFIED or unverified depending on what the LLM consensus decided.

## On the Revolut case (an honest note)

When we tested with a Revolut Wikipedia URL, the validators **REJECTED** it — correctly, because Revolut's IPO is 2027–2028 and the Wikipedia page doesn't substantiate an active opportunity *today*. This is the system working as intended: AI consensus said "not enough evidence," and the entry was not stamped verified. The same will happen for any submission whose source doesn't actually support the claim. The bond stays with the contract in those cases.

Dangote and SpaceX submissions both came back **VERIFIED** because their Wikipedia pages clearly substantiate active primary-market activity.

## GenLayer surfaces actually exercised

Every surface listed in the main README is exercised by the submit flow. The screenshot of any successful submit transaction on Bradbury explorer shows:

- `txExecutionResultName: FINISHED_WITH_RETURN`
- `eqBlocksOutputs` decoding to `VERIFIED` or `REJECTED`
- 5 validators voting AGREE
- A state change incrementing the registry count

Reference transactions for verification:
- Dangote submission (VERIFIED): `0x4dcd90421f99aea3e0d18f805dfbe0faf3fc6607678bf9d997840d4b273e0e6b`
- SpaceX submission (VERIFIED): `0x9b4418339839774e722407dc7aa6808a830f7d65bcbb045c3581e371abf70a4b`
- Revolut submission (REJECTED — working as designed): `0x4e3d7dcfb2ab4c5c438f44d4201681d91923419e6e2119d3373db8888191b40c`

All viewable on [Bradbury Explorer](https://explorer-bradbury.genlayer.com/).
