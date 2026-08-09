# AjoCred — Project Brief for Antigravity

## What this document is
Full context for building AjoCred: a DeFi lending product for the Cleanverse Build: Trusted Assets Hackathon. Read this fully before writing any code. Ask clarifying questions on anything ambiguous rather than assuming. This supersedes any earlier version of this brief — the architecture has evolved significantly (cooperative multi-tenancy, OnchainKit onboarding, multisig) since the original single-pool MVP.

---

## 1. The Hackathon — Context & Stakes

**Event:** Cleanverse Build: Trusted Assets Hackathon, supported by Monad Foundation.
**Track:** DeFi (Track 02) — NOT RWA.
**Key dates (UTC):**
- Registration: Jul 21 – Aug 7 (done — registered as "Team AjoCred")
- **Hacking period: Aug 8 00:00 – Aug 9 23:59** (48 hours)
- Submission deadline: Aug 9 23:59 UTC, via email to isaac@cleanverse.com
- Winners announced: Aug 14
**Prize:** $16K total pool (aUSDC), top 3 per track: 5,000 / 2,000 / 1,000 aUSDC.
**Team:** Solo builder (David). Building an MVP now (pre-Aug 8) and rebuilding/hardening during the actual hacking window — see §9 Commit Strategy.

### Judging Criteria (out of 100)
| Criterion | Points |
|---|---|
| Concept & Problem Definition | 20 |
| **Depth of CVI·CVA Integration** | **30 — highest weight, do not under-invest here** |
| Build Quality | 25 |
| UX & Demo | 15 |
| Scalability Potential | 10 |

**Additional Considerations:** use Cleanverse primitives meaningfully; solve real financial infrastructure problems; pilotable with institutions or merchants; improve trust/compliance/interoperability; demonstrate clear user value; technically feasible beyond the hackathon.

### Strategic decisions carried through the whole build
- DeFi track only requires CVI **or** CVA — doing **both, deeply**, deliberately, as a differentiator.
- Chain: **Base**, but it should be built in such a way that it can easily deployed on any evm chain.
- A smaller, fully-working slice beats a bigger, partially-broken one. Every scope addition below has been evaluated against this — several attractive ideas were deliberately cut (see §8).

---

## 2. The Product — AjoCred (current architecture: two-sided cooperative marketplace)

**One-liner:** AjoCred is compliant, under-collateralized lending infrastructure for Nigerian cooperatives and agencies serving remittance-linked populations — letting an institution launch a credit product against verified diaspora income in days, while individuals like Amaka get access to credit the formal system currently denies them.

**Two distinct beneficiaries, addressed by one product:**
1. **End users (Amaka persona):** receives diaspora remittances, verifies identity once (CVI), and her verified inflow history becomes the basis for collateral-free borrowing.
2. **Institutions (cooperatives/agencies):** register with AjoCred, fund and configure their own pool (own liquidity cap, own risk tier threshold), and earn interest on repayments. Multiple cooperatives coexist on the platform; borrowers choose which one to borrow from.

**Why Cleanverse is essential (not optional):** without CVI, there's no way to distinguish a real verified remittance recipient from an anonymous wallet gaming the system. Without the on-chain Validator, compliance would be an app-layer promise instead of an enforced, atomic, on-chain property of the contract. Without CVA (`ausdc`), the capital moving through the system wouldn't be verified/compliant stablecoin value. An institution onboarding onto AjoCred inherits all of this instead of building KYC/compliance infrastructure from scratch.

**Demo persona:** Amaka, in Lagos, receiving remittances from a relative in Toronto.

---

## 3. Architecture — Cooperative Multi-Tenancy (Single-Contract Mode, no Factory)

**Key design decision:** cooperative multi-tenancy is built as **internal accounting inside one Cleanverse-registered contract** — NOT via Cleanverse's Factory Mode. This was a deliberate choice: Factory Mode requires `validator/grant`, an external Cleanverse approval with unknown turnaround time, which is an unacceptable dependency risk this close to submission. One `AjoCredPool` contract registers once with Cleanverse (Single-Contract Mode, as established earlier), and internally partitions cooperatives via mappings — Cleanverse never needs to know about the multi-tenancy; it's entirely AjoCred's own application logic.

### Contract shape
```solidity
struct Cooperative {
    address admin;
    uint256 totalLiquidity;
    uint256 maxLiquidity;   // capped-pilot-mode, per cooperative
    uint8 minTier;          // cooperative-specific risk threshold, app-enforced on top of base CVI check
    bool active;
}

mapping(uint256 => Cooperative) public cooperatives;
uint256 public cooperativeCount;
mapping(uint256 => mapping(address => uint256)) public deposits;   // coopId => LP => amount
mapping(uint256 => mapping(address => uint256)) public borrowings; // coopId => borrower => amount

// Platform owner (the multisig, see §4) approves new cooperatives — not open self-registration
function registerCooperative(address admin, uint256 maxLiquidity, uint8 minTier) external onlyOwner returns (uint256) {
    cooperativeCount++;
    cooperatives[cooperativeCount] = Cooperative(admin, 0, maxLiquidity, minTier, true);
    return cooperativeCount;
}

function deposit(uint256 coopId, uint256 amount) external {
    Cooperative storage coop = cooperatives[coopId];
    require(coop.active, "inactive cooperative");
    require(msg.sender == coop.admin, "only cooperative admin funds this pool"); // see funding-source decision below
    require(validator.complianceVerify(address(this), msg.sender), "A-Pass not qualified");
    require(coop.totalLiquidity + amount <= coop.maxLiquidity, "cap reached");
    aUSDC.transferFrom(msg.sender, address(this), amount);
    deposits[coopId][msg.sender] += amount;
    coop.totalLiquidity += amount;
}

function borrow(uint256 coopId, uint256 amount) external {
    Cooperative storage coop = cooperatives[coopId];
    require(coop.active, "inactive cooperative");
    require(validator.complianceVerify(address(this), msg.sender), "A-Pass not qualified");
    require(coop.totalLiquidity >= amount, "insufficient liquidity");
    borrowings[coopId][msg.sender] += amount;
    coop.totalLiquidity -= amount;
    aUSDC.transfer(msg.sender, amount);
}
// repay() applies a flat interest fee (e.g. 5% of principal) — NOT time-accruing interest.
// Time-based accrual was deliberately rejected: more bug surface for little narrative payoff at this stage.
```

**Funding-source decision:** `deposit()` is restricted to the cooperative admin only — NOT open to arbitrary public liquidity providers. Reasoning: an open-LP model requires share-based (ERC-4626-style) proportional accounting for interest distribution — real added scope for a feature that isn't needed to prove the core thesis. Public LP deposits are named explicitly as a roadmap item (§8), not built.

**On-chain Validator integration recap (established earlier, still current):**
- Single-Contract Mode confirmed correct (no Factory needed even with multi-tenancy — see above).
- `RuleV2` (on-chain) uses `bytes2 allowedGroup/allowedSubGroup`, `uint8 minTier/minSubTier`, `uint256 poolCountryBitmap` — NOT the same shape as REST rule objects (string/array based). Do not conflate.
- `complianceVerify(poolAddress, userAddress)` is called inline in `deposit()`/`borrow()`/`withdraw()` — this on-chain, atomic enforcement is the headline integration point, stronger than relying on the REST `validator/verify` endpoint (which is kept only for off-chain UI hints, e.g. "you're eligible" before submitting a tx).
- CVA framing: because this is Single-Contract Mode, do NOT claim two independent CVA-level compliance checkpoints (that requires Factory-mode `registerApass`, which we don't use) — the honest claim is one on-chain checkpoint enforced directly inside AjoCred's own contract.

---

## 4. Institutional Trust — Multisig + Capped Pilot Mode

Added specifically to make "institutions can actually use this" credible without the risk of building Cleanverse's Factory Mode.

- **Multisig ownership:** contract `owner()` is a Safe (Gnosis Safe / "Safe") multisig, not a single EOA — transferred via `transferOwnership()` (built into OpenZeppelin `Ownable`) right after deploy. This governs `registerCooperative()` and any owner-only config changes, so no single person unilaterally controls cooperative onboarding or platform parameters.
- **Capped pilot mode:** each cooperative has a `maxLiquidity` ceiling enforced on-chain in `deposit()`. This is the concrete, inspectable mechanism behind the "bounded pilot, not production-scale" claim in the write-up — demo should show a deposit succeeding under the cap and reverting once it would exceed it.
- **Submission write-up language (draft):** *"AjoCred's initial pilot target is a Nigeria-focused diaspora remittance fintech or cooperative already serving a verified user base but lacking compliant on-chain credit infrastructure. Each cooperative's pool launches capped in total liquidity (enforced on-chain), governed by a multisig, with the cap raised incrementally as repayment data validates the model."*

---

## 5. Seamless Onboarding — OnchainKit / Coinbase Smart Wallet

**Decision: using OnchainKit** (not Privy) since the build targets Base — OnchainKit is Base-native and plugs directly into the existing wagmi setup.

**What it solves:**
- **Wallet creation** — passkey-based (Face ID/Touch ID) Smart Wallet creation via `<ConnectWallet>`. No seed phrase, no extension install, for both Amaka and cooperative admins.
- **Gas sponsorship** — via Coinbase Paymaster, sponsored **only on Base** (confirmed — this does not extend to Monad or other chains, which is one reason multi-chain deployment is a stretch goal at most, not a commitment — see §8).
- Confirmed via Coinbase's own docs: Smart Wallet supports 8 networks (Base, Ethereum, Optimism, Arbitrum, Polygon, Avalanche, BNB, Zora) — Monad is not among them. If any Monad work happens, it needs a separate, chain-agnostic onboarding path (Privy was the identified fallback) — not built unless Monad deployment actually happens.

**UI language rule:** never show "wallet," "gas," "A-Pass," or "on-chain" in Amaka's or the admin's flow. Use "your AjoCred account," "verify your identity," "borrowing limit," etc. This is a cheap, high-visibility win for the UX & Demo score.

### Two distinct addresses per user — do not conflate in UI
- **Smart Wallet address** — used to call `deposit()`/`borrow()`/`repay()`, holds aUSDC balance.
- **Cleanverse deposit address** (from `query_deposit_address`) — the address a diaspora relative should actually send USDC to for conversion. Amaka's "Receive Money" screen should show THIS address (with QR code), not her raw Smart Wallet address — framed as "share this with your family abroad."

### Admin flow (cooperative)
Registration (off-chain form + platform approval) → passkey login via `<ConnectWallet>` → dashboard shows pool liquidity/cap/borrowers → fund pool (`deposit()`, gas-sponsored) → adjust `minTier`/cap (gas-sponsored, one-click).

### Amaka flow
Sign up via passkey → identity verification (`generate_apass`, gas-sponsored) → dashboard shows remittance history via `query_txs` as a plain-language timeline, not a raw tx log → browse cooperatives, pick one → borrow (gas-sponsored, `complianceVerify` gated) → repay (flat interest fee, gas-sponsored).

---

## 6. Demo-Specific Eligibility Window — do not hardcode "6 months"

The risk-engine's inflow-history requirement must be **parameterized**, not hardcoded, so the same logic serves both production and demo:

```typescript
const OBSERVATION_WINDOW_SECONDS = Number(process.env.OBSERVATION_WINDOW_SECONDS); // production default: ~15,552,000 (6 months)
const MIN_QUALIFYING_DEPOSITS = Number(process.env.MIN_QUALIFYING_DEPOSITS); // production default: e.g. 3
```
For the demo: compress to e.g. `OBSERVATION_WINDOW_SECONDS=3600` and `MIN_QUALIFYING_DEPOSITS=2`. State this compression explicitly in the submission write-up — framed honestly as compressed timescale, same logic, not a fabricated bypass.

**Demo sequencing (deliberate, not accidental):** show a FRESH wallet signing up live → dashboard shows "0 of N qualifying deposits, not yet eligible" → then switch to a separately pre-aged demo wallet (real faucet deposits made across several real days before the demo) → show it borrowing successfully. Showing the ineligible state first is a *stronger* demo — it proves the gate is real, not just asserted.

**Identity vs. creditworthiness — keep conceptually separate in all code/UI:** `complianceVerify()` (identity gate) passes instantly on verification. The inflow-history threshold (creditworthiness gate) is a separate, additional check only enforced in `borrow()`. A brand-new verified wallet can sign up and even deposit (if it were a cooperative admin) instantly — it just can't *borrow* until it has earned history. This is core to the product's thesis, not a limitation to work around.

---

## 7. Simulating Remittance for the Demo — whitelist not yet integrated

**Status: `add_whitelist_for_institutional` is NOT integrated.** This means a genuine USDC send from an unwhitelisted sender to Amaka's deposit address will NOT auto-convert to aUSDC (per Cleanverse's own confirmation — see §8/known findings) — it bounces back as plain USDC.

**Decision: do not build this before the hackathon.** It requires submitting real-looking institutional metadata (`entityName`, `license`, `logoUrl`) that doesn't naturally exist for a hackathon demo, and the added scope isn't worth it given everything else already built.

**Demo approach instead:** simulate incoming remittance via the direct faucet endpoint (`POST /faucet`) minting aUSDC into Amaka's wallet. State this explicitly in the demo narration: *"For this demo, incoming remittance is simulated via Cleanverse's testnet faucet — in production this step is the institutional deposit whitelist, where a registered remittance partner's transfers auto-convert to verified aUSDC automatically."* Name the exact endpoint and its requirements in the write-up — specificity reads as more credible than vague roadmap language.

---

## 8. Explicitly Deferred / Roadmap-Only (named precisely, not vaguely, in the write-up)

- **Institutional deposit whitelist** (`add_whitelist_for_institutional`) — see §7.
- **Public/open liquidity provision** — share-based (ERC-4626-style) proportional interest accounting for non-cooperative depositors. Named as concrete next step, not built.
- **Fiat Ramp** (`query_ramp_quote` → `create_ramp_widget_url` → `query_ramp_order`) — lets users cash out to NGN/bank/mobile money. Real, separate integration surface; strongest "beyond the hackathon" story but deliberately out of the current build.
- **Cleanverse Factory Mode** (`validator/grant`, multi-pool via Cleanverse's own registrar) — deliberately rejected in favor of internal multi-tenancy (§3) specifically to avoid the external-approval dependency risk this close to submission.
- **Monad deployment** — stretch goal at most. OnchainKit/Smart Wallet gas sponsorship does not extend to Monad; would need a separate chain-agnostic onboarding path (Privy identified as the fallback) if pursued. Not a committed milestone.
- **Time-accruing interest** — flat repayment fee used instead; accrual logic named as a future refinement.
- **`download_travel_rule`** — compliance reporting on larger transactions; cheap, single plain-JSON call, worth adding if time permits but not core.
- **`update_status` on default** — freezing a defaulted borrower's A-Pass; closes the loop on a risk-mitigation claim already made in the write-up. Worth adding if time permits.
- Full list of REST endpoints out of scope for the hackathon build otherwise unchanged from the trimmed API reference (see `docs/cleanverse-api-reference.md`): A-Token issuance/registration/wrapped variants, `query_apass_list`.

---

## 9. Commit Strategy — important, follow carefully

- Build and learn now (pre-Aug 8) — legitimate prep, not against the rules.
- Use git normally starting now — do not withhold commits while prepping.
- Keep the repo private (or unpushed) until ready.
- Push to public GitHub once, preserving full commit history, at or after Aug 8. GitHub preserves real author/commit dates regardless of push time.
- Deliberately hold back genuine, substantial integration milestones for Aug 8–9 itself — real work (end-to-end wiring, testnet deployment, `complianceVerify` gating a live transaction, real debugging), not cosmetic polish, needs to visibly happen inside the window.

---

## 10. Tech Stack (unchanged from earlier decisions, OnchainKit added)

| Layer | Choice |
|---|---|
| Smart contracts | Solidity, Hardhat (TypeScript) |
| Backend | NestJS (Node.js + TypeScript) |
| Frontend | Vite + React + TypeScript |
| Wallet/chain interaction | wagmi + viem |
| **Onboarding/wallet UX** | **OnchainKit (Coinbase Smart Wallet, passkey login, Paymaster gas sponsorship) — Base-native** |
| Encryption | Node's built-in `crypto` (AES-256/128-CBC depending on decoded key length — verify against real credentials) |
| Chain | Base (Sepolia testnet for development) |

---

## 11. Credentials Handling — follow exactly, do not deviate

- **`api-id`** — plain HTTP header, not secret-secret, but never hardcoded or committed.
- **`api-key`** — never sent over the network; used locally only as the AES key. Treat as a real secret.
- Both live only in `backend/.env` (gitignored before first commit). `.env.example` holds placeholder keys only.
- **Never paste real `api-id`/`api-key` values into the Antigravity chat window or into this brief or any committed file** — reference only by env var name. This matters especially given the repo goes public on Aug 8; a secret in git history is retrievable forever even after later removal.
- Encrypted endpoints (`{"data": "<Base64 ciphertext>"}`): `generate_apass`, `validator/register`, all `atoken/*` mutations. Plain JSON: `query_apass`, `query_txs`, `validator/is_register`/`verify`/`rules`/`is_paused`, `query_deposit_atoken_list`, `query_deposit_address`, `verify_apass`, `faucet`. Full detail in `docs/cleanverse-api-reference.md`.
- Sanity-check credentials with an isolated `curl` call against a plain-JSON endpoint before writing any NestJS integration code against them.

---

## 12. Team Background (for submission form context)
Solo builder — software engineer with hands-on experience across Rust, Solana (Anchor, Pinocchio), Node.js, TypeScript, and Fastify. Currently building a separate USDC-based payments app for Nigerian users (KOLO), giving direct, practical experience with stablecoin rails, wallet infrastructure, and payment confirmation in the Nigerian market this project targets.