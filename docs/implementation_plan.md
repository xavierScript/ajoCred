# AjoCred — Migration & Implementation Blueprint

## Phase 1 — Current State Understanding

### What Exists Today

| Layer | Status |
|---|---|
| **Smart contract** (`AjoCredPool.sol`) | Deployed, single-pool design — one global `deposits`, `borrowings`, `borrowingCaps` mapping. No cooperative multi-tenancy. |
| **Backend** (NestJS) | 10 modules: `apass`, `transactions`, `eligibility`, `pool`, `validator`, `faucet`, `admin`, `ramp`, `common/cleanverse`, `common/contracts`. All Cleanverse API integrations working. |
| **End-user frontend** (`frontend/`) | Full Vite + React app: Landing, Onboard, Dashboard, Deposit, Borrow, Ramp pages. Uses RainbowKit + wagmi. |
| **Admin dashboard** (`admin-dashboard/`) | **Scaffold only** — Vite boilerplate counter app. Zero AjoCred functionality. |
| **Shared package** (`shared/`) | Empty — `package.json` only, no exports. |
| **Wallet integration** | RainbowKit (MetaMask/WalletConnect). **No OnchainKit, no Coinbase Smart Wallet, no passkey login, no Paymaster gas sponsorship.** |
| **Contracts deployment** | `deployments/` directory is empty (deployed contract address in `.env` only). |

---

## Phase 2 — Gap Analysis

### Smart Contract

| Feature | Brief Requirement | Current State | Status |
|---|---|---|---|
| **Cooperative multi-tenancy** | `Cooperative` struct, `cooperatives` mapping, `cooperativeCount`, per-coop `deposits`/`borrowings` | Single global pool, no `coopId` concept | ❌ Missing |
| `registerCooperative(admin, maxLiquidity, minTier)` | Owner registers a cooperative with its own admin, liquidity cap, and min tier | Does not exist | ❌ Missing |
| `deposit(coopId, amount)` | Restricted to cooperative admin only, enforces `maxLiquidity` cap | Open to anyone (`deposit(amount)`), no cap | 🔄 Needs refactoring |
| `borrow(coopId, amount)` | Borrower picks a cooperative, compliance-gated | Global pool (`borrow(amount)`), no coop selection | 🔄 Needs refactoring |
| `repay()` with flat interest fee | "5% of principal" — NOT time-accruing | `repay(amount)` exists but charges NO interest (exact repay only) | 🟡 Partially implemented |
| `withdraw()` | LP withdrawal | Exists, compliance-gated | 🟡 Partially (needs coop context) |
| `onlyCompliant` modifier | `validator.complianceVerify(address(this), msg.sender)` inline in deposit/borrow/withdraw | ✅ Already implemented correctly | ✅ Done |
| `setBorrowingCap` | Owner-only cap setting | Exists, single-user caps | 🟡 Partially (needs coop context) |
| `setRuleV2FromContract` / `addRuleV2` / `removeRuleV2` / `getRulesV2` | Validator rule management | ✅ All present | ✅ Done |
| `getPoolStats()` | Returns totals + liquidity | Exists (global) | 🟡 Needs per-coop version |
| `availableLiquidity()` | Token balance based | ✅ Present | ✅ Done |

> **Conclusion:** The contract needs a **new version** with cooperative multi-tenancy baked in. The core patterns (compliance gating, borrowing caps, validator integration) carry over directly — it's primarily a data structure change from flat mappings to `coopId`-keyed nested mappings plus the `Cooperative` struct.

---

### Backend

| Module/Endpoint | Brief Requirement | Current State | Status |
|---|---|---|---|
| `apass` module | `generate_apass`, `query_apass` | ✅ Working | ✅ Done |
| `transactions` module | `query_txs`, `download_travel_rule` | ✅ Both endpoints present | ✅ Done |
| `eligibility` module | Tiered CVI risk multiplier from `query_apass` tier | ✅ Implemented with tier table | ✅ Done |
| `validator` module | `validator/verify` | ✅ Working | ✅ Done |
| `faucet` module | `faucet`, `query_deposit_address` | ✅ Working | ✅ Done |
| `admin` module | `update_status` (freeze/unfreeze), `AdminGuard` | ✅ Working | ✅ Done |
| `ramp` module | `query_ramp_quote`, `create_ramp_widget_url`, `query_ramp_order`, `query_ramp_payment_methods` | ✅ All 4 endpoints present | ✅ Done |
| `pool` module | On-chain reads/writes for `AjoCredPool` | ✅ Working (single pool) | 🔄 Needs refactoring for multi-coop |
| `common/cleanverse` | `postPlain`/`postEncrypted` client | ✅ Working | ✅ Done |
| `common/contracts` | viem public/wallet client | ✅ Working | 🔄 Needs ABI update for new contract |
| **Cooperative registration API** | Endpoint for institutions to register cooperatives | Does not exist | ❌ Missing |
| **Cooperative listing API** | Endpoint for borrowers to browse cooperatives | Does not exist | ❌ Missing |
| **Per-coop pool stats** | Stats per cooperative ID | Global stats only | ❌ Missing |
| **Per-coop borrow/deposit** | Coop-scoped operations | Global only | 🔄 Needs refactoring |
| `OBSERVATION_WINDOW_SECONDS` env var | Configurable lookback window (not hardcoded 6 months) | Hardcoded `LOOKBACK_MONTHS = 6` in eligibility service | 🔄 Needs refactoring |
| `MIN_QUALIFYING_DEPOSITS` env var | Configurable minimum deposits | Not implemented | ❌ Missing |
| **Whitelist integration** | `add_whitelist_for_institutional` | Not implemented (dropped in earlier plan, but new brief §7 says "build before hackathon") | ❌ Missing |

> **Conclusion:** Most Cleanverse integrations are done. The major gaps are:  cooperative multi-tenancy (mirrors the contract change), configurable eligibility window, and the whitelist endpoint.

---

### Frontend (End-User — `frontend/`)

| Feature | Brief Requirement | Current State | Status |
|---|---|---|---|
| **Landing page** | Two-CTA landing: "I'm receiving remittances" + "I represent a cooperative" | Landing exists but CTAs are "Check your limit" + "Provide liquidity" — no cooperative CTA, no link to admin-dashboard | 🔄 Needs refactoring |
| **Onboarding** | Passkey login (OnchainKit Smart Wallet), `generate_apass` | Onboard page exists with `generate_apass`, but uses RainbowKit (no passkeys, no gas sponsorship) | 🔄 Needs refactoring |
| **Dashboard** | Remittance history as "plain-language timeline", browse cooperatives | Dashboard exists but no cooperative browsing, history shown as table not timeline | 🟡 Partially |
| **Borrow** | Pick a cooperative → borrow from that coop's pool | Borrow page exists but assumes single global pool — no cooperative selection | 🔄 Needs refactoring |
| **Deposit** | Should NOT be on end-user frontend (institutions only fund pools) | Currently exists as a full Deposit page on end-user frontend | 🗑 Should be removed from end-user app |
| **Ramp** | "Withdraw to Bank" (off-ramp) as plain-language action | Exists as dedicated `/ramp` page with buy/sell toggle | 🟡 Partially (language needs de-crypto-ification) |
| **Wallet** | OnchainKit `<ConnectWallet>`, passkey-based Smart Wallet, Paymaster gas sponsorship | Uses RainbowKit, no OnchainKit, no gas sponsorship | 🔄 Needs refactoring |
| **UI language** | Never show "wallet", "gas", "A-Pass", "on-chain" | Currently shows these terms throughout | 🔄 Needs refactoring |
| **Two addresses distinction** | Smart Wallet address vs Cleanverse deposit address ("Receive Money" QR) | Not implemented — no deposit address QR screen | ❌ Missing |

---

### Admin Dashboard (`admin-dashboard/`)

| Feature | Brief Requirement | Current State | Status |
|---|---|---|---|
| **Entire admin dashboard** | Registration, pool dashboard (liquidity/cap/borrowers), fund pool, adjust minTier/cap, freeze defaulted borrowers, export compliance reports, fiat ramp on/off-ramp | **Vite boilerplate only — zero AjoCred code** | ❌ Missing entirely |

> **This is the single largest gap.** The admin-dashboard is a complete greenfield build.

---

### Shared Packages

| Feature | Brief Requirement | Current State | Status |
|---|---|---|---|
| Shared types/utilities | Contract ABIs, type definitions shared between frontend + admin-dashboard + backend | Empty package, no exports | ❌ Missing |

---

## Phase 3 — Component-by-Component Impact Analysis

### Smart Contracts

#### What must change

The contract needs a **rewrite** from a single-pool to a cooperative multi-tenant architecture. However, the core patterns port directly:

**New contract: `AjoCredPool.sol` v2**

```
New structs: Cooperative { admin, totalLiquidity, maxLiquidity, minTier, active }
New state:
  - mapping(uint256 => Cooperative) public cooperatives
  - uint256 public cooperativeCount  
  - mapping(uint256 => mapping(address => uint256)) public deposits   // coopId => LP => amount
  - mapping(uint256 => mapping(address => uint256)) public borrowings // coopId => borrower => amount

New functions:
  - registerCooperative(admin, maxLiquidity, minTier) → coopId  [onlyOwner]
  - deposit(coopId, amount)      — restricted to coop.admin only + cap check
  - borrow(coopId, amount)       — open to any compliant user
  - repay(coopId, amount)        — flat interest fee (e.g. 5% of principal)  
  - withdraw(coopId, amount)     — admin-only withdrawal
  - setBorrowingCap(coopId, user, cap)  [onlyOwner]

Preserved:
  - onlyCompliant modifier (complianceVerify) — unchanged
  - Validator rule management (setRuleV2, addRuleV2, removeRuleV2, getRulesV2)
  - availableLiquidity() — now per-coop or global

New events:
  - CooperativeRegistered(uint256 indexed coopId, address admin)
  - All existing events gain coopId parameter

Removed:
  - Global deposits/borrowings/borrowingCaps mappings (replaced by nested)
```

**Migration consideration:** This is a new deployment, not an upgrade. The new contract must be registered with Cleanverse's validator via `POST /validator/register` after deployment. Old contract state is lost (acceptable for hackathon).

**Deployment implications:** 
- New `deploy.ts` script with cooperative registration
- New `registerAndSetRule.ts` update for the new contract address
- Backend `.env` must update `POOL_CONTRACT_ADDRESS`

---

### Backend

**Endpoints to keep as-is:**
- `apass` module (generate, query) — no changes
- `transactions` module (query, travel-rule) — no changes  
- `validator` module (verify) — no changes
- `faucet` module (request, deposit-address) — no changes
- `admin` module (freeze, unfreeze) — no changes
- `ramp` module (quote, widget, order, payment-methods) — no changes
- `common/cleanverse` client — no changes

**Endpoints to modify:**
- `pool.service.ts` — all methods gain `coopId` parameter; ABI changes for nested mappings
- `pool.controller.ts` — routes gain `:coopId` path parameter
- `eligibility.service.ts` — configurable `OBSERVATION_WINDOW_SECONDS` and `MIN_QUALIFYING_DEPOSITS` from env
- `common/contracts/contract-client.service.ts` — new ABI JSON for v2 contract

**New endpoints needed:**
- `GET /api/cooperatives` — list all registered cooperatives
- `GET /api/cooperatives/:id` — single cooperative details
- `GET /api/cooperatives/:id/stats` — per-coop pool stats
- `GET /api/cooperatives/:id/position/:address` — user's position in specific coop
- `POST /api/cooperatives/register` — register new cooperative (admin-only)
- `POST /api/pool/:coopId/set-cap` — set borrowing cap per cooperative

**New service: Whitelist integration**
- `whitelist.service.ts` — calls `add_whitelist_for_institutional` (encrypted) and `query_deposit_atoken_list` (plain)
- Used for demo remittance conversion setup

---

### Frontend (End-User)

**Components to reuse:**
- All `components/ui/*` (Button, Card, Badge, Input, Stat, Skeleton, Toast, etc.)
- `components/layout/*` (AppLayout, Header, Page, ThemeToggle)
- `components/dashboard/ComplianceBadge.tsx`
- `components/dashboard/EligibilityCard.tsx`
- `components/pool/ActionForm.tsx` (with modification for coopId)
- `components/pool/CapActivation.tsx` (with modification for coopId)
- `hooks/useTheme.ts`, `hooks/usePool.ts` (refactored), `hooks/useToken.ts`
- `lib/utils.ts`

**Screens needing redesign:**
- `Landing.tsx` — add two-CTA split: "I'm receiving remittances" → `/onboard`, "I represent a cooperative" → admin-dashboard URL
- `Dashboard.tsx` — add cooperative browser/list, plain-language timeline instead of table
- `Borrow.tsx` — add cooperative selection step before borrow form
- `Ramp.tsx` — reframe as "Withdraw to Bank" (off-ramp focused), remove crypto vocabulary

**Pages to add:**
- "Receive Money" screen showing Cleanverse deposit address + QR code (distinct from Smart Wallet address)
- Cooperative detail/selection page

**Pages to remove from end-user app:**
- `Deposit.tsx` — deposit is institution-only in the new brief

**Routing changes:**
- Remove `/deposit` route from end-user app
- Add cooperative browsing routes

**Wallet/onboarding changes (major):**
- Replace RainbowKit with OnchainKit
- Add `@coinbase/onchainkit` dependency
- Use `<ConnectWallet>` for passkey-based Smart Wallet creation
- Configure Coinbase Paymaster for gas sponsorship
- Update `wagmiConfig.ts` for OnchainKit's provider pattern
- Update `Web3Provider.tsx` to use OnchainKit instead of RainbowKit

---

### Admin Dashboard (Greenfield Build)

This is entirely new. Needs:
- Same tech stack as end-user frontend (Vite + React + TypeScript)
- **Own** OnchainKit/wagmi setup (cooperative admins also use passkey wallets)
- **Own** API client (`lib/api.ts`) pointing to same backend
- Shared UI component library (either duplicate or use `shared/` package)

**Pages:**
1. Registration/login — passkey wallet + off-chain registration form
2. Pool dashboard — liquidity/cap/borrowers table, deposit/withdraw controls  
3. Fund pool — `deposit(coopId, amount)` form (gas-sponsored)
4. Settings — adjust `minTier`, liquidity cap
5. Risk management — freeze/unfreeze defaulted borrowers (`update_status`)
6. Compliance — Travel Rule report export (`download_travel_rule`)
7. Fiat Ramp — "Add Funds" (on-ramp) / "Withdraw Earnings" (off-ramp)

---

### Shared Packages

The `shared/` package should export:
- Contract ABI JSON (generated from Hardhat compilation)
- TypeScript type definitions shared between frontends and backend
- Contract addresses configuration
- Common utility functions

---

## Phase 4 — Implementation Roadmap

### Milestone 1: New Smart Contract
**Objective:** Deploy `AjoCredPool` v2 with cooperative multi-tenancy.

**Files affected:**
- `contracts/contracts/AjoCredPool.sol` — rewrite with `Cooperative` struct + nested mappings
- `contracts/scripts/deploy.ts` — update constructor args
- `contracts/scripts/registerAndSetRule.ts` — update for new contract address  

**Dependencies:** None — independent of backend/frontend.

**Expected outcome:** Contract deployed to Base Sepolia, registered with Cleanverse Validator, at least one test cooperative registered on-chain.

**Verification:** `npx hardhat test` passes; contract deployed and verified on BaseScan; `registerCooperative` tx succeeds.

---

### Milestone 2: Backend — Contract Integration Update
**Objective:** Update backend to work with the new multi-tenant contract.

**Files affected:**
- `backend/src/common/contracts/abis/AjoCredPool.json` — replace with v2 ABI
- `backend/src/pool/pool.service.ts` — all methods gain `coopId`
- `backend/src/pool/pool.controller.ts` — routes gain `:coopId`
- `backend/src/config/configuration.ts` — add `OBSERVATION_WINDOW_SECONDS`, `MIN_QUALIFYING_DEPOSITS`
- `backend/src/eligibility/eligibility.service.ts` — use env-configured window
- New: `backend/src/cooperative/cooperative.service.ts`
- New: `backend/src/cooperative/cooperative.controller.ts`
- New: `backend/src/cooperative/cooperative.module.ts`

**Dependencies:** Milestone 1 (new contract deployed).

**Expected outcome:** Backend compiles, cooperative list/detail endpoints work, pool operations accept `coopId`.

**Verification:** `npx tsc --noEmit` clean; `curl` smoke tests for cooperative endpoints return correct data.

---

### Milestone 3: OnchainKit Wallet Migration (End-User Frontend)
**Objective:** Replace RainbowKit with OnchainKit for passkey-based Smart Wallet + gas sponsorship.

**Files affected:**
- `frontend/package.json` — add `@coinbase/onchainkit`, remove `@rainbow-me/rainbowkit`
- `frontend/src/lib/wagmiConfig.ts` — OnchainKit config pattern
- `frontend/src/providers/Web3Provider.tsx` — replace RainbowKitProvider with OnchainKitProvider
- `frontend/src/components/WalletButton.tsx` — use OnchainKit `<ConnectWallet>`

**Dependencies:** None — purely frontend change, independent of contract.

**Expected outcome:** Passkey-based wallet creation works; transactions are gas-sponsored.

**Verification:** Connect via passkey, sign a test transaction, confirm gas was sponsored.

---

### Milestone 4: End-User Frontend — Cooperative Browsing + Updated Flows
**Objective:** Update the end-user frontend for cooperative multi-tenancy.

**Files affected:**
- `frontend/src/pages/Landing.tsx` — two-CTA split
- `frontend/src/pages/Dashboard.tsx` — cooperative browser, "Receive Money" QR
- `frontend/src/pages/Borrow.tsx` — cooperative selection before borrowing
- `frontend/src/App.tsx` — remove `/deposit` route, add cooperative routes
- `frontend/src/components/layout/Header.tsx` — remove Deposit nav link
- `frontend/src/hooks/useBackend.ts` — new cooperative hooks
- `frontend/src/lib/api.ts` — new cooperative API calls
- `frontend/src/types/index.ts` — cooperative types

**Dependencies:** Milestone 2 (backend cooperative endpoints).

**Expected outcome:** End-user can browse cooperatives, pick one, and borrow from it.

**Verification:** Full Amaka flow works end-to-end: sign up → verify → browse coops → borrow → repay.

---

### Milestone 5: Admin Dashboard — Greenfield Build
**Objective:** Build the cooperative admin dashboard from scratch.

**Files affected:**
- `admin-dashboard/src/*` — complete replacement of boilerplate
- `admin-dashboard/package.json` — add wagmi, viem, OnchainKit, tanstack-query, tailwind, lucide-react

**Dependencies:** Milestone 2 (backend APIs), Milestone 1 (contract).

**Expected outcome:** Admin can register, fund pool, view borrowers, freeze/unfreeze, export reports, on/off-ramp.

**Verification:** Full admin flow: register cooperative → fund pool → view borrowers → freeze a defaulter → download Travel Rule report → off-ramp earnings.

---

### Milestone 6: UI Language + UX Polish
**Objective:** De-crypto-ify all user-facing copy per brief §5.

**Files affected:** All frontend pages and components — copy changes only.

**Dependencies:** Milestones 3, 4, 5 complete.

**Expected outcome:** No "wallet", "gas", "A-Pass", "on-chain" in user-facing text.

**Verification:** Manual review of every screen.

---

### Milestone 7: Whitelist Integration + Demo Prep
**Objective:** Build `add_whitelist_for_institutional` endpoint for live conversion demo.

**Files affected:**
- New: `backend/src/whitelist/whitelist.service.ts`
- New: `backend/src/whitelist/whitelist.controller.ts`
- New: `backend/src/whitelist/whitelist.module.ts`

**Dependencies:** Valid Cleanverse credentials, aUSDC token address.

**Expected outcome:** Sender wallet can send testnet USDC to deposit address → auto-converts to aUSDC → appears in `query_txs`.

**Verification:** End-to-end conversion test per brief §7 steps 1–5.

---

## Phase 5 — Recommended Implementation Order

```
1. Smart Contract (Milestone 1)          ← Foundation — everything depends on this
     ↓
2. Backend Contract Integration (M2)     ← Backend must talk to new contract
     ↓
3. OnchainKit Migration (M3)             ← Can run in PARALLEL with M2
     ↓
4. End-User Frontend Update (M4)         ← Needs M2 + M3
     ↓
5. Admin Dashboard Build (M5)            ← Needs M2, can partially parallel M4
     ↓
6. UX Polish (M6)                        ← After both frontends are functional
     ↓
7. Whitelist + Demo Prep (M7)            ← Last — requires everything else working
```

**Why this order:**

1. **Contract first** — it defines the data model that every other layer depends on. Pool service, controller, frontend hooks, admin dashboard — all need the cooperative-aware ABI. Deploying the contract first unblocks everything downstream simultaneously.

2. **Backend second** — the backend is the integration layer between both frontends and the contract. Both frontends call the backend, not the contract directly (except for write transactions via wagmi). Getting the backend done means both frontends can be built against real endpoints.

3. **OnchainKit migration parallel with backend** — this is a purely frontend concern (replacing RainbowKit's provider + connect component). It has zero dependency on the contract or backend changes. Running it in parallel with M2 saves a day.

4. **End-user frontend before admin dashboard** — the end-user app already exists and needs modification, not a greenfield build. It's faster to get to a working demo with one modified app than one modified + one new. The admin dashboard is the largest single piece of new work and should start once the backend is stable.

5. **UX polish last** — changing copy is trivial but doing it too early means redoing it when screens change. Wait until screens are stable.

6. **Whitelist last** — it's a demo-day concern, not a structural one. If it doesn't work, the faucet fallback is fine.

---

## Phase 6 — End-to-End Validation

### End-User Frontend (Amaka Flow)
1. **Sign up** → passkey creates Smart Wallet (OnchainKit) ✅ (M3)
2. **Verify identity** → `generate_apass` (gas-sponsored) ✅ (existing + M3)
3. **Dashboard** → remittance history from `query_txs` as timeline ✅ (M4)
4. **Receive Money** → shows Cleanverse deposit address + QR ✅ (M4)
5. **Browse cooperatives** → list from `GET /api/cooperatives` ✅ (M2 + M4)
6. **Pick cooperative + borrow** → `borrow(coopId, amount)` gas-sponsored ✅ (M1 + M2 + M4)
7. **Repay** → `repay(coopId, amount)` with flat interest ✅ (M1 + M4)
8. **Cash out** → fiat off-ramp "Withdraw to Bank" ✅ (existing ramp module)

### Admin Dashboard (Cooperative Flow)
1. **Registration** → off-chain form + passkey login ✅ (M5)
2. **Pool dashboard** → shows liquidity, cap, borrower list ✅ (M2 + M5)
3. **Fund pool** → `deposit(coopId, amount)` gas-sponsored ✅ (M1 + M5)
4. **Adjust settings** → `minTier`, cap updates ✅ (M5)
5. **Freeze defaulted borrower** → `update_status` via admin module ✅ (existing + M5)
6. **Export compliance report** → `download_travel_rule` ✅ (existing + M5)
7. **Fiat ramp** → "Add Funds" / "Withdraw Earnings" ✅ (existing ramp module + M5)

### Backend ↔ Cleanverse
- All existing integrations preserved (apass, transactions, validator, faucet, ramp, admin)
- New cooperative endpoints read on-chain state via updated pool service
- Eligibility uses configurable observation window

### Backend ↔ Smart Contract
- Updated pool service reads cooperative-scoped state via new ABI
- `setBorrowingCap` gains `coopId` parameter
- Contract client service loads new ABI JSON

### Smart Contract ↔ Cleanverse Validator
- New contract registered via `POST /validator/register`
- `complianceVerify(address(this), msg.sender)` works identically — address changes, logic doesn't
- Rule management (setRuleV2, addRuleV2) works identically

> [!IMPORTANT]
> The complete user flow described in the project brief is achievable with these milestones executed in order. The heaviest lift is the admin dashboard (M5) since it's greenfield, followed by the contract rewrite (M1). All other milestones are modifications to existing, working code.

> [!WARNING]  
> **48-hour hackathon constraint.** Given the scope, prioritization is critical. If time runs short, the recommended cut order is: M7 (whitelist — use faucet fallback) → M6 (polish — functional > pretty) → trim M5 (ship admin dashboard with core flows only, defer compliance reports and fiat ramp to curl demos).
