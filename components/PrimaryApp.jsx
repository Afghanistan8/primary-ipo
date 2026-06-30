'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  listAll,
  submitOpportunity,
  vouch as vouchTx,
  flag as flagTx,
  addToWatchlist,
} from '../lib/genlayer';
import { useWallet, WalletModal } from './WalletConnect';
import {
  Globe,
  ArrowUpRight,
  AlertTriangle,
  MapPin,
  CalendarDays,
  Building2,
  Coins,
  Briefcase,
  CircleDot,
  Info,
  ShieldCheck,
} from 'lucide-react';

// Convert a stored flag value to a renderable emoji.
// If it's already an emoji, return it. If it's a 2-letter ISO code (e.g. "NG"),
// convert to regional-indicator flag emoji. Falls back to a globe.
function countryToFlag(flag, country) {
  if (!flag) return '🌍';
  // Already an emoji (contains non-ASCII)?
  if (/[^\x00-\x7F]/.test(flag)) return flag;
  // Two-letter code -> regional indicator symbols
  const code = flag.trim().toUpperCase();
  if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
    return String.fromCodePoint(
      ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
  }
  return '🌍';
}


/* -------------------------------------------------------------------------- */
/*  Fonts + tokens                                                            */
/* -------------------------------------------------------------------------- */

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Color+Emoji&display=swap');

  :root {
    --bg: #0B0E12;
    --surface: #141821;
    --surface-2: #1B2029;
    --border: #232A36;
    --border-soft: #1A1F28;
    --ink: #F0E9D8;
    --ink-muted: #8A8578;
    --ink-faint: #5A574E;
    --accent: #C97939;
    --accent-soft: rgba(201,121,57,0.12);
    --live: #7BA672;
  }

  .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; font-variation-settings: 'opsz' 96; letter-spacing: -0.02em; }
  .font-body { font-family: 'Inter', system-ui, sans-serif; }
  .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

  .ticker-strip::-webkit-scrollbar { display: none; }
  .ticker-strip { scrollbar-width: none; }

  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .pulse { animation: pulse-live 2s ease-in-out infinite; }
  .emoji-flag { font-family: 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif; }
`;

/* -------------------------------------------------------------------------- */
/*  Seed data                                                                 */
/* -------------------------------------------------------------------------- */
/*  Real entries (verified=true) come from public filings/news as of Jun 2026 */
/*  Placeholder entries (verified=false) are slots for the scanner pipeline.  */

const OPPORTUNITIES = [
  /* ============== AFRICA ============== */
  {
    id: 'dangote-refinery',
    name: 'Dangote Petroleum Refinery',
    type: 'private',
    continent: 'africa',
    country: 'Nigeria',
    flag: '🇳🇬',
    status: 'open',
    raise: '$1B private placement',
    valuation: '$39.1B (placement) · ~$50B IPO target',
    keyDate: 'Sept 2026 — NGX IPO · LSE dual-list under review',
    summary:
      'Africa\'s largest single-train refinery (650,000 bpd). $1B private placement at $39.1B valuation now open — investor demand has already exceeded $2B, suggesting oversubscription. Pan-African IPO targeting ~$50B valuation expected September 2026 on NGX, potentially Africa\'s largest listing ever.',
    where: [
      { name: 'Stanbic IBTC Capital', role: 'Lead issuing house · international book', region: 'Nigeria + foreign', url: 'https://www.stanbicibtc.com' },
      { name: 'Vetiva Capital', role: 'Issuing house · retail distribution', region: 'Nigeria retail', url: 'https://www.vetiva.com' },
      { name: 'FCMB Capital Markets', role: 'Issuing house · institutional placement', region: 'NG institutional', url: 'https://www.fcmb.com' },
      { name: 'NGX Invest (via Bamboo · Chaka · Trove)', role: 'Retail subscription at IPO', region: 'Nigeria retail', url: 'https://invest.ngxgroup.com' },
      { name: 'Mystocks Africa', role: 'Diaspora NGX access · pre-registration', region: 'International', url: 'https://mystocks.africa/dangote-ipo' },
    ],
    sourceLabel: 'NGX · SEC Nigeria · Bloomberg',
    verified: true,
  },

  /* ============== EUROPE ============== */
  {
    id: 'revolut',
    name: 'Revolut',
    type: 'ipo',
    continent: 'europe',
    country: 'United Kingdom',
    flag: '🇬🇧',
    status: 'upcoming',
    raise: 'IPO TBD · $100B+ secondary H2 2026',
    valuation: '$75B (current) · $150–200B IPO target',
    keyDate: '2027–2028 — NASDAQ preferred over LSE',
    summary:
      'UK fintech with 68M+ retail users. Last valued at $75B (Nov 2025 secondary). CEO Storonsky confirmed April 2026 that IPO is ~2 years away (2027–2028), with NASDAQ preferred over LSE for liquidity. New secondary at $100B+ planned H2 2026. Targeting $150–200B at IPO. 2026 guidance: $9B revenue, $3.5B profit.',
    where: [
      { name: 'Forge Global · EquityZen · Hiive', role: 'Pre-IPO secondary (accredited)', region: 'US accredited investors', url: 'https://forgeglobal.com' },
      { name: 'Robinhood · Fidelity · Charles Schwab', role: 'IPO allocation when filed', region: 'US retail', url: 'https://robinhood.com' },
      { name: 'Trading 212 · eToro · Interactive Brokers', role: 'Post-listing trade', region: 'EU + UK + Global', url: 'https://www.interactivebrokers.com' },
      { name: 'Bamboo · Chaka · Trove', role: 'Buy post-listing in ₦', region: 'Nigeria retail', url: 'https://investbamboo.com' },
    ],
    sourceLabel: 'Bloomberg · FT · TechCrunch',
    verified: true,
  },

  /* ============== NORTH AMERICA ============== */
  {
    id: 'spacex',
    name: 'SpaceX',
    type: 'ipo',
    continent: 'north-america',
    country: 'United States',
    flag: '🇺🇸',
    status: 'open',
    raise: '$75B — largest IPO in history',
    valuation: '$1.75 trillion',
    keyDate: 'TODAY · Jun 12, 2026 — NASDAQ debut as SPCX at $135/share',
    summary:
      'Debuts on NASDAQ today (June 12, 2026) under ticker SPCX at $135/share — largest IPO in market history. 30% of the issue (~$22.5B) allocated to retail, triple the industry norm. Direct retail access in US, UK, EU, Australia, Canada, Japan, South Korea. Nasdaq 100 inclusion expected ~15 days post-listing, forcing $22–27B of mechanical index buying.',
    where: [
      { name: 'Fidelity', role: 'IPO allocation at offer price ($135)', region: 'US retail', url: 'https://www.fidelity.com' },
      { name: 'Robinhood', role: 'IPO allocation at offer price ($135)', region: 'US retail', url: 'https://robinhood.com' },
      { name: 'SoFi', role: 'IPO allocation at offer price ($135)', region: 'US retail', url: 'https://www.sofi.com' },
      { name: 'Charles Schwab', role: 'IPO allocation at offer price ($135)', region: 'US retail', url: 'https://www.schwab.com' },
      { name: 'Interactive Brokers', role: 'Post-listing trade', region: 'Global', url: 'https://www.interactivebrokers.com' },
      { name: 'Trading 212 · eToro', role: 'Post-listing trade · fractional', region: 'UK + EU retail', url: 'https://www.etoro.com' },
      { name: 'Bamboo · Chaka · Trove', role: 'Buy SPCX in ₦ post-listing', region: 'Nigeria retail', url: 'https://investbamboo.com' },
    ],
    sourceLabel: 'Reuters · Nasdaq · SEC EDGAR',
    verified: true,
  },

  /* ============== ASIA ============== */

  /* ============== SOUTH AMERICA ============== */

  /* ============== CRYPTO (global, tagged by issuer region) ============== */
];

const CONTINENTS = [
  { id: 'africa', name: 'Africa' },
  { id: 'asia', name: 'Asia' },
  { id: 'europe', name: 'Europe' },
  { id: 'north-america', name: 'North America' },
  { id: 'south-america', name: 'South America' },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Globe },
  { id: 'ipo', name: 'Traditional IPO', icon: Building2 },
  { id: 'private', name: 'Private Placement', icon: Briefcase },
  { id: 'crypto', name: 'Crypto Sale', icon: Coins },
];

/* -------------------------------------------------------------------------- */
/*  Components                                                                */
/* -------------------------------------------------------------------------- */

function StatusDot({ status }) {
  if (status === 'open') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full pulse"
          style={{ background: 'var(--live)' }}
        />
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--live)' }}>
          Open
        </span>
      </span>
    );
  }
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Upcoming
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink-faint)' }} />
      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
        Closed
      </span>
    </span>
  );
}

function TypePill({ type }) {
  const map = {
    ipo: { label: 'Traditional IPO', icon: Building2 },
    private: { label: 'Private Placement', icon: Briefcase },
    crypto: { label: 'Crypto Sale', icon: Coins },
  };
  const { label, icon: Icon } = map[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm font-mono text-[10px] uppercase tracking-widest"
      style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

function OpportunityCard({ o, onVouch, onFlag, onWatch, txPending }) {
  const isChain = o.sourceLabel && o.sourceLabel.includes('on-chain');
  return (
    <article
      className="relative rounded-sm transition-all hover:translate-y-[-2px]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* DYOR ribbon */}
      <div
        className="absolute top-0 right-0 px-2 py-1 font-mono text-[9px] uppercase tracking-widest"
        style={{ color: 'var(--ink-faint)' }}
      >
        DYOR
      </div>

      <div className="p-5">
        {/* Top meta row */}
        <div className="flex items-center gap-3 mb-4">
          <StatusDot status={o.status} />
          <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>·</span>
          <TypePill type={o.type} />
        </div>

        {/* Name + location */}
        <div className="mb-3">
          <div className="flex items-start gap-3">
            <div
              className="emoji-flag flex items-center justify-center text-2xl leading-none rounded-sm flex-shrink-0"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                width: 44,
                height: 44,
              }}
              aria-label={`Flag of ${o.country}`}
              title={o.country}
            >
              {countryToFlag(o.flag, o.country)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-2xl leading-tight mb-1" style={{ color: 'var(--ink)' }}>
                {o.name}
              </h3>
              <div className="flex items-center gap-2 font-mono text-xs flex-wrap" style={{ color: 'var(--ink-muted)' }}>
                <span style={{ color: 'var(--ink)' }}>{o.country}</span>
                {o.verified && (
                  <>
                    <span style={{ color: 'var(--ink-faint)' }}>·</span>
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--live)' }}>
                      <ShieldCheck size={11} />
                      verified
                    </span>
                  </>
                )}
                {!o.verified && (
                  <>
                    <span style={{ color: 'var(--ink-faint)' }}>·</span>
                    <span style={{ color: 'var(--ink-faint)' }}>placeholder</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--ink-muted)' }}>
          {o.summary}
        </p>

        {/* Data grid */}
        <div
          className="grid grid-cols-2 gap-px mb-5 rounded-sm overflow-hidden"
          style={{ background: 'var(--border-soft)' }}
        >
          <div className="p-3" style={{ background: 'var(--surface)' }}>
            <div
              className="font-mono text-[9px] uppercase tracking-widest mb-1"
              style={{ color: 'var(--ink-faint)' }}
            >
              Raise
            </div>
            <div className="font-mono text-sm" style={{ color: 'var(--ink)' }}>
              {o.raise}
            </div>
          </div>
          <div className="p-3" style={{ background: 'var(--surface)' }}>
            <div
              className="font-mono text-[9px] uppercase tracking-widest mb-1"
              style={{ color: 'var(--ink-faint)' }}
            >
              Valuation
            </div>
            <div className="font-mono text-sm" style={{ color: 'var(--ink)' }}>
              {o.valuation}
            </div>
          </div>
          <div className="p-3 col-span-2" style={{ background: 'var(--surface)' }}>
            <div
              className="font-mono text-[9px] uppercase tracking-widest mb-1 flex items-center gap-1.5"
              style={{ color: 'var(--ink-faint)' }}
            >
              <CalendarDays size={10} />
              Key date
            </div>
            <div className="font-mono text-sm" style={{ color: 'var(--ink)' }}>
              {o.keyDate}
            </div>
          </div>
        </div>

        {/* Where to participate */}
        <div className="mb-4">
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--accent)' }}
          >
            <MapPin size={11} />
            Where to participate
          </div>
          <ul className="space-y-2">
            {o.where.map((w, i) => (
              <a
                key={i}
                href={w.url || '#'}
                target={w.url ? '_blank' : undefined}
                rel={w.url ? 'noopener noreferrer' : undefined}
                className="flex items-start gap-3 text-xs py-2 px-3 rounded-sm cursor-pointer transition-colors hover:brightness-125"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', textDecoration: 'none' }}
              >
                <ArrowUpRight size={12} style={{ color: 'var(--accent)', marginTop: 2 }} />
                <div className="flex-1">
                  <div className="font-body font-medium mb-0.5" style={{ color: 'var(--ink)' }}>
                    {w.name}
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                    {w.role} · {w.region}
                  </div>
                </div>
              </a>
            ))}
          </ul>
        </div>

        {/* Source */}
        <div
          className="font-mono text-[10px] pt-3 border-t flex items-center justify-between"
          style={{ color: 'var(--ink-faint)', borderColor: 'var(--border-soft)' }}
        >
          <span>SOURCE · {o.sourceLabel}</span>
          <span className="uppercase tracking-widest">Info only · not advice</span>
        </div>

        {/* Action row — only for on-chain opportunities */}
        {isChain && (
          <div className="flex items-center gap-2 mt-4">
            <button
              disabled={txPending}
              onClick={() => onVouch && onVouch(o.id)}
              className="flex-1 font-mono text-[10px] uppercase tracking-widest py-2 rounded-sm transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--live)', cursor: txPending ? 'wait' : 'pointer' }}
              title="Endorse this opportunity — builds your on-chain reputation"
            >
              ▲ Vouch {o.vouch_count ? `(${o.vouch_count})` : ''}
            </button>
            <button
              disabled={txPending}
              onClick={() => onFlag && onFlag(o.id)}
              className="flex-1 font-mono text-[10px] uppercase tracking-widest py-2 rounded-sm transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--accent)', cursor: txPending ? 'wait' : 'pointer' }}
              title="Flag if outdated, wrong, or suspicious"
            >
              ⚑ Flag {o.flag_count ? `(${o.flag_count})` : ''}
            </button>
            <button
              disabled={txPending}
              onClick={() => onWatch && onWatch(o.id)}
              className="font-mono text-[10px] uppercase tracking-widest py-2 px-3 rounded-sm transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-muted)', cursor: txPending ? 'wait' : 'pointer' }}
              title="Save to your wallet-bound watchlist"
            >
              ☆
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Submit modal: form for a new opportunity ───────────────────────────
function SubmitModal({ open, onClose, onSubmit, pending }) {
  const [form, setForm] = useState({
    opp_id: '', name: '', type: 'ipo', continent: 'africa',
    country: '', flag_emoji: '', source_url: '', status_hint: 'open',
  });
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--ink)', padding: '8px 10px', borderRadius: 4,
    fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 10,
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', overflowY: 'auto', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(540px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
        <h2 className="font-display text-2xl mb-1" style={{ color: 'var(--ink)' }}>Submit an opportunity</h2>
        <p className="font-mono text-[11px] mb-3" style={{ color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          Help the registry grow. Add a real IPO, private placement, or token sale you've spotted.
        </p>
        <div className="font-mono text-[10px] mb-5 p-3 rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink)' }}>What happens next:</strong> validators independently fetch your
          source URL, an LLM checks the claim, and 5 validators must agree. Your <strong style={{ color: 'var(--accent)' }}>0.1 GEN bond</strong> is
          refunded if the entry is VERIFIED. Takes 60–180 seconds.
        </div>
        <input style={inputStyle} placeholder="unique id (e.g. revolut-ipo)" value={form.opp_id} onChange={(e) => set('opp_id', e.target.value)} />
        <input style={inputStyle} placeholder="name (e.g. Revolut)" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <select style={inputStyle} value={form.type} onChange={(e) => set('type', e.target.value)}>
          <option value="ipo">Traditional IPO</option>
          <option value="private">Private Placement</option>
          <option value="crypto">Crypto Sale</option>
        </select>
        <select style={inputStyle} value={form.continent} onChange={(e) => set('continent', e.target.value)}>
          <option value="africa">Africa</option>
          <option value="asia">Asia</option>
          <option value="europe">Europe</option>
          <option value="north-america">North America</option>
          <option value="south-america">South America</option>
        </select>
        <input style={inputStyle} placeholder="country (e.g. Nigeria)" value={form.country} onChange={(e) => set('country', e.target.value)} />
        <input style={inputStyle} placeholder="flag — emoji or 2-letter ISO code (e.g. NG)" value={form.flag_emoji} onChange={(e) => set('flag_emoji', e.target.value)} />
        <input style={inputStyle} placeholder="source URL (Wikipedia or official filing works best)" value={form.source_url} onChange={(e) => set('source_url', e.target.value)} />
        <select style={inputStyle} value={form.status_hint} onChange={(e) => set('status_hint', e.target.value)}>
          <option value="open">Open</option>
          <option value="upcoming">Upcoming</option>
          <option value="closed">Closed</option>
        </select>
        <div className="flex gap-2 mt-2">
          <button onClick={onClose} className="flex-1 font-mono text-xs py-2 rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-muted)' }}>Cancel</button>
          <button
            disabled={pending}
            onClick={() => onSubmit(form)}
            className="flex-1 font-mono text-xs py-2 rounded-sm"
            style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--bg)', cursor: pending ? 'wait' : 'pointer' }}
          >
            {pending ? 'Submitting…' : 'Submit (0.1 GEN bond)'}
          </button>
        </div>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [continent, setContinent] = useState('africa');
  const [category, setCategory] = useState('all');

  // ── Live on-chain data ────────────────────────────────────────────────
  const [liveOpps, setLiveOpps] = useState(OPPORTUNITIES);
  const [loading, setLoading] = useState(true);

  async function loadOpps() {
    try {
      const data = await listAll();
      // Map chain records, merging with seed metadata when ids match.
      // Chain confirms verified + provides sourceLabel; seed provides
      // rich UI fields (raise, valuation, keyDate, where) that the contract
      // doesn't store.
      const seedById = Object.fromEntries(OPPORTUNITIES.map((s) => [s.id, s]));
      const mapped = (data || []).map((o) => {
        const seed = seedById[o.opp_id];
        if (seed) {
          return {
            ...seed,
            verified: o.verified,
            sourceLabel: 'on-chain · GenLayer · ' + seed.sourceLabel,
          };
        }
        return {
          id: o.opp_id,
          name: o.name,
          type: o.type,
          continent: o.continent,
          country: o.country,
          flag: o.flag_emoji,
          status: o.status,
          summary: o.summary,
          sourceLabel: 'on-chain · GenLayer',
          verified: o.verified,
          raise: '—',
          valuation: '—',
          keyDate: '—',
          where: [],
        };
      });
      if (mapped.length) {
        const chainIds = new Set(mapped.map((m) => m.id));
        const seedExtras = OPPORTUNITIES.filter((s) => !chainIds.has(s.id));
        setLiveOpps([...mapped, ...seedExtras]);
      }
    } catch (e) {
      console.error('Failed to load on-chain opportunities:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOpps(); }, []);

  // ── Wallet + write state ─────────────────────────────────────────────
  const { address, connect, disconnect } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [txMessage, setTxMessage] = useState('');

  function requireWallet() {
    if (!address) {
      setWalletModalOpen(true);
      return false;
    }
    return true;
  }

  async function handleSubmit(form) {
    if (!requireWallet()) return;
    try {
      setTxPending(true);
      setTxMessage('Submitting + running validator consensus (60–180s)…');
      await submitOpportunity(form);
      setTxMessage('Submitted! Refreshing feed…');
      setSubmitOpen(false);
      await loadOpps();
    } catch (e) {
      setTxMessage('Submit failed: ' + (e?.message || 'unknown error'));
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 6000);
    }
  }

  async function handleVouch(oppId) {
    if (!requireWallet()) return;
    try {
      setTxPending(true);
      setTxMessage('Submitting vouch…');
      await vouchTx(oppId);
      setTxMessage('Vouch confirmed.');
      await loadOpps();
    } catch (e) {
      setTxMessage('Vouch failed: ' + (e?.message || 'unknown error'));
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 4000);
    }
  }

  async function handleFlag(oppId) {
    if (!requireWallet()) return;
    const reason = window.prompt('Why are you flagging this? (scam / outdated / wrong-info / other)');
    if (!reason) return;
    try {
      setTxPending(true);
      setTxMessage('Submitting flag…');
      await flagTx(oppId, reason);
      setTxMessage('Flag confirmed.');
      await loadOpps();
    } catch (e) {
      setTxMessage('Flag failed: ' + (e?.message || 'unknown error'));
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 4000);
    }
  }

  async function handleWatchlist(oppId) {
    if (!requireWallet()) return;
    try {
      setTxPending(true);
      setTxMessage('Adding to watchlist…');
      await addToWatchlist(oppId);
      setTxMessage('Added to watchlist.');
    } catch (e) {
      setTxMessage('Watchlist failed: ' + (e?.message || 'unknown error'));
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 4000);
    }
  }

    const continentCounts = useMemo(
    () =>
      CONTINENTS.reduce((acc, c) => {
        acc[c.id] = liveOpps.filter((o) => o.continent === c.id).length;
        return acc;
      }, {}),
    [liveOpps]
  );

  const filtered = useMemo(
    () =>
      liveOpps.filter(
        (o) => o.continent === continent && (category === 'all' || o.type === category)
      ),
    [liveOpps, continent, category]
  );

  const liveCount = useMemo(
    () => liveOpps.filter((o) => o.status === 'open').length,
    [liveOpps]
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen font-body" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        {/* ───── Top bar ───── */}
        <header className="border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-sm flex items-center justify-center font-display font-semibold text-sm"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                P
              </div>
              <span className="font-display text-lg tracking-tight">PRIMARY</span>
              <span
                className="hidden md:inline font-mono text-[10px] uppercase tracking-widest ml-3 px-2 py-1 rounded-sm"
                style={{ background: 'var(--surface)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}
              >
                Global primary-market discovery
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--ink-muted)' }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full pulse"
                  style={{ background: 'var(--live)' }}
                />
                {liveCount} live offerings
              </div>
              <button
                onClick={() => { if (requireWallet()) setSubmitOpen(true); }}
                className="font-mono text-xs px-3 py-2 rounded-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                title="Submit a new opportunity for AI verification"
              >
                + Submit
              </button>
              {address ? (
                <button
                  onClick={disconnect}
                  className="font-mono text-xs px-3 py-2 rounded-sm"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                  title="Disconnect"
                >
                  {address.slice(0, 6)}…{address.slice(-4)}
                </button>
              ) : (
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="font-mono text-xs px-3 py-2 rounded-sm"
                  style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--bg)' }}
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ───── Hero / thesis ───── */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-8">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <div
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: 'var(--accent)' }}
              >
                Issue № 001 · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <h1
                className="font-display text-5xl md:text-6xl leading-[1.05] mb-5"
                style={{ color: 'var(--ink)' }}
              >
                Every share sale.
                <br />
                <span style={{ color: 'var(--accent)' }}>Every continent.</span>
                <br />
                One feed.
              </h1>
              <p
                className="font-body text-base leading-relaxed max-w-2xl"
                style={{ color: 'var(--ink-muted)' }}
              >
                Anyone can submit an opportunity. GenLayer validators independently fetch the source URL,
                an LLM judges the claim, and 5 validators must agree before the entry is stamped VERIFIED
                on-chain. Verified entries appear in the public feed — visible to anyone, anywhere.
                Information only. Always do your own research.
              </p>
            </div>
            <div className="md:col-span-4 hidden md:block">
              <div
                className="border-l-2 pl-4 font-mono text-[11px] leading-relaxed"
                style={{ borderColor: 'var(--accent)', color: 'var(--ink-muted)' }}
              >
                <div className="mb-2 uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
                  How it works
                </div>
                <div>01 · User submits opportunity + source URL</div>
                <div>02 · 5 validators independently verify vs. source</div>
                <div>03 · Consensus → entry appears in the feed</div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Continent ticker (the signature) ───── */}
        <section
          className="border-y"
          style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="ticker-strip overflow-x-auto">
              <div className="flex divide-x" style={{ borderColor: 'var(--border-soft)' }}>
                {CONTINENTS.map((c) => {
                  const active = c.id === continent;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setContinent(c.id)}
                      className="flex-1 min-w-[200px] px-6 py-5 text-left transition-colors"
                      style={{
                        background: active ? 'var(--bg)' : 'transparent',
                        borderColor: 'var(--border-soft)',
                        borderRight: '1px solid var(--border-soft)',
                      }}
                    >
                      <div
                        className="font-mono text-[10px] uppercase tracking-widest mb-1"
                        style={{ color: active ? 'var(--accent)' : 'var(--ink-faint)' }}
                      >
                        {active ? '◆ Now viewing' : '○'}
                      </div>
                      <div
                        className="font-display text-xl mb-1"
                        style={{ color: active ? 'var(--ink)' : 'var(--ink-muted)' }}
                      >
                        {c.name}
                      </div>
                      <div className="font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>
                        {continentCounts[c.id]} {continentCounts[c.id] === 1 ? 'offering' : 'offerings'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ───── Category filter ───── */}
        <section className="max-w-7xl mx-auto px-6 pt-8 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-widest mr-2"
              style={{ color: 'var(--ink-faint)' }}
            >
              Filter
            </span>
            {CATEGORIES.map((c) => {
              const active = c.id === category;
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--surface)',
                    color: active ? 'var(--bg)' : 'var(--ink-muted)',
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  <Icon size={12} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* ───── Grid ───── */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          {filtered.length === 0 ? (
            <div
              className="border rounded-sm p-12 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--ink-faint)' }}>
                No matches
              </div>
              <div style={{ color: 'var(--ink-muted)' }}>
                Nothing in {CONTINENTS.find((c) => c.id === continent)?.name} matches this filter yet.
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((o) => (
                <OpportunityCard key={o.id} o={o} onVouch={handleVouch} onFlag={handleFlag} onWatch={handleWatchlist} txPending={txPending} />
              ))}
            </div>
          )}
        </section>

        {/* ───── Sticky disclaimer footer ───── */}
        <footer
          className="border-t fixed bottom-0 left-0 right-0 backdrop-blur"
          style={{
            background: 'rgba(11,14,18,0.92)',
            borderColor: 'var(--border)',
            zIndex: 50,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
            <AlertTriangle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              <span style={{ color: 'var(--ink)' }} className="uppercase tracking-widest">
                Information only · not financial advice ·
              </span>{' '}
              Always do your own research. Listings here are discovery signals, not endorsements. Eligibility,
              tax treatment, and platform availability vary by jurisdiction. Verify directly with the issuer or
              regulator before committing capital. Capital at risk.
            </p>
          </div>
        </footer>

        <WalletModal
          open={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
          onConnect={async (id) => { await connect(id); setWalletModalOpen(false); }}
        />

        <SubmitModal
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          onSubmit={handleSubmit}
          pending={txPending}
        />

        {txMessage && (
          <div
            className="fixed left-1/2 z-[1100] font-mono text-xs px-4 py-3 rounded-sm shadow-lg"
            style={{
              bottom: 64,
              transform: 'translateX(-50%)',
              background: 'var(--surface-2)',
              border: '1px solid var(--accent)',
              color: 'var(--ink)',
              maxWidth: '90vw',
            }}
          >
            {txMessage}
          </div>
        )}
      </div>
    </>
  );
}
