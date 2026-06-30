# PRIMARY — AI-Validated Primary Market Registry

A community-curated, AI-validated registry of primary-market opportunities (IPOs, private placements, crypto token sales) across 5 continents, built on **GenLayer Bradbury testnet**.

**Live app:** https://primary-ipo.vercel.app

> Anyone with a wallet can submit a new opportunity. GenLayer validators independently fetch the cited source URL, an LLM judges whether the claim is supported, and 5 validators must reach consensus before the entry is stamped **VERIFIED** on-chain.

---

## Why GenLayer

A normal database can hold a list of opportunities. What it *can't* do is verify them without a trusted curator. PRIMARY uses GenLayer's **Equivalence Principle + LLM consensus** to let any user contribute, and let the AI validators decide if the submission holds up against its source. No single curator, no trust assumption.

## Deployed Contracts (Bradbury · chain 4221)

| Contract | Address | Explorer |
| -------- | ------- | -------- |
| `OpportunityRegistry` | `0x3637B1f271d891332845eD200E5bB21C52FbC2DB` | [view](https://explorer-bradbury.genlayer.com/address/0x3637B1f271d891332845eD200E5bB21C52FbC2DB) |
| `ReputationLedger` | `0x0d732F756a8dB3FD3bdE4e5F62E75414781A5aed` | [view](https://explorer-bradbury.genlayer.com/address/0x0d732F756a8dB3FD3bdE4e5F62E75414781A5aed) |

Source: [`contracts/opportunity_registry.py`](./contracts/opportunity_registry.py) · [`contracts/reputation_ledger.py`](./contracts/reputation_ledger.py)

## How a Submission Works

1. User connects an EVM wallet (OKX or MetaMask) and posts a **0.1 GEN bond** with `submit_opportunity()`.
2. The contract enters its `_validate()` function, which wraps a call inside `gl.eq_principle.strict_eq`.
3. Each of 5 GenLayer validators independently:
   - Fetches the source URL via `gl.nondet.web.render(url, mode="text")`
   - Sends a structured prompt to an LLM via `gl.nondet.exec_prompt(...)`
   - Returns `VERIFIED` or `REJECTED`
4. Validators reach consensus. If 5/5 agree the claim is supported → entry is written with `verified=true`, bond refunded.
5. The new entry appears in the public feed with a green verified badge.

## GenLayer Surface Coverage

| Surface | Where it's used |
| ------- | --------------- |
| `@gl.public.view` | `list_all`, `list_by_continent`, `list_by_category`, `get_opportunity`, `get_tips`, `is_watched`, `count` |
| `@gl.public.write` | `vouch`, `flag`, `add_tip`, `add_to_watchlist`, `set_authorized_caller` |
| `@gl.public.write.payable` | `submit_opportunity` (carries the bond) |
| Equivalence Principle | `gl.eq_principle.strict_eq(check)` inside `_validate` |
| Web access | `gl.nondet.web.render(source_url, mode="text")` |
| LLM consensus | `gl.nondet.exec_prompt(task)` |
| Storage | `TreeMap[str, Opportunity]`, `DynArray[str]`, composite-key membership maps |
| Value / bonds | `gl.message.value`, payable bond logic |
| Transaction context | `gl.message.sender_address` |
| Error handling | `raise gl.vm.UserError(...)` for input validation |
| Special methods | `__init__(reputation_ledger: Address)` |
| Multi-contract architecture | `OpportunityRegistry` + `ReputationLedger` (cross-call wiring deferred to a follow-up) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + Tailwind, deployed to Vercel)              │
│  primary-ipo.vercel.app                                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                          genlayer-js@1.1.8
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Bradbury Testnet RPC  (rpc-bradbury.genlayer.com, chain 4221)     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OpportunityRegistry (intelligent contract)                         │
│    submit_opportunity()  →  _validate()                            │
│                              │                                      │
│                              ▼                                      │
│                       gl.eq_principle.strict_eq(...)               │
│                              │                                      │
│            ┌─────────────────┼─────────────────┐                   │
│            ▼                 ▼                 ▼                   │
│    Validator 1          Validator 2 ...   Validator 5              │
│  gl.nondet.web.render     ...                ...                   │
│  gl.nondet.exec_prompt     ...                ...                   │
│            └─────────────────┴─────────────────┘                   │
│                              │                                      │
│                              ▼                                      │
│                     consensus → write state                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Repository Layout

```
.
├── contracts/                       # Python intelligent contracts
│   ├── opportunity_registry.py      # main registry — submit, vouch, flag, etc.
│   └── reputation_ledger.py         # per-user reputation scores
├── frontend/                        # Next.js app
│   ├── app/                         # App Router pages
│   ├── components/
│   │   ├── PrimaryApp.jsx           # main UI
│   │   └── WalletConnect.jsx        # RainbowKit-style connect modal
│   ├── lib/genlayer.js              # contract client + read/write helpers
│   └── scripts/
│       ├── seed.js                  # admin batch-submit script
│       └── seed-data.json           # seed opportunities (Dangote, SpaceX, …)
├── PORTAL_SUBMISSION.md             # Builder Program submission notes
└── README.md
```

## Running Locally

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

To submit new opportunities as the admin (sends the 0.1 GEN bond and triggers the EP):

```bash
# Set DEPLOYER_PRIVATE_KEY=0x... in frontend/.env
node --env-file=.env scripts/seed.js
```

## Working Patterns (Notes for Other Builders)

A few non-obvious things learned during this build that may help others:

- **`Depends` tag must be the content-hash form**, not `py-genlayer:test`. The latter resolves to a non-runnable runtime on Bradbury.
- **DynArrays can only exist as storage**, never instantiated locally. Views must return plain Python `list`. Nested `TreeMap[K, DynArray[V]]` is fragile; prefer composite-key TreeMaps.
- **`raise gl.vm.UserError(...)`** is the supported error path (not `gl.rollback_immediate`).
- **Web access is `gl.nondet.web.render(url, mode="text")`** — JS-heavy or geo-blocked pages cause validator timeouts. Wikipedia and other static HTML sources are most reliable.
- **`@gl.evm.contract_interface` is for EVM contracts only**, not for calling other GenLayer intelligent contracts. The latter uses `gl.get_contract_at(address)`.

## License

MIT — see `LICENSE`.
