# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
PRIMARY — ReputationLedger (minimal v2)
=======================================
Stripped-down version after the first deploy hit FINISHED_WITH_ERROR.
Goal: confirm the constructor + state assignment pattern works on Bradbury
before re-adding the event-history DynArray.

Changes from v1:
  - sender_account -> sender_address (SDK attribute name fix)
  - gl.rollback_immediate(...) -> raise Exception(...)
  - removed @dataclasses.dataclass ReputationEvent + history DynArray
  - delta is u256 (positive-only) instead of i32 for now
"""

from genlayer import *


class Contract(gl.Contract):

    owner: Address
    authorized_caller: Address
    scores: TreeMap[Address, u256]

    def __init__(self):
        self.owner = gl.message.sender_address

    @gl.public.write
    def set_authorized_caller(self, registry: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise Exception("Only owner can set authorized caller")
        self.authorized_caller = registry

    @gl.public.write
    def adjust_reputation(self, actor: Address, delta: u256) -> u256:
        caller = gl.message.sender_address
        if caller != self.authorized_caller:
            raise Exception("Only the linked OpportunityRegistry may call this")
        current = self.scores[actor] if actor in self.scores else u256(0)
        new_balance = u256(int(current) + int(delta))
        self.scores[actor] = new_balance
        return new_balance

    @gl.public.view
    def get_reputation(self, actor: Address) -> u256:
        if actor not in self.scores:
            return u256(0)
        return self.scores[actor]

    @gl.public.view
    def get_authorized_caller(self) -> Address:
        return self.authorized_caller

    @gl.public.view
    def get_owner(self) -> Address:
        return self.owner
