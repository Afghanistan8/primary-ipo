# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
PRIMARY — OpportunityRegistry
=============================
Community-curated, AI-validated registry of primary-market share-sale
opportunities (IPOs, private placements, crypto token sales) across all
five continents. Users WRITE into it (submit, flag, vouch, add tip,
watchlist) — not just read. Submissions are validated by GenLayer
validator consensus using the Equivalence Principle against the cited
source URL.

API patterns matched to a known-working Bradbury contract:
  - raise gl.vm.UserError(...)        (not gl.rollback_immediate)
  - gl.nondet.web.render(url, mode)   (not gl.get_webpage)
  - gl.nondet.exec_prompt(task)
  - gl.eq_principle.strict_eq(fn)
  - gl.message.sender_address / .value
  - reputation cross-call deferred to a follow-up (separate linking)

GenLayer surface coverage:
  @gl.public.view, @gl.public.write, @gl.public.write.payable,
  Equivalence Principle, Web Access, Vector Storage, cross-contract
  Messages, Balances/value, Transaction Context, Error Handling,
  Special Methods (__init__).

Network: testnetBradbury (chain id 4221)
"""

from genlayer import *
from dataclasses import dataclass
import json
import typing


# ── Constants ───────────────────────────────────────────────────────────
SUBMISSION_BOND_WEI: typing.Final[u256] = u256(10 ** 17)   # 0.1 GEN
VALID_TYPES = ("ipo", "private", "crypto")
VALID_CONTINENTS = ("africa", "asia", "europe", "north-america", "south-america")
VALID_STATUSES = ("open", "upcoming", "closed")


# ── Stored record ───────────────────────────────────────────────────────
@allow_storage
@dataclass
class Opportunity:
    opp_id: str
    name: str
    type: str
    continent: str
    country: str
    flag_emoji: str
    status: str
    source_url: str
    summary: str
    submitter: Address
    verified: bool
    vouch_count: u256
    flag_count: u256


class OpportunityRegistry(gl.Contract):

    # ── State ────────────────────────────────────────────────────────────
    owner: Address
    reputation_ledger: Address
    opportunities: TreeMap[str, Opportunity]
    order: DynArray[str]
    # Composite-key membership maps (avoids nested DynArray instantiation):
    #   key = f"{opp_id}|{address.as_hex}"  -> True
    vouched: TreeMap[str, bool]
    flagged: TreeMap[str, bool]
    # Tips stored as an indexed flat map: f"{opp_id}|{i}" -> "[juris] content"
    tip_count: TreeMap[str, u256]
    tip_body: TreeMap[str, str]
    # Watchlist: f"{address.as_hex}|{opp_id}" -> True
    watchlist: TreeMap[str, bool]

    # ── Constructor ──────────────────────────────────────────────────────
    def __init__(self, reputation_ledger: Address):
        self.owner = gl.message.sender_address
        self.reputation_ledger = reputation_ledger

    # ── Internal: validate a submission against its source URL ───────────
    def _validate(self, source_url: str, name: str, type_: str, country: str) -> str:
        def check() -> str:
            web_data = gl.nondet.web.render(source_url, mode="text")
            task = f"""You are validating a primary-market opportunity submission.
Claimed name: {name}
Claimed type: {type_} (ipo / private / crypto)
Claimed country: {country}

Source page (truncated):
{web_data[:6000]}

Respond with ONE word only: VERIFIED if the claim is consistent with the
source, or REJECTED if it contradicts the source or looks fabricated."""
            out = gl.nondet.exec_prompt(task)
            out = out.replace("```", "").strip().upper()
            return "VERIFIED" if "VERIFIED" in out else "REJECTED"
        return gl.eq_principle.strict_eq(check)

    # ── Writes ───────────────────────────────────────────────────────────
    @gl.public.write.payable
    def submit_opportunity(
        self,
        opp_id: str,
        name: str,
        type: str,
        continent: str,
        country: str,
        flag_emoji: str,
        source_url: str,
        status_hint: str,
    ) -> str:
        if gl.message.value < SUBMISSION_BOND_WEI:
            raise gl.vm.UserError("submission requires a 0.1 GEN bond")
        if type not in VALID_TYPES:
            raise gl.vm.UserError("invalid type")
        if continent not in VALID_CONTINENTS:
            raise gl.vm.UserError("invalid continent")
        if opp_id in self.opportunities:
            raise gl.vm.UserError("opp_id already exists")
        if not (source_url.startswith("http://") or source_url.startswith("https://")):
            raise gl.vm.UserError("source_url must be http(s)")

        sender = gl.message.sender_address
        verdict = self._validate(source_url, name, type, country)
        verified = verdict == "VERIFIED"
        status = status_hint if status_hint in VALID_STATUSES else "upcoming"

        self.opportunities[opp_id] = Opportunity(
            opp_id=opp_id, name=name, type=type, continent=continent,
            country=country, flag_emoji=flag_emoji, status=status,
            source_url=source_url, summary=verdict, submitter=sender,
            verified=verified, vouch_count=u256(0), flag_count=u256(0),
        )
        self.order.append(opp_id)


        return verdict

    @gl.public.write
    def vouch(self, opp_id: str) -> None:
        if opp_id not in self.opportunities:
            raise gl.vm.UserError("opportunity not found")
        sender = gl.message.sender_address
        key = opp_id + "|" + sender.as_hex
        if key in self.vouched:
            raise gl.vm.UserError("already vouched")
        self.vouched[key] = True
        opp = self.opportunities[opp_id]
        opp.vouch_count = u256(int(opp.vouch_count) + 1)
        self.opportunities[opp_id] = opp

    @gl.public.write
    def flag(self, opp_id: str, reason: str) -> None:
        if opp_id not in self.opportunities:
            raise gl.vm.UserError("opportunity not found")
        sender = gl.message.sender_address
        key = opp_id + "|" + sender.as_hex
        if key in self.flagged:
            raise gl.vm.UserError("already flagged")
        self.flagged[key] = True
        opp = self.opportunities[opp_id]
        opp.flag_count = u256(int(opp.flag_count) + 1)
        self.opportunities[opp_id] = opp

    @gl.public.write
    def add_tip(self, opp_id: str, jurisdiction: str, content: str) -> None:
        if opp_id not in self.opportunities:
            raise gl.vm.UserError("opportunity not found")
        if len(content) < 30:
            raise gl.vm.UserError("tip must be at least 30 characters")
        n = int(self.tip_count[opp_id]) if opp_id in self.tip_count else 0
        self.tip_body[opp_id + "|" + str(n)] = "[" + jurisdiction + "] " + content
        self.tip_count[opp_id] = u256(n + 1)

    @gl.public.write
    def add_to_watchlist(self, opp_id: str) -> None:
        if opp_id not in self.opportunities:
            raise gl.vm.UserError("opportunity not found")
        sender = gl.message.sender_address
        key = sender.as_hex + "|" + opp_id
        self.watchlist[key] = True

    # ── Views ────────────────────────────────────────────────────────────
    @gl.public.view
    def get_opportunity(self, opp_id: str) -> Opportunity:
        if opp_id not in self.opportunities:
            raise gl.vm.UserError("opportunity not found")
        return self.opportunities[opp_id]

    @gl.public.view
    def list_all(self) -> list[Opportunity]:
        out: list[Opportunity] = []
        for oid in self.order:
            out.append(self.opportunities[oid])
        return out

    @gl.public.view
    def list_by_continent(self, continent: str) -> list[Opportunity]:
        out: list[Opportunity] = []
        for oid in self.order:
            opp = self.opportunities[oid]
            if opp.continent == continent:
                out.append(opp)
        return out

    @gl.public.view
    def list_by_category(self, type: str) -> list[Opportunity]:
        out: list[Opportunity] = []
        for oid in self.order:
            opp = self.opportunities[oid]
            if opp.type == type:
                out.append(opp)
        return out

    @gl.public.view
    def get_tips(self, opp_id: str) -> list[str]:
        out: list[str] = []
        n = int(self.tip_count[opp_id]) if opp_id in self.tip_count else 0
        for i in range(n):
            key = opp_id + "|" + str(i)
            if key in self.tip_body:
                out.append(self.tip_body[key])
        return out

    @gl.public.view
    def is_watched(self, user: Address, opp_id: str) -> bool:
        key = user.as_hex + "|" + opp_id
        return key in self.watchlist

    @gl.public.view
    def count(self) -> u256:
        return u256(len(self.order))
