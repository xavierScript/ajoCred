# AjoCred — Project Brief for Antigravity

## What this document is
Full context for building AjoCred: a DeFi lending product for the Cleanverse Build: Trusted Assets Hackathon. Read this fully before writing any code. Ask clarifying questions on anything ambiguous rather than assuming. This supersedes any earlier version of this brief.

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
- **Chain: Base only.** No multi-chain/Polygon portability ambition — confirmed decision, keep the build focused.
- A smaller, fully-working slice beats a bigger, partially-broken one.

---

## 2. The Product — AjoCred (two-sided cooperative marketplace, two separate frontends)

**One-liner:** AjoCred is compliant, under-collateralized lending infrastructure for Nigerian cooperatives and agencies serving remittance-linked populations — letting an institution launch a credit product against verified diaspora income in days, while individuals like Amaka get access to credit the formal system currently denies them.

**Two distinct beneficiaries, each with their own frontend:**
1. **End users (Amaka persona)** — separate end-user frontend. Receives diaspora remittances, verifies identity once (CVI), and her verified inflow history becomes the basis for collateral-free borrowing.
2. **Institutions (cooperatives/agencies)** — separate admin-dashboard frontend. Register with AjoCred, fund and configure their own pool (own liquidity cap, own risk tier threshold), and earn interest on repayments. Multiple cooperatives coexist on the platform; borrowers choose which one to borrow from.

**Why Cleanverse is essential (not optional):** without CVI, there's no way to distinguish a real verified remittance recipient from an anonymous wallet gaming the system. Without the on-chain Validator, compliance would be an app-layer promise instead of an enforced, atomic, on-chain property of the contract. Without CVA (`ausdc`), the capital moving through the system wouldn't be verified/compliant stablecoin value. An institution onboarding onto AjoCred inherits all of this instead of building KYC/compliance infrastructure from scratch.

**Demo persona:** Amaka, in Lagos, receiving remittances from a relative in Toronto.

---

## 3. Architecture — Cooperative Multi-Tenancy (Single-Contract Mode, no Factory)

**Key design decision:** cooperative multi-tenancy is built as **internal accounting inside one Cleanverse-registered contract** — NOT via Cleanverse's Factory Mode. Factory Mode requires `validator/grant`, an external Cleanverse approval with unknown turnaround time — unacceptable dependency risk this close to submission. One `AjoCredPool` contract registers once with Cleanverse (Single-Contract Mode), and internally partitions cooperatives via mappings.

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

function registerCooperative(address admin, uint256 maxLiquidity, uint8 minTier) external onlyOwner returns (uint256) {
    cooperativeCount++;
    cooperatives[cooperativeCount] = Cooperative(admin, 0, maxLiquidity, minTier, true);
    return cooperativeCount;
}

function deposit(uint256 coopId, uint256 amount) external {
    Cooperative storage coop = cooperatives[coopId];
    require(coop.active, "inactive cooperative");
    require(msg.sender == coop.admin, "only cooperative admin funds this pool");
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
```

**Funding-source decision:** `deposit()` is restricted to the cooperative admin only — NOT open to arbitrary public liquidity providers (would require ERC-4626-style share accounting — real added scope, named as roadmap item in §8).

**On-chain Validator integration recap:**
- Single-Contract Mode confirmed correct (no Factory needed even with multi-tenancy).
- `RuleV2` (on-chain) uses `bytes2 allowedGroup/allowedSubGroup`, `uint8 minTier/minSubTier`, `uint256 poolCountryBitmap` — NOT the same shape as REST rule objects. Do not conflate.
- `complianceVerify(poolAddress, userAddress)` called inline in `deposit()`/`borrow()`/`withdraw()` — the headline integration point.
- CVA framing: Single-Contract Mode means one on-chain checkpoint (our own contract), not two independent CVA-level checkpoints (that needs Factory-mode `registerApass`, not used here).

---

## 4. Institutional Trust — Capped Pilot Mode, Default Handling, Compliance Reporting

- **Capped pilot mode:** each cooperative has a `maxLiquidity` ceiling enforced on-chain in `deposit()`. Demo should show a deposit succeeding under the cap and reverting once it would exceed it.
- **Multisig ownership: confirmed deferred to post-hackathon.** Not built for the submission — named as a roadmap item in the write-up only.
- **Default handling (integrated):** on a defaulted loan, the admin dashboard triggers `update_status` (freeze) against the defaulted borrower's A-Pass — closes the loop on the risk-mitigation claim in the write-up with real code, not just a sentence.
- **Compliance reporting (integrated):** `download_travel_rule` generates a Travel Rule / transaction report for larger repayment or withdrawal transactions — surfaced on the institution admin-dashboard as an exportable compliance report, supporting "improve trust, compliance, or interoperability."
- **Submission write-up language (draft):** *"AjoCred's initial pilot target is a Nigeria-focused diaspora remittance fintech or cooperative already serving a verified user base but lacking compliant on-chain credit infrastructure. Each cooperative's pool launches capped in total liquidity (enforced on-chain), governed by a multisig (post hackathon), with the cap raised incrementally as repayment data validates the model. Defaults trigger A-Pass freezing; larger transactions generate Travel Rule reports on demand."*

---

## 5. Seamless Onboarding — OnchainKit / Coinbase Smart Wallet

**Decision: using OnchainKit** — Base-native, plugs directly into the existing wagmi setup. No portability concerns here since the chain decision is Base-only (§1).

**What it solves:**
- **Wallet creation** — passkey-based (Face ID/Touch ID) Smart Wallet creation via `<ConnectWallet>`. No seed phrase, no extension install.
- **Gas sponsorship** — via Coinbase Paymaster, on Base.

**UI language rule:** never show "wallet," "gas," "A-Pass," or "on-chain" in Amaka's or the admin's flow. Use "your AjoCred account," "verify your identity," "borrowing limit," etc.

### Two distinct addresses per user — do not conflate in UI
- **Smart Wallet address** — used to call `deposit()`/`borrow()`/`repay()`, holds aUSDC balance.
- **Cleanverse deposit address** (from `query_deposit_address`) — where a diaspora relative should send USDC. Amaka's "Receive Money" screen should show THIS address (with QR code), not her raw Smart Wallet address.

### Admin flow (cooperative) — on the admin-dashboard frontend
Registration (off-chain form + platform approval) → passkey login → dashboard shows pool liquidity/cap/borrowers → fund pool (`deposit()`, gas-sponsored) → adjust `minTier`/cap (gas-sponsored) → freeze defaulted borrowers (`update_status`) → export compliance reports (`download_travel_rule`) → Fiat Ramp on/off-ramp (§7b).

### Amaka flow — on the end-user frontend
Sign up via passkey → identity verification (`generate_apass`, gas-sponsored) → dashboard shows remittance history via `query_txs` as a plain-language timeline → browse cooperatives, pick one → borrow (gas-sponsored, `complianceVerify` gated) → repay (flat interest fee, gas-sponsored) → cash out via Fiat Ramp (§7b).

---

## 6. Demo-Specific Eligibility Window — do not hardcode "6 months"

```typescript
const OBSERVATION_WINDOW_SECONDS = Number(process.env.OBSERVATION_WINDOW_SECONDS); // production default: ~15,552,000 (6 months)
const MIN_QUALIFYING_DEPOSITS = Number(process.env.MIN_QUALIFYING_DEPOSITS); // production default: e.g. 3
```
For the demo: compress to e.g. `OBSERVATION_WINDOW_SECONDS=3600` and `MIN_QUALIFYING_DEPOSITS=2`. State this compression explicitly in the submission write-up.

**Demo sequencing:** fresh wallet signs up live → dashboard shows "0 of N qualifying deposits, not yet eligible" → switch to a pre-aged demo wallet (real faucet/whitelist deposits made across several real days before the demo) → show it borrowing successfully.

**Identity vs. creditworthiness — keep conceptually separate:** `complianceVerify()` (identity) passes instantly on verification. The inflow-history threshold (creditworthiness) is separate, only enforced in `borrow()`.

---

## 7. Real Remittance Conversion for the Demo — whitelist IS in scope

**Decision: build `add_whitelist_for_institutional` before the hackathon.** Self-service sandbox write, no Cleanverse approval workflow (unlike `atoken/launch` or `validator/grant`) — placeholder `entityName`/`license`/`logoUrl` values are normal and low-risk. Payoff: a genuine live conversion demo instead of a simulated one.

**Implementation steps:**
1. `POST /query_deposit_atoken_list` with `{chain: "base"}` → read `origin_token.address` (native USDC on Base).
2. Designate a second wallet as the "diaspora sender" (plays Amaka's relative in Toronto).
3. Host a placeholder logo at a real HTTPS URL.
4. `POST /atoken/add_whitelist_for_institutional` (encrypted) — `addressList`: `{chain: "base", symbol: "usdc", assetAddress: <from step 1>, walletAddresses: [<sender wallet address>]}`.
5. Demo: sender wallet sends testnet USDC to Amaka's `query_deposit_address` → auto-converts to aUSDC → shows up in `query_txs` → feeds her eligibility check live.

**Still verify, don't assume:** confirmation of whitelist→auto-conversion behavior came from Cleanverse's Telegram and was specific to Monad testnet — test the full loop on Base a day or two before demo day.

**Fallback:** faucet-simulation (`POST /faucet`, narrated as a stand-in) remains legitimate Plan B.

---

## 7b. Fiat Ramp — Integrated for Both User and Institution

**Status: already integrated.** Flow: `query_ramp_quote` → `create_ramp_widget_url` → redirect/embed widget → `query_ramp_order` polling.

**For Amaka (end-user frontend):** cash out borrowed or repaid aUSDC to NGN via bank transfer/mobile money — this is what makes AjoCred usable in real life rather than crypto-only. Surfaced as a plain-language "Withdraw to Bank" action, no ramp/widget/crypto vocabulary shown.

**For cooperative admins (admin-dashboard frontend):** fund their pool via fiat on-ramp (buy aUSDC with a bank transfer or card) rather than needing to already hold crypto, and off-ramp accrued interest back to fiat. Surfaced as "Add Funds" / "Withdraw Earnings" actions on the pool dashboard.

Eligibility note (from the API spec): the end-user wallet must have a registered, non-frozen A-Pass on the ramp's target chain — already satisfied by the existing `generate_apass` flow, no extra onboarding step needed.

## 7c. a landing page whose only job is to explain AjoCred and route people to the correct app via two clear CTAs — "I'm receiving remittances" → end-user app, "I represent a cooperative" → admin-dashboard app.

fold it into the end-user app's root route
Make / in the end-user frontend the landing page — hero copy, problem/solution explanation, two buttons. "Sign in / verify identity" stays on that same app (since that's its actual purpose), and "I'm a cooperative" is just a link/button that navigates to the admin-dashboard app's URL. Zero new infrastructure, no new workspace package, no new deployment — just one extra route/component. Given how much scope you've already built (whitelist, Fiat Ramp, cooperative multi-tenancy, on-chain default handling), I'd default here unless you have real spare time.


---

## 8. Explicitly Deferred / Roadmap-Only

- **Public/open liquidity provision** — share-based (ERC-4626-style) proportional interest accounting for non-cooperative depositors. Not built.
- **Cleanverse Factory Mode** (`validator/grant`, multi-pool via Cleanverse's own registrar) — rejected in favor of internal multi-tenancy (§3).
- **Time-accruing interest** — flat repayment fee used instead.
- **Multisig ownership** — confirmed post-hackathon roadmap item, not built for submission (see §4).

---

## 9. Commit Strategy — important, follow carefully

- Build and learn now (pre-Aug 8) — legitimate prep, not against the rules.
- Use git normally starting now — do not withhold commits while prepping.
- Keep the repo private (or unpushed) until ready.
- Push to public GitHub once, preserving full commit history, at or after Aug 8.
- Deliberately hold back genuine, substantial integration milestones for Aug 8–9 itself.

---

## 10. Tech Stack

| Layer | Choice |
|---|---|
| Smart contracts | Solidity, Hardhat (TypeScript) |
| Backend | NestJS (Node.js + TypeScript) |
| Frontend | Vite + React + TypeScript — TWO separate apps (end-user, admin-dashboard) |
| Wallet/chain interaction | wagmi + viem |
| Onboarding/wallet UX | OnchainKit (Coinbase Smart Wallet, passkey login, Paymaster gas sponsorship) |
| Encryption | Node's built-in `crypto` (AES-256/128-CBC depending on decoded key length) |
| Chain | Base only (Sepolia testnet for development) |

---

## 11. Credentials Handling — follow exactly, do not deviate

- **`api-id`** — plain HTTP header, never hardcoded or committed.
- **`api-key`** — never sent over the network; local AES key only. Treat as a real secret.
- Both live only in `backend/.env` (gitignored before first commit). `.env.example` holds placeholders only.
- Never paste real `api-id`/`api-key` values into the Antigravity chat window or into this brief or any committed file — reference only by env var name.
- Encrypted endpoints: `generate_apass`, `validator/register`, all `atoken/*` mutations, `add_whitelist_for_institutional`. Plain JSON: `query_apass`, `query_txs`, `validator/is_register`/`verify`/`rules`/`is_paused`, `query_deposit_atoken_list`, `query_deposit_address`, `verify_apass`, `faucet`, `update_status` is encrypted, `download_travel_rule` is plain, all `query_ramp_*`/`create_ramp_widget_url` are plain. Full detail in `docs/cleanverse-api-reference.md`.
- Sanity-check credentials with an isolated `curl` call before writing NestJS integration code.

---

## 12. Team Background (for submission form context)
Solo builder — software engineer with hands-on experience across Rust, Solana (Anchor, Pinocchio), Node.js, TypeScript, and Fastify. Currently building a separate USDC-based payments app for Nigerian users (KOLO), giving direct, practical experience with stablecoin rails, wallet infrastructure, and payment confirmation in the Nigerian market this project targets.-