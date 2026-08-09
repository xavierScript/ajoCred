AjoCred — Implementation Handoff: Milestones 4–7
You are continuing an in-flight project, not starting one. Another engineer built Milestones 1–3 and part of Milestone 4 with a specific architecture and style. Your job is to be a faithful extension of that work, not an independent architect. Treat the existing codebase as the source of truth. Match its patterns exactly. Do not refactor for taste, do not restructure folders, do not swap libraries, do not "improve" working code. Build on it.

0. Before you write a single line
Read the whole repo structure first. Run a tree/listing of contracts/, backend/, frontend/, admin-dashboard/, and docs/.
Read the authoritative plan and brief, fully:
docs/implementation_plan.md — this is the authoritative milestone spec. Everything you build must conform to it.
docs/project-brief.md — product intent, the 7 reserved module names, the plain-language copy rules.
docs/cleanverse-api-reference.md — the API contract for every Cleanverse call. Never assume an endpoint's shape, encryption mode, body, or response — look it up here and confirm before coding. This is a hard rule inherited from the project owner.
Study Milestones 1–3 to internalize the architecture (see §2 below). Read the actual files; do not guess.
Confirm the current state of Milestone 4 (see §4) — it is partially implemented. You are continuing it, not restarting it.
1. Standing constraints (non-negotiable, inherited from the project owner)
One milestone at a time. Stop after each for review and commit. Do not batch M4–M7.
Do not assume — verify. Confirm every Cleanverse call against docs/cleanverse-api-reference.md. Confirm backend routes/shapes by reading the controllers and services. Confirm on-chain function signatures against the ABI and AjoCredPool.sol.
Enhance, never break. The onboarding / deposit / borrow / wallet flows must keep working. New work is additive unless the plan explicitly requires a change.
Security: Never read, echo, log, or commit secrets. contracts/.env and backend/.env contain a live POOL_OWNER_PRIVATE_KEY and Cleanverse credentials — read those files only to extract non-secret addresses, never secret values. Any new env var goes into the relevant .env.example as a name only, never a value. If you find a network-exposed route without auth, flag it — do not silently rely on it.
No contract redeploy. contracts/contracts/AjoCredPool.sol is deployed on Base Sepolia and is frozen for M4–M7. All remaining work is backend + frontend only.
Keep the project in a working state after every milestone (typecheck + build + lint green — see §8).
Explain any decision that departs from the existing implementation, and prefer inferring from established patterns over inventing new ones when the docs are silent.
2. Architecture you must preserve
Monorepo, four apps:

contracts/ — Hardhat 3 + viem, Solidity ^0.8.28, OpenZeppelin. The deployed pool is AjoCredPool.sol (cooperative multi-tenancy, "Single-Contract Mode"). Deployed addresses (Base Sepolia, chainId 84532): pool 0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215, aUSDC token 0xaC0893567D43C3E7e6e35a72803df05416C1f20D. Contract is frozen — reference only.
backend/ — NestJS, the integration layer. Modules mirror one concern each: apass, transactions, eligibility, validator, pool, cooperative, admin, ramp, faucet, and common/ (contract client, Cleanverse client, AdminGuard). It reads chain state via viem and serializes all bigints to strings. AdminGuard checks an x-admin-key header against ADMIN_API_KEY and fails closed. Owner-signed on-chain txs (register cooperative, set cap) are executed server-side with the pool owner key.
frontend/ — the end-user app. React 19 + Vite, wagmi v2 + viem, TanStack Query, Tailwind v4 (@tailwindcss/vite), @/ path alias, react-router-dom v7, lucide-react, class-variance-authority. Wallet layer is CDP embedded wallets (email sign-in → instant self-custodial wallet) coexisting with external wallets (injected/Coinbase/WalletConnect) — see lib/wagmiConfig.ts, providers/Web3Provider.tsx, components/WalletButton.tsx. Do not alter the wallet layer.
admin-dashboard/ — the cooperative-admin app (Milestone 5). Currently a Vite scaffold; a prior automated attempt to build it may have left partial or no work — inspect it before assuming anything.
Frontend layering conventions (follow exactly):

On-chain reads/writes live in wagmi-hook wrappers: hooks/usePool.ts (pool actions, per-cooperative position), hooks/useToken.ts (ERC-20 decimals/symbol/balance/allowance/approve).
Backend HTTP goes through a single typed client lib/api.ts (request<T> helper + ApiError class), surfaced as TanStack Query/mutation hooks in hooks/useBackend.ts (shared retryUnlessClientError, staleTime).
Shared types mirror backend response shapes in types/index.ts.
Contract addresses/ABIs/explorer helpers in lib/contracts.ts.
UI primitives in components/ui/* (Button, Card, Stat, Badge, Skeleton, StateViews, Toast, etc.); feature components grouped by domain (components/pool/*, components/dashboard/*, components/landing/*, components/layout/*).
Amount handling: formatToken(value: bigint | string, decimals) renders base units (accepts stringified bigints from the backend); formatAmount(number) renders already-human numbers; parseToken for input. humanizeError(err) turns viem/fetch errors into short user sentences and already maps the pool's require() strings.
Coding style to match: file-top JSDoc explaining the why; concise inline comments only where they earn their place; types declared in-file (backend) or in types/index.ts (frontend); warm, plain, non-jargon user-facing copy. Reference code locations as file_path:line.

Contract v2 surface (the pool is multi-tenant — every mapping and action is keyed by coopId): registerCooperative(admin, maxLiquidity, minTier), updateCooperativeConfig(coopId, maxLiquidity, minTier), setCooperativeActive(coopId, bool), deposit(coopId, amount), borrow(coopId, amount), repay(coopId, amount), withdraw(coopId, amount), setBorrowingCap(coopId, user, cap); views getCooperative(coopId), cooperativeCount(), deposits/borrowings/borrowingCaps(coopId, address), availableLiquidity(); validator rule management + INTEREST_BPS. Cooperatives are 1-indexed (id 0 = none). A cooperative's totalLiquidity is its lendable pool (what a borrow draws against); maxLiquidity − totalLiquidity is remaining deposit capacity. Borrow ceiling for a member = min(borrowingCap − outstanding, coop.totalLiquidity).

Backend endpoints (confirm each by reading its controller before use):

GET /api/cooperatives → Cooperative[]; GET /api/cooperatives/:id → Cooperative; GET /api/cooperatives/:id/stats → CooperativeStats; GET /api/cooperatives/:id/position/:address → UserCoopPosition; POST /api/cooperatives/register (AdminGuard) {admin, maxLiquidity, minTier} → {txHash, coopId}.
POST /api/pool/:coopId/set-cap {address, cap} → {txHash} (owner-signed).
POST /api/admin/freeze (AdminGuard) {userAddress, reason?}; POST /api/admin/unfreeze (AdminGuard) {userAddress}.
GET /api/transactions/:address?chain=base; POST /api/transactions/travel-rule/:txHash → {success, txHash, reportUrl?, data?}.
GET /api/eligibility/:address?chain=base → {eligible, borrowingLimit, breakdown}; GET /api/apass/:address, POST /api/apass/generate; POST /api/validator/verify {userAddress, chain}.
Ramp: POST /api/ramp/quote, POST /api/ramp/widget {quoteToken, wallet:{address,chain}}, GET /api/ramp/order/:orderId, GET /api/ramp/payment-methods?fiatCurrency=USD (read backend/src/ramp/* to confirm bodies).
Faucet endpoints for testnet aUSDC.
Types Cooperative, CooperativeStats, UserCoopPosition already exist in both backend/src/cooperative/cooperative.service.ts and frontend/src/types/index.ts — use them; do not redefine.

Milestone 4 — End-user cooperative browsing + coopId data-layer rewire
Objective: Make the end-user app multi-tenant. A person browses cooperatives, joins one, and their dashboard, credit limit, and borrow/repay all scope to that cooperative's coopId. Deposit/withdraw is no longer an end-user action (it belongs to cooperative admins, in the admin dashboard). All user-facing copy is plain language.

⚠️ This milestone is PARTIALLY DONE. The following is already implemented and typecheck-consistent with each other — build on it, do not redo or revert it:

frontend/src/lib/abi/AjoCredPool.json — replaced with the v2 ABI (39 entries), copied from backend/src/common/contracts/abis/AjoCredPool.json.
types/index.ts — PoolStats/UserPoolPosition removed; Cooperative, CooperativeStats, UserCoopPosition added.
lib/api.ts — added api.cooperatives.{list,get,stats,position}; removed the dead api.pool.stats/position; api.pool.setCap now takes (coopId, address, cap) → POST /api/pool/${coopId}/set-cap.
hooks/useBackend.ts — added useCooperatives, useCooperative, useCoopStats, useCoopPosition; useSetCap mutation now takes {coopId, address, cap}.
hooks/usePool.ts — removed usePoolStats (the old getPoolStats no longer exists); usePoolPosition(coopId?: bigint, account?) is now coop-scoped via multicall on deposits/borrowings/borrowingCaps(coopId, address); usePoolAction(fn).execute(coopId: bigint, amount: bigint) now passes args: [coopId, amount].
hooks/useSelectedCoop.tsx — new SelectedCoopProvider + useSelectedCoop() context, localStorage-backed (ajocred.selectedCoopId).
types/qrcode.d.ts — ambient module declaration for qrcode (no @types published); only toDataURL is declared.
pages/Cooperatives.tsx — new browse-and-join page (card grid of cooperatives with pool size, capacity, utilization, min tier, and a Join/Leave button that sets the selected coop).
Remaining M4 work (implement in this order):

components/pool/ActionForm.tsx — add a required coopId: string prop; in submit() change write.execute(parsed) to write.execute(BigInt(coopId), parsed). Nothing else changes (the approve→write two-step stays).
components/pool/CapActivation.tsx — add a coopId: string prop; change the setCap.mutate({ address, cap }) call to setCap.mutate({ coopId, address, cap }).
pages/Borrow.tsx — read the selected coop via useSelectedCoop(). If none selected, render a prompt card linking to /cooperatives (mirror the existing empty-state style). Otherwise: usePoolPosition(BigInt(coopId), address) for the member position and useCoopStats(coopId) for the cooperative's lendable liquidity (stats.data.totalLiquidity, a stringified bigint — convert with BigInt(...)). Recompute borrowMax = min(borrowingCap − outstanding, coop.totalLiquidity). Pass coopId down to ActionForm and CapActivation. The old on-chain usePoolStats() call is gone — replace its role with the coop stat. Keep the borrow/repay segmented control and compliance gating intact.
pages/Dashboard.tsx — read the selected coop. If none, prompt to pick one (/cooperatives). Otherwise replace usePoolPosition(address) with usePoolPosition(BigInt(coopId), address). Add a "Receive money" card: render a QR of the connected address using qrcode's toDataURL(address) into an <img> (async in an effect; handle the loading state), plus the existing CopyButton. Keep ComplianceBadge, EligibilityCard, TxHistoryTable, DemoControls.
pages/Landing.tsx — convert to a clean two-audience split: "I'm receiving money from family" → /onboard; "I represent a cooperative" → the admin dashboard URL from a new VITE_ADMIN_URL env var (fall back to # if unset). Remove every /deposit link. Rewrite copy in plain language (no "liquidity", "aUSDC", "on-chain").
components/layout/Header.tsx — remove the /deposit nav item; add a /cooperatives item ("Cooperatives", Users icon from lucide).
App.tsx — remove the DepositPage import and its /deposit route; add a RequireWallet-guarded /cooperatives route rendering CooperativesPage; wrap the tree in SelectedCoopProvider (inside Web3Provider, around RouterProvider).
Delete pages/Deposit.tsx. components/pool/FaucetCard.tsx becomes orphaned — leave the file in place (it is still valid; an unused module is not a build/lint error). Confirm no other importer of Deposit/DepositPage remains.
frontend/.env.example — add VITE_ADMIN_URL= (name only, with a one-line comment).
Integration points: useSelectedCoop is the single source of the active coopId; Dashboard and Borrow both consume it. All writes go through usePoolAction (now coopId-aware); all coop reads through the new backend hooks or the coop-scoped usePoolPosition.

Testing/verification (M4): cd frontend && npx tsc -b --noEmit && npm run build && npm run lint all clean. Manually smoke-test: Landing renders both CTAs; Cooperatives lists and Join sets selection; Dashboard shows the coop-scoped position + QR; Borrow computes the right ceiling and borrow/repay still work end-to-end; onboarding and wallet connect are unchanged. Pre-existing lint note: there are ~8 no-explicit-any warnings in DemoControls.tsx, useBackend.ts (ramp), api.ts, and types/index.ts that predate this work — do not introduce new ones, and do not silently "fix" unrelated files unless the plan asks.

Milestone 5 — Cooperative admin dashboard (greenfield in admin-dashboard/)
Objective: A separate app for a cooperative admin to register/select a cooperative, fund and manage its pool, manage members and risk, produce compliance reports, and move fiat. This is where deposit/withdraw and cap/freeze actions live.

First step — reconcile prior partial work: Inspect admin-dashboard/ as it currently exists on disk (a previous automated attempt may have created files or left it as a bare scaffold). Run cd admin-dashboard && npx tsc --noEmit && npm run build. If valid partial work exists, continue from it as source of truth; if it's broken or absent, build it cleanly. Do not import across apps — copy shared code in.

Setup: Mirror frontend/package.json dependency versions exactly (React 19, wagmi v2, viem, TanStack Query, Tailwind v4 + @tailwindcss/vite, lucide-react, react-router-dom, class-variance-authority, clsx, tailwind-merge, and @coinbase/cdp-core|cdp-hooks|cdp-react|cdp-wagmi), then npm install. Replicate the CDP wallet layer verbatim from frontend/src/lib/wagmiConfig.ts, providers/Web3Provider.tsx, components/WalletButton.tsx. Copy/adapt the components/ui/* primitives, lib/utils.ts, lib/contracts.ts, index.css/Tailwind setup, and vite.config.ts so the visual system matches. Copy the v2 pool ABI and erc20.json. Env vars (names only in admin-dashboard/.env.example): VITE_API_URL, VITE_CDP_PROJECT_ID, VITE_WALLETCONNECT_PROJECT_ID, VITE_ADMIN_KEY, VITE_POOL_CONTRACT_ADDRESS, VITE_AUSDC_TOKEN_ADDRESS.

Sections (single shell + sidebar, wallet-gated except sign-in/register):

Sign in & Register — CDP email sign-in + external option; a form → POST /api/cooperatives/register (with x-admin-key); store the returned coopId as the active cooperative (localStorage). Also let the admin pick an existing cooperative from GET /api/cooperatives (e.g. those whose admin matches the connected address).
Overview — active cooperative GET /:id/stats as Stat cards (pool size, capacity left, min tier, active).
Fund pool — ERC-20 approve(pool, amount) then deposit(coopId, amount) from the admin's own account (they pay their own gas). Mirror the approve→write sequencing from frontend's ActionForm/usePool/useToken. Withdraw is the inverse (withdraw(coopId, amount)).
Members / Risk — input a member address → show GET /:id/position/:address + eligibility; Freeze/Unfreeze (/api/admin/*, x-admin-key); Set borrowing cap (POST /api/pool/:coopId/set-cap with {address, cap} in base units, converted from a human amount).
Compliance — Travel Rule: input a txHash → POST /api/transactions/travel-rule/:txHash → show reportUrl; if none/unsupported, show "report unavailable for this transaction" — never fabricate a link.
Fiat — "Add funds" (BUY) / "Withdraw earnings" (SELL): quote → widget (open widgetUrl in a new tab) → poll GET /api/ramp/order/:orderId until a terminal status. Surface ramp error codes with friendly messages (e.g. RM_002 → "account frozen").
Considerations: Keep it functional and demo-ready, not gold-plated (the owner is budget-constrained). Reuse Stat/Card/Button heavily. Use plain-language copy throughout (this satisfies M6 for this app).

Verification (M5): npx tsc --noEmit (or tsc -b) and npm run build both exit 0; lint clean if configured. Confirm each section calls the endpoints above with the right shapes; state plainly anything that can't be exercised without running backend + Cleanverse.

Milestone 6 — Plain-language copy sweep
Objective: Per docs/project-brief.md §5, remove crypto jargon from all user-facing text across frontend/ and admin-dashboard/. No "wallet", "gas", "on-chain", "A-Pass", "aUSDC", "liquidity", "remittance" (as jargon) in visible strings. Say "account", "sign in with email", "funds", "credit limit", "cooperative", "money received". Code identifiers, comments, and env var names stay technical.

Strategy: If you wrote plain copy while doing M4 and M5 (recommended), M6 becomes a verification sweep for stragglers. Grep the JSX/TSX for the banned terms in visible strings, fix labels/headings/descriptions/toasts/empty-states, and leave logic untouched. Do not change component structure or behavior — copy only.

Verification (M6): Both apps still typecheck/build/lint clean; a visual pass on each screen confirms no jargon in labels, buttons, toasts, or empty states; every primary action still works.

Milestone 7 — Whitelist integration + demo prep (LAST)
Objective: Institutional whitelist integration and end-to-end demo readiness.

Critical caveat — verify before building: docs/implementation_plan.md and docs/cleanverse-api-reference.md note that add_whitelist_for_institutional applies only to Wrapped A-Tokens the institution itself issued. AjoCred uses a pre-existing aUSDC it does not own, so a naive sender-whitelist for that token is not possible without issuing a wrapped token and redeploying the pool — which is out of scope (no redeploy). Re-read both docs and confirm the exact capability and body/response shape before writing any code. If the on-chain form isn't applicable, implement the documented off-chain/eligibility-side interpretation the plan describes, and explain the decision rather than forcing an unsupported call. Confirm the encryption mode (plain vs encrypted POST) from the API reference.

Likely shape (confirm against docs first): a new backend surface following the existing module pattern (service + controller mirroring apass/admin, reusing the existing Cleanverse client's plain/encrypted post path; guard any mutating admin route with AdminGuard), and a minimal admin-dashboard affordance to exercise it. New env vars → .env.example names only.

Demo prep: a short, reproducible demo script (browse → join cooperative → check limit → activate cap → borrow → repay; admin: register → fund → set cap → freeze/unfreeze → travel-rule → fiat). Confirm .env.example files list every required var. Do not commit secrets.

Verification (M7): the specific whitelist endpoint verified against the real Cleanverse sandbox where possible (or the limitation documented if it can't be); both apps build/lint clean; the full demo path runs against a live backend.

Global working rules (repeat)
Implement one milestone, then stop and summarize what you built, the files touched, the decisions made, the commands to run, and how to verify — then wait.
Confirm, don't assume; Cleanverse calls are verified against docs/cleanverse-api-reference.md, backend shapes against the controllers, on-chain sigs against the ABI.
Additive and non-breaking; no unrelated refactors; no behavior changes unless the plan requires them, and explain any that do.
Working state after every milestone: frontend npx tsc -b --noEmit && npm run build && npm run lint; backend npx tsc --noEmit && npm run lint (and npm run start:dev to smoke-test); contracts untouched.
Secrets never read, logged, or committed; new env vars land in .env.example as names only.
Where the docs are silent, infer from the existing patterns in this repo — do not introduce a new architecture.



i tried finishing m4 but unfortunately, it wasnt able to complete, so continue:

try and finish m4 and then rerender an updated prompt
Let me finish M4. First I'll verify the UI primitive signatures I'm relying on (Card/Badge/EmptyState props), then make the edits.

Read Card.tsx
Read Badge.tsx
Read StateViews.tsx
Read Page.tsx
Badge has no muted tone and I left two unused imports in Cooperatives.tsx. Fixing those before continuing.

Edit Cooperatives.tsx
Modified
Edit Cooperatives.tsx
Modified
Edit Cooperatives.tsx
Removed 1 line
Now the remaining page/component rewiring. Starting with the two components (ActionForm + CapActivation), which pages depend on.

Edit ActionForm.tsx
Added 2 lines
Edit ActionForm.tsx
Added 1 line
Edit ActionForm.tsx
Modified
Now CapActivation — add coopId prop and thread it into the setCap mutation.

Edit CapActivation.tsx
Added 2 lines
Edit CapActivation.tsx
Added 1 line
Edit CapActivation.tsx
Modified
Now the shared "select a cooperative" prompt, then the Borrow page rewire.

Write SelectCoopPrompt.tsx
38 lines
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/StateViews";

/**
 * Shown on the dashboard and borrow screens when the member hasn't joined a
 * cooperative yet. Everything downstream is scoped to a cooperative, so we
 * point them at the browse page before anything else can load.
 */
export function SelectCoopPrompt({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Page>
      <PageHeader eyebrow="Get started" title={title} />
      <Card>
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="Join a cooperative first"
          description={description}
          action={
            <Button asChild>
              <Link to="/cooperatives">Browse cooperatives</Link>
            </Button>
          }
        />
      </Card>
    </Page>
  );
}
Now the Borrow page — scope position to the coop, source lendable liquidity from useCoopStats, thread coopId into ActionForm/CapActivation.

Edit Borrow.tsx
Added 18 lines
Now the remaining Borrow.tsx pieces: the "available in pool" stat, the CapActivation and both ActionForm calls need coopId.

Edit Borrow.tsx
Modified
Edit Borrow.tsx
Added 1 line
Edit Borrow.tsx
Added 1 line
Edit Borrow.tsx
Added 1 line
Now the Receive-Money QR component, then the Dashboard rewire.

Write ReceiveMoney.tsx
57 lines
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * "Receive money" card: turns the member's account address into a scannable QR
 * so a sender can pay them directly. The address is still shown in full with a
 * copy button for anyone who'd rather paste it.
 */
export function ReceiveMoney({ address }: { address: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(address, { margin: 1, width: 200 })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        if (active) setQr(null);
      });
    return () => {
      active = false;
    };
  }, [address]);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <QrCode className="size-4 text-muted-foreground" />
        <CardTitle>Receive money</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="flex size-[200px] shrink-0 items-center justify-center rounded-lg border border-border bg-white p-2">
          {qr ? (
            <img src={qr} alt="QR code for your account address" className="size-full" />
          ) : (
            <Skeleton className="size-full" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            Share this code or your address to receive money from family and friends.
          </p>
          <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 sm:justify-start">
            <span className="min-w-0 break-all font-mono text-xs">{address}</span>
            <CopyButton value={address} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
Now the Dashboard rewire — coop-scoped position, select-coop guard, and the Receive-Money card.

Edit Dashboard.tsx
Added 13 lines
Now insert the Receive-Money card into the Dashboard body (after the address strip / demo controls).

Edit Dashboard.tsx
Added 7 lines
Now soften the most jargon-heavy Dashboard copy (M6 fold-in on files I'm already touching).

Edit Dashboard.tsx
Modified
Read Dashboard.tsx (lines 71-120)
Edit Dashboard.tsx
Modified
Edit Dashboard.tsx
Modified
Now the transaction-history section copy in Dashboard.

Read Dashboard.tsx (lines 141-185)
Edit Dashboard.tsx
Modified
Edit Dashboard.tsx
Modified
