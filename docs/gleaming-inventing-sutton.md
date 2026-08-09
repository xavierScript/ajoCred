# Plan: Four CVI·CVA depth features for AjoCred (hackathon)

## Context

The rubric audit found AjoCred's CVI·CVA integration genuine but **capped by a
maximally-permissive rule** ("holds any A-Pass") and by claims in the write-up that
aren't backed by code. These features close that gap by using the Cleanverse
primitives the way its own docs describe — CVI as a *risk parameter*, a real
default-consequence loop, compliance reporting, and fiat rails.

Every endpoint below was verified against `docs/cleanverse-api-reference.md` (exact
encryption mode, body shape, response shape, error codes). Two of the originally
requested features were changed after that verification:

- **Feature #1 (Institutional Whitelist) is DROPPED.** `add_whitelist_for_institutional`
  "applies **only to Wrapped A-Tokens that your institution has issued**"
  ([cleanverse-api-reference.md:1303](docs/cleanverse-api-reference.md#L1303)). AjoCred
  uses a **pre-existing** aUSDC it doesn't own (`deploy.ts:14` reads
  `AUSDC_TOKEN_ADDRESS` from env), so it cannot whitelist senders for that token
  without issuing its own wrapped token + redeploying the pool. User chose to drop it.
- **Feature #2's on-chain half is reframed as off-chain.** Multiple RuleV2s combine
  with **OR** logic ([:3617](docs/cleanverse-api-reference.md#L3617)), so adding a
  higher-tier rule via `addRuleV2FromContract` does **not** create tiers — everyone
  still passes via the permissive rule 0, and `complianceVerify` returns a single bool
  that `borrow()` can't branch on. Genuine tiering therefore lives in the **eligibility
  engine**: read the wallet's A-Pass tier and scale the borrowing cap.

**Constraints (user-confirmed):** no contract redeploy; the deployed pool
(`AjoCredPool.sol`) stays untouched. All four features are backend + frontend only.
None of the onboarding / deposit / borrow flows change behavior — these are additive.

**Build order (cheapest-to-done first):** #2 → #3 → #5 → #4.

---

## Cross-cutting: security of new admin endpoints

Feature #3 (freeze) is a **destructive Cleanverse mutation**, and the backend
currently has **no auth** on any route (`main.ts` only sets CORS). Shipping an
unauthenticated `POST /api/admin/freeze` on a network-exposed service is a real risk.

**Mitigation (in scope for this plan):** add one tiny `AdminGuard`
(`backend/src/common/admin/admin.guard.ts`) that checks an `x-admin-key` header
against a new `ADMIN_API_KEY` env var (added to `configuration.ts` under a new
`admin.apiKey` key). Apply it only to the new admin routes (freeze/unfreeze). If
`ADMIN_API_KEY` is unset, the guard denies (fail-closed). This does **not** touch the
existing unguarded `/api/pool/set-cap` — that's a separate pre-existing finding I'll
call out in the write-up, not silently rely on. No secret values are read/logged; the
key is provided by the operator via `.env`.

---

## Feature #2 — Tiered CVI as a risk parameter (off-chain)

**Goal:** higher-tier A-Pass holders get a higher borrowing cap. Turns
`complianceVerify` from a yes/no gate into a graded risk input, backed by the real
`tier` field from `query_apass`. The multiplier flows through the *existing*
eligibility → `CapActivation` → on-chain `setBorrowingCap` path with no change to
those components — a higher off-chain limit becomes a higher on-chain cap automatically.

**Verified facts:** `query_apass` (plain POST) returns `tier` (string) + `subTier`
(number) — [apass.service.ts:20-30](backend/src/apass/apass.service.ts#L20).
`min_tier` semantics are documented as "allowed if tier **greater than** this value"
([:461](docs/cleanverse-api-reference.md#L461)) — noted, but we're not setting an
on-chain rule boundary, so the strict-vs-inclusive ambiguity doesn't bite us.

**Backend changes:**
- **`ApassModule` must export `ApassService`** — it currently does not
  ([apass.module.ts](backend/src/apass/apass.module.ts)). Add `exports: [ApassService]`.
- **`EligibilityModule`** imports `ApassModule`
  ([eligibility.module.ts](backend/src/eligibility/eligibility.module.ts)).
- **`eligibility.service.ts`** — inject `ApassService`; in `calculate()`, fetch the
  A-Pass, parse `tier` to a number (guard NaN → tier 0), map tier → multiplier via a
  small explicit table, and apply it to `borrowingLimit`. Add `tier` and
  `tierMultiplier` to `EligibilityBreakdown` so the number stays legible (the card
  already shows the breakdown). Keep the base formula
  ([:63-66](backend/src/eligibility/eligibility.service.ts#L63)) intact — the
  multiplier is a **named factor on top**, not a rewrite.
  - Tier map (documented constant, conservative): e.g. `tier 0 → 1.0×`,
    `≥1 → 1.15×`, `≥2 → 1.3×` (final values confirmed against whatever tier a real
    A-Pass returns — see Verification; if every sandbox A-Pass is tier 0 we still ship
    the mechanism and document the mapping).
  - If `query_apass` fails (no A-Pass), fall back to tier 0 / 1.0× — never throw; this
    must not break the eligibility response for a wallet mid-onboarding.

**Frontend changes:**
- **`types/index.ts`** — add `tier: number; tierMultiplier: number;` to
  `EligibilityBreakdown`.
- **`EligibilityCard.tsx`** — add one stat/line: "A-Pass tier N — ×1.3 limit boost"
  so the tiering is visible in the demo. Purely additive to the existing card.

---

## Feature #3 — Freeze-on-default (real risk-mitigation loop)

**Goal:** an admin marks a borrower defaulted → backend calls `update_status` (freeze)
→ that wallet's `complianceVerify` flips to false → the existing on-chain
`onlyCompliant` gate ([AjoCredPool.sol:34-37](contracts/contracts/AjoCredPool.sol#L34))
blocks their next `deposit`/`borrow`/`withdraw`. No contract change: the loop closes
through the gate that's already there. Unfreeze reverses it.

**Verified facts:** `update_status` is an **ENCRYPTED** POST
([:114](docs/cleanverse-api-reference.md#L114), [:357](docs/cleanverse-api-reference.md#L357)).
Body: `status` "1"=activate / "2"=freeze (Yes), `wallet:{chain,address}` (Yes),
`blacklistReason`/`customerId`/`cvRecordId` (optional). Returns `{ txHash }`. **No
owner_signature.** Reuses the existing `postEncrypted` path — no new crypto code.

**Backend changes (new `admin` module, mirrors the `apass` trio):**
- `backend/src/admin/admin.service.ts` — inject `CleanverseClientService`;
  `setStatus(chain, address, status, reason?)` → `postEncrypted('/update_status',
  { status, blacklistReason, wallet: { chain, address } })`. `freeze`/`unfreeze`
  are thin wrappers (status "2"/"1").
- `backend/src/admin/admin.controller.ts` — `@Controller('api/admin')`, guarded by
  `AdminGuard`. `POST freeze` / `POST unfreeze` taking `{ address, chain?, reason? }`,
  returning `{ txHash }`. Follows the `pool.controller.ts` body-DTO style.
- `backend/src/admin/admin.module.ts` — imports `CleanverseModule`; register in
  `app.module.ts` ([app.module.ts:12](backend/src/app.module.ts#L12)).
- `configuration.ts` — add `admin: { apiKey: process.env.ADMIN_API_KEY }`.

**Frontend (demo affordance, deliberately minimal & clearly labeled):**
- The app has **no admin UI** today (confirmed). Rather than build a full admin
  surface, add a small **"Demo controls"** panel — gated behind a `VITE_ADMIN_KEY`
  env var so it's invisible in a normal build — that calls freeze/unfreeze for the
  connected wallet and sends the `x-admin-key` header.
  - `types` + `lib/api.ts` (`api.admin.freeze/unfreeze`) + `hooks/useBackend.ts`
    (`useFreeze`/`useUnfreeze` mutations) follow the standard add-an-endpoint pattern.
  - After the mutation resolves, invalidate the `["verify", address]` query so
    `ComplianceBadge`
    ([ComplianceBadge.tsx](frontend/src/components/dashboard/ComplianceBadge.tsx)) and
    the borrow gate visibly update.
- **Alternative if you'd rather ship no freeze UI:** expose it as a documented `curl`
  in the demo script only. Default is the hidden panel; decidable at build time.

---

## Feature #5 — Travel Rule report (compliance credibility, low effort)

**Goal:** for a repay/withdraw, generate a Travel Rule PDF via Cleanverse and surface
the download link — a concrete "compliance & interoperability" signal.

**Verified facts:** `download_travel_rule` is a **PLAIN** POST (NOT in the encrypted
list — [:110-133](docs/cleanverse-api-reference.md#L110)). Body: `txHash` (Yes),
`wallet:{chain,address}` (Yes), optional `customerId`/`cvRecordId`. Returns
`{ downloadUrl, fileName }`. **Caveat baked into the plan:** the doc says Travel Rule
reports want a **withdraw** txHash, and Transaction reports only cover "A-Token /
Wrapped A-Token transfers" ([:3100-3103](docs/cleanverse-api-reference.md#L3100)) —
so this is verified empirically against a real repay/withdraw tx before we commit UI
copy (see Verification). On an error/unsupported tx we degrade gracefully (show
"report unavailable for this tx") rather than fake a link.

**Backend changes (add to the existing `transactions` module — it's read-side):**
- `transactions.service.ts` — add `travelRule(chain, address, txHash)` →
  `postPlain('/download_travel_rule', { txHash, wallet: { chain, address } })`
  returning `{ downloadUrl, fileName }`.
- `transactions.controller.ts` — `GET api/transactions/travel-rule/:txHash?address=&chain=`
  (path-param + query, matching the module's existing `@Get(':address')` convention).

**Frontend changes:**
- `types` + `lib/api.ts` (`api.transactions.travelRule`) + `hooks/useBackend.ts`
  (lazy `useQuery`, `enabled:false`, `refetch()` on click — same pattern as
  `useDepositAddress`, [useBackend.ts:88](frontend/src/hooks/useBackend.ts#L88)).
- In `TxHistoryTable.tsx` (or the repay success state on `Borrow.tsx`), add a
  "Download Travel Rule report" action on eligible rows that opens `downloadUrl`.
  Additive; handles loading/error/unavailable states like the rest of the app.

---

## Feature #4 — Fiat Ramp (buy USDC / cash out) — its own module, sequenced last

**Goal:** Amaka can on-ramp fiat→USDC or off-ramp USDC→bank/mobile-money. The biggest
"real product" upgrade and a genuinely separate integration surface.

**Verified facts (all PLAIN JSON, no owner_signature —
[:2025](docs/cleanverse-api-reference.md#L2025), [:133](docs/cleanverse-api-reference.md#L133)):**
- `query_ramp_quote` — body `{fiatCurrency, cryptoCurrency, isBuyOrSell (BUY|SELL),
  network, paymentMethod, fiatAmount|cryptoAmount, partnerCustomerId?}` → quote object
  incl. single-use `quoteToken` (15-min validity). Errors `[400]`, `[BIZ_068]`.
- `create_ramp_widget_url` — body `{quoteToken, wallet:{address,chain}, email?, userIp?}`
  (do NOT resend price fields) → `{orderId, widgetUrl}`. Errors `[RM_001]` A-Pass not
  registered, `[RM_002]` A-Pass frozen, `[RM_007]` bad/reused quoteToken, `[RM_008]`
  chain≠quote network.
- `query_ramp_order` — body `{orderId}` → order object with `status` enum
  (`INIT`→…→`COMPLETED` / terminal `CANCELLED|FAILED|REFUNDED|EXPIRED`,
  [:2301-2310](docs/cleanverse-api-reference.md#L2301)). Errors `[RM_004]`,`[RM_005]`.
- Metadata (optional, all plain, `{}` body): `query_ramp_payment_methods`,
  `query_ramp_fiat_currencies`, `query_ramp_crypto_currencies`, `query_ramp_countries`.
- **Precondition:** wallet needs a registered, non-frozen A-Pass on the quoted chain
  ([:2038](docs/cleanverse-api-reference.md#L2038)) — which onboarding already creates.
  Synergy with #3: a frozen wallet gets `[RM_002]`.

**Backend changes (new `ramp` module — the brief already reserves `ramp/`,
[project-brief.md:156](docs/project-brief.md#L156)):**
- `ramp.service.ts` — `quote(params)`, `createWidget(params)`, `order(orderId)`,
  `paymentMethods()` — all `postPlain`. Interfaces declared in-file per house style.
- `ramp.controller.ts` — `@Controller('api/ramp')`: `POST quote`, `POST widget`,
  `GET order/:orderId`, `GET payment-methods`. No AdminGuard (user-facing).
- `ramp.module.ts` imports `CleanverseModule`; register in `app.module.ts`.

**Frontend changes:**
- `types` (`RampQuote`, `RampOrder`, `RampPaymentMethod`), `lib/api.ts` (`api.ramp.*`),
  `hooks/useBackend.ts` (`useRampQuote` mutation, `useRampWidget` mutation,
  `useRampOrder` polling `useQuery` with `refetchInterval` until terminal status).
- New page `pages/Ramp.tsx` + route in `App.tsx` (wallet-gated via `RequireWallet`),
  linked from the dashboard. Flow: pick side/amount → quote (show fees) → create widget
  → open `widgetUrl` (new tab) → poll `query_ramp_order` → status timeline mapping the
  enum to friendly labels. New components under `components/ramp/`; reuse
  `ActionForm`/`AmountField`/`SegmentedControl` where they fit.
- Handle RM_00x errors with specific messages (esp. RM_002 → "A-Pass frozen", tying
  back to #3).

---

## Verification (per feature — prove it, don't assume)

Restart backend after backend edits (`cd backend && npm run start:dev`).

**#2 Tiered CVI:**
1. `curl "localhost:3001/api/eligibility/<WALLET>?chain=base"` → response now includes
   `breakdown.tier` and `tierMultiplier`, and `borrowingLimit` reflects the multiplier.
2. Confirm the real `tier` value a sandbox A-Pass returns
   (`curl localhost:3001/api/apass/<WALLET>`) and set the multiplier table to match a
   tier that actually exists. If all sandbox passes are tier 0, document the mapping
   and demo the tier-0 path (mechanism still real).
3. Dashboard EligibilityCard shows the tier + boost line; no regression when a wallet
   has no A-Pass (falls back to 1.0×, no error).

**#3 Freeze-on-default:**
1. `curl -X POST localhost:3001/api/admin/freeze -H "x-admin-key: <KEY>" -H
   "content-type: application/json" -d '{"address":"<WALLET>"}'` → `{ txHash }`.
2. `curl -X POST localhost:3001/api/validator/verify ... {"userAddress":"<WALLET>"}`
   → `valid:false` after freeze. Unfreeze → `valid:true` again.
3. Guard check: freeze call **without** `x-admin-key` → 401/403.
4. In-app: freeze (hidden panel or curl) → dashboard ComplianceBadge flips to "Not
   verified" → borrow blocked. Unfreeze restores. **Use a throwaway wallet, not the
   primary demo wallet, to avoid locking the demo.**

**#5 Travel Rule:**
1. Do a real repay or withdraw on-chain to get a txHash, then
   `curl "localhost:3001/api/transactions/travel-rule/<TXHASH>?address=<WALLET>"`.
2. If it returns `{downloadUrl,fileName}` → wire the UI action. If it errors for our
   tx type → keep the endpoint but render "unavailable for this tx" and note the
   limitation in the demo script. **Empirical gate — no faked link.**

**#4 Fiat Ramp:**
1. `GET /api/ramp/payment-methods` for a valid `paymentMethod` id, then
   `POST /api/ramp/quote {"fiatCurrency":"USD","cryptoCurrency":"USDC","isBuyOrSell":"BUY","network":"base","paymentMethod":"<id>","fiatAmount":50}`
   → quote with `quoteToken`.
2. `POST /api/ramp/widget` with that quoteToken + wallet → `{orderId, widgetUrl}`.
3. `GET /api/ramp/order/<orderId>` → status `INIT`; confirm the polling hook advances
   the UI. (No real fiat payment needed to prove the surface — reaching
   `AWAITING_PAYMENT_FROM_USER` is enough.)
4. Frozen-wallet quote/widget → `[RM_002]` surfaces the friendly message.

**Global:** `npx tsc -b --noEmit` (frontend) + `npx tsc --noEmit` (backend) clean;
`npm run lint` clean in both; existing onboarding/deposit/borrow flows unchanged
(smoke-test each page renders and its primary action still works).

## Notes / constraints

- No secrets read, logged, or committed. `update_status` auth is the existing AES
  layer; `ADMIN_API_KEY` and `VITE_ADMIN_KEY` are new operator-supplied env vars —
  add them to `.env.example` (names only), never with values.
- No contract redeploy; `AjoCredPool.sol` untouched. Feature #3 relies on the
  already-deployed `onlyCompliant` gate.
- All changes additive; no existing API contract or response shape changes except the
  purely-additive new fields on `EligibilityBreakdown`.
- Pre-existing finding to surface (not fix here unless you want): `/api/pool/set-cap`
  and `/api/apass/generate` remain unauthenticated — the same class of risk the new
  AdminGuard addresses for freeze.
