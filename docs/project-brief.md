# AjoCred — Project Brief for Antigravity

## What this document is

Full context for building AjoCred: a DeFi lending product for the Cleanverse Build: Trusted Assets Hackathon. Read this fully before writing any code. Ask clarifying questions on anything ambiguous rather than assuming.

---

## 1. The Hackathon — Context & Stakes

**Event:** Cleanverse Build: Trusted Assets Hackathon, supported by Monad Foundation.
**Track:** DeFi (Track 02) — NOT RWA.
**Key dates (UTC):**

- Registration: Jul 21 – Aug 7 (already done — registered as "Team AjoCred")
- **Hacking period: Aug 8 00:00 – Aug 9 23:59** (48 hours)
- Submission deadline: Aug 9 23:59 UTC, via email to isaac@cleanverse.com
- Winners announced: Aug 14
  **Prize:** $16K total pool (aUSDC), top 3 per track: 5,000 / 2,000 / 1,000 aUSDC.

**Team:** Solo builder (David). No teammates.

**Goal: win 1st place**, not just place. This shapes every prioritization decision below.

### Judging Criteria (out of 100)

| Criterion                        | Points | What it rewards                               |
| -------------------------------- | ------ | --------------------------------------------- |
| Concept & Problem Definition     | 20     | Clear, real, well-articulated problem         |
| **Depth of CVI·CVA Integration** | **30** | **Highest weight — do NOT under-invest here** |
| Build Quality                    | 25     | Working, deployed, live — not narrated/mocked |
| UX & Demo                        | 15     | Clear story/persona, not just feature tour    |
| Scalability Potential            | 10     | Expansion path, pilot plausibility            |

**Additional Considerations (qualitative, not separately scored but referenced):** use Cleanverse primitives meaningfully; solve real financial infrastructure problems; pilotable with institutions/merchants; improve trust/compliance/interoperability; demonstrate clear user value; technically feasible beyond the hackathon.

### Key strategic takeaways

- **30/100 points are integration depth** — bigger than build quality. Most competing teams will under-invest here by treating CVI/CVA as a checkbox. This is the biggest lever for differentiation.
- DeFi track technically only requires CVI **or** CVA — we are deliberately doing **both, deeply**, since we have runway. This is a differentiator, not a requirement.
- A smaller, fully-working slice beats a bigger, partially-broken one.
- **Commit history during Aug 8–9 UTC is a stated submission requirement.** We are building/learning now (Aug 4 onward) as prep, but genuine, substantial commits must land during the actual hacking window — see "Commit Strategy" below. Do not front-load all real work into a single pre-window or instant-dump commit; that reads as fabricated either way.

---

## 2. The Product — AjoCred

**One-liner:** AjoCred turns diaspora remittance history into instant, collateral-free credit for recipients in Nigeria, using Cleanverse's verified identity (CVI) and verified assets (CVA) as the trust layer.

**The problem:** Nigerians receiving regular diaspora remittances have real, provable income that is invisible to the formal financial system — no collateral, no recognized credit history, so they're locked out of bank credit and pushed toward predatory loan apps.

**The mechanism:**

1. Diaspora relative sends stablecoin (CVA-wrapped `ausdc`) to a recipient's wallet in Nigeria.
2. Recipient completes one-time CVI verification (A-Pass) tied to their wallet.
3. Their on-chain inflow history (via `query_txs`) becomes a transparent, verifiable "credit file" — no bank paperwork.
4. A smart contract lending pool (funded by depositors/LPs, not just admin-seeded) gates borrowing eligibility via Cleanverse's on-chain Validator (`validator/verify`), checking the wallet's A-Pass attributes against pool rules.
5. Eligible wallets borrow against their verified inflow pattern — no collateral required, but borrowing caps are deliberately conservative (a fraction of verified average monthly inflow), not aggressive multiples.

**Demo persona:** Amaka, in Lagos, receiving remittances from a relative in Toronto.

**Two-sided pool — important, not to be dropped:** The pool must have a real `deposit()` function so liquidity providers can genuinely fund it (even if, in the demo, that LP is a second wallet/account controlled by David). This must not be reduced to "admin tops up the pool via faucet" — that undersells the actual DeFi mechanic and weakens the answer to "who funds this, and is it risky." Under-collateralized lending risk is real and openly acknowledged in the roadmap (conservative caps, gradual limit increases, future reserve fund) — not solved in the hackathon, but not hand-waved either.

**Why CVI is essential:** Without identity verification, the protocol has no way to distinguish a real remittance recipient from an anonymous wallet gaming the system with fake self-transfers. CVI is the trust root the entire lending decision depends on.

**Why CVA is essential — precise framing (revised, corrects an earlier looser framing):**

- CVA (`ausdc`, an A-Token) _can_ enforce compliance rules automatically at the token level (its `_update` function checks `complianceVerify` on both sender and receiver on every transfer) — but **only when the token's Pool+Fee addresses have been registered via `registerApass`, which can only be called by a Factory contract holding `REGISTER_ROLE`.**
- AjoCred is **Single-Contract Mode** (see §3.5) — no Factory — so we do **not** get this automatic token-level enforcement "for free." Do not claim a second independent CVA-level compliance checkpoint in the submission write-up; that would overclaim what Single-Contract Mode actually provides.
- What AjoCred _does_ get, correctly stated: **one on-chain compliance checkpoint enforced directly inside our own contract** — `AjoCredPool` calls `validator.complianceVerify(address(this), msg.sender)` inline in `deposit()`, `borrow()`, and `withdraw()`. This is still a strong, legitimate integration (real on-chain enforcement, not an off-chain app-layer check) — just be precise that it's one checkpoint we built, not two independent layers.
- Do not describe CVA as providing an on-chain "audit trail" or "traceable origin" metadata baked into the token itself — the docs don't support that framing. Audit trail / reporting comes from `download_travel_rule` and `query_txs`, which are separate REST endpoints.

**Chain decision: Base, not Monad.** Rationale: zero prior EVM experience + solo + 48-hour build window means standard, extremely well-documented EVM tooling (Hardhat, viem, OpenZeppelin) beats a newer, less battle-tested chain, even though Monad is the hackathon's headline sponsor. Judging criteria do not weight chain choice — they weight integration depth and build quality, which a working product on Base delivers better than a struggling one on Monad. Confirm Cleanverse's CVI/CVA API/SDK examples aren't Monad-specific before committing further (Base is listed as a supported chain in the docs, so this should be a non-issue, but verify).

---

## 3. Tech Stack (decided, with rationale)

| Layer                       | Choice                                                 | Why                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart contracts             | Solidity                                               | Only option for EVM/Base                                                                                                                                                                                                                                                                                                                                                                                      |
| Contract framework          | Hardhat (TypeScript)                                   | Reuses existing TS/Node skill; avoids learning Foundry's Rust-flavored tooling on top of EVM at the same time                                                                                                                                                                                                                                                                                                 |
| Backend                     | **NestJS** (Node.js + TypeScript)                      | Chosen over Fastify (David's more familiar stack) specifically because the "close to full production" ambition benefits from NestJS's modular structure and DI — Cleanverse's own API is split into clean modules (A-Pass, Validator, Common Queries) that map naturally onto NestJS feature modules. Trade-off acknowledged: real learning curve on top of the EVM learning curve — budget time accordingly. |
| Frontend                    | Vite + React + TypeScript                              | Faster dev loop than Next.js; no SSR/SEO need for a hackathon demo                                                                                                                                                                                                                                                                                                                                            |
| Wallet/chain interaction    | wagmi + viem                                           | Current standard, better docs/errors than ethers v5 — important given zero prior EVM experience                                                                                                                                                                                                                                                                                                               |
| Wallet connect UI           | RainbowKit or ConnectKit                               | Off-the-shelf, no payoff in building this by hand                                                                                                                                                                                                                                                                                                                                                             |
| Encryption                  | Node's built-in `crypto` (AES-256-CBC)                 | Matches Cleanverse's exact spec (AES/CBC/PKCS5, fixed zero IV) — no extra dependency needed                                                                                                                                                                                                                                                                                                                   |
| Database (production phase) | PostgreSQL + Prisma                                    | Only needed once persistent user/loan records matter beyond what's on-chain                                                                                                                                                                                                                                                                                                                                   |
| MCP tooling                 | Base Layer 2 MCP server (already added to Antigravity) | Gives the agent live read/write access to Base — separate concern from Cleanverse API knowledge, which is domain knowledge, not a tool                                                                                                                                                                                                                                                                        |

### 3.5 On-Chain Validator Integration (CCP) — supersedes REST-only plan

Discovered a second Cleanverse doc — the **CCP (Cleanverse Compliance Protocol) Integration Guide** — describing the actual on-chain `IAPassComplianceValidator` Solidity interface. This is a deeper integration path than the REST `POST /validator/verify` call described in the main API spec, and changes how compliance gating is implemented:

- **Two integration patterns exist: Factory Mode (multi-pool) and Single-Contract Mode (one pool, no factory).** AjoCred is **Single-Contract Mode** — solo builder, one pool, no need to spin up multiple pools dynamically. This also confirms `validator/grant` (Factory `REGISTER_ROLE`) stays correctly out of scope.
- **The pool contract calls `complianceVerify(poolAddress, userAddress)` directly, on-chain, inline** inside `deposit()`, `borrow()`, and `withdraw()` — reverting the transaction if the caller doesn't qualify. This replaces the earlier plan of the backend calling REST `validator/verify` and relaying a yes/no to the contract. On-chain inline enforcement is the stronger, more legitimate integration and should be the headline technical detail in the demo and submission write-up.
- **Registration flow:** deploy `AjoCredPool` → `POST /api/cooperate/validator/register` with `owner_signature` (EIP-191 personal_sign over `keccak256(chain + contract_address)`, lowercase hex, no separator) → then call `setRuleV2FromContract(rule)` as contract owner to set the compliance rule on-chain.
- **On-chain `RuleV2` struct is NOT the same shape as the REST API's rule object** — do not mix these up:
  - REST (off-chain, A-Token rules): `{allowed_group: string, allowed_sub_group: string, min_tier: int, min_sub_tier: int, is_black_list: bool, countries: string[]}`
  - On-chain (`RuleV2`, used by the Validator contract): `{allowedGroup: bytes2, allowedSubGroup: bytes2, minTier: uint8, minSubTier: uint8, poolCountryBitmap: uint256}` — countries are a **bitmap**, not an array.
  - Fields within one `RuleV2` are AND'd; multiple `RuleV2`s on the same pool are OR'd (alternate qualifying paths, not additional constraints).
- **Reference contract template** (`CompliantLending` from the CCP guide) is almost a direct match for `AjoCredPool` — `deposit()` / `borrow()` / `withdraw()`, each gated by `complianceVerify`. Use it as the base shape:

```solidity
import {IAPassComplianceValidator} from "./IAPassComplianceValidator.sol";

contract AjoCredPool is Ownable {
    IAPassComplianceValidator public immutable validator;
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrowings;

    constructor(address validator_) {
        validator = IAPassComplianceValidator(validator_);
    }

    function deposit(uint256 amount) external {
        require(validator.complianceVerify(address(this), msg.sender), "A-Pass not qualified");
        deposits[msg.sender] += amount;
        // transferFrom + accounting logic
    }

    function borrow(uint256 amount) external {
        require(validator.complianceVerify(address(this), msg.sender), "A-Pass not qualified");
        // risk-engine-derived cap check here
        borrowings[msg.sender] += amount;
    }
}
```

- The REST `validator/verify` endpoint isn't wasted — keep using it in the **frontend/backend for off-chain UI purposes** (e.g. showing "you're eligible to borrow" before the user even submits a transaction), but the actual enforcement judges should see is the on-chain `complianceVerify` call reverting/succeeding a real transaction.

---

## 4. Repo Structure (NestJS backend version)

```
ajocred/
├── contracts/                          # Hardhat project
│   ├── contracts/
│   │   ├── AjoCredPool.sol             # deposit(), verify-gated borrow(), repay() — calls complianceVerify() inline
│   │   └── interfaces/
│   │       └── IAPassComplianceValidator.sol  # Cleanverse's on-chain Validator interface (RuleV2, complianceVerify, setRuleV2FromContract etc.)
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── registerAndSetRule.ts       # Calls POST /validator/register, then setRuleV2FromContract on-chain
│   ├── test/AjoCredPool.test.ts
│   └── hardhat.config.ts
│
├── backend/                             # NestJS
│   ├── src/
│   │   ├── apass/                      # generate_apass, query_apass, verify_apass
│   │   ├── transactions/               # query_txs → feeds risk calc
│   │   ├── loans/                      # loan request/repay, risk-engine.service.ts
│   │   ├── pool/                       # reads/writes AjoCredPool.sol via viem
│   │   ├── validator/                  # register (REST, one-time setup) + verify (REST, off-chain UI hint only — real enforcement is on-chain, see §3.5)
│   │   ├── ramp/                       # [production only, post-hackathon]
│   │   ├── webhooks/                   # [production only, if we ever issue our own A-Token]
│   │   ├── common/
│   │   │   ├── cleanverse/             # cleanverse-client.service.ts, encryption.service.ts
│   │   │   └── contracts/              # contract-client.service.ts (viem setup)
│   │   ├── config/configuration.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── test/
│
├── frontend/                            # Vite + React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Onboard.tsx             # wallet connect + A-Pass verification
│   │   │   ├── Dashboard.tsx           # tx history, eligibility, borrowing limit
│   │   │   ├── Deposit.tsx             # LP deposit flow — shows pool TVL
│   │   │   └── Borrow.tsx              # loan request + live validator/verify result
│   │   ├── components/
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── TxHistoryTable.tsx
│   │   │   └── ComplianceStatusBadge.tsx
│   │   ├── hooks/useAjoCredPool.ts
│   │   └── lib/{wagmiConfig.ts, abi/}
│
├── shared/types.ts
├── docs/
│   ├── demo-script.md                  # Amaka persona walkthrough
│   ├── submission-summary.md           # required one-pager for submission
│   └── cleanverse-api-reference.md     # trimmed, hackathon-scoped endpoint reference (see below)
├── .env.example
└── README.md
```

**Endpoints in scope for the hackathon build** (do not build beyond these unless explicitly asked):

- `generate_apass`, `query_apass` (A-Pass)
- `query_txs` (transaction history)
- `validator/register`, `validator/set_rule`, `validator/verify` (Validator Compliance)
- `query_deposit_atoken_list`, `query_deposit_address` (existing `ausdc` A-Token, not issuing our own)
- `faucet` (sandbox test funds only)

**Explicitly out of scope for the hackathon** (production roadmap only — do not build unless asked):

- `atoken/launch` and all issuance/registration/wrapped-token endpoints (too much async approval overhead for 48 hours)
- Institutional deposit whitelist endpoints
- Fiat Ramp (all `/query_ramp_*`, `create_ramp_widget_url`, `query_ramp_order`)
- `download_travel_rule`
- `update_status`, `query_apass_list` (back-office tools, not the live borrower flow)
- `validator/grant` (only needed for multi-pool architecture)

---

## 5. Commit Strategy — important, follow carefully

- Build and learn now (Aug 4 onward) — this is legitimate prep, not against the rules.
- **Use git normally starting now.** Do not withhold commits or avoid version control while prepping — that's both bad practice and produces a suspicious-looking single-dump commit history later.
- Keep the repo private (or unpushed) until ready.
- Push to public GitHub once, preserving full commit history, at or after Aug 8. GitHub preserves real author/commit dates regardless of push time — this gives judges an honest, visible multi-day arc (prep before the window, real integration work during it), which reads as credible.
- **Deliberately hold back genuine, substantial integration milestones for Aug 8–9 itself** — not cosmetic polish, but real work: end-to-end wiring, testnet deployment, `validator/verify` actually gating a live transaction, real debugging. This needs to visibly happen inside the window.

---

## 6. Team Background (for submission form context)

Solo builder — software engineer with hands-on experience across Rust, Solana (Anchor, Pinocchio), Node.js, TypeScript, and Fastify. Currently building a separate USDC-based payments app for Nigerian users (KOLO), giving direct, practical experience with stablecoin rails, wallet infrastructure, and payment confirmation in the Nigerian market this project targets.

---

## 7. Credentials Handling — follow exactly, do not deviate

We have received a **Sandbox API Id** and **Sandbox API Key** from Cleanverse's welcome email. These are not interchangeable and are used differently:

- **`api-id`** — sent as a plain HTTP header (`api-id: ...`) on every Cleanverse request. Identifies our institution. Not sent as a secret, but still never hardcoded or committed.
- **`api-key`** — **never sent over the network, ever.** Per the docs, it's used _locally_ only, as the AES encryption/decryption key for endpoints that require encrypted bodies. Treat this as a real secret.

### Storage

- Both values live only in `backend/.env` (local, gitignored) — never in code, never in this brief, never in any file committed to the repo.
- `.env` must be added to `.gitignore` **before the first commit**, not after.
- `backend/.env.example` holds only placeholder keys (`CLEANVERSE_API_ID=`, `CLEANVERSE_API_KEY=`) with no real values, so the shape is visible without exposing secrets.
- Load via `@nestjs/config` in `config/configuration.ts`, exposing `cleanverse.apiId`, `cleanverse.apiKey`, `cleanverse.baseUrl`.

### Encryption implementation (`common/cleanverse/encryption.service.ts`)

Implements the exact spec from the docs: AES/CBC/PKCS5Padding, fixed IV of 16 zero bytes, key = Base64-decoded `api-key`. Node's built-in `crypto` module, no external dependency needed.

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly iv = Buffer.alloc(16, 0); // fixed 16 zero bytes

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("cleanverse.apiKey");
    this.key = Buffer.from(apiKey, "base64"); // decode api-key first
  }

  encrypt(plainObj: unknown): string {
    const json = JSON.stringify(plainObj);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.key, this.iv);
    const encrypted = Buffer.concat([
      cipher.update(json, "utf8"),
      cipher.final(),
    ]);
    return encrypted.toString("base64");
  }

  decrypt(base64Ciphertext: string): unknown {
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.key, this.iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(base64Ciphertext, "base64")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
  }
}
```

**Verify once real credentials are in hand:** `aes-256-cbc` requires a 32-byte key after Base64 decoding. If the decoded `api-key` is 16 bytes instead, switch to `aes-128-cbc`. The docs only say "AES" without specifying key size — let the actual decoded length decide.

### Which endpoints need encryption vs. plain JSON

Encrypted (wrap as `{"data": "<Base64 ciphertext>"}`): `generate_apass`, `update_status`, `validator/grant`, `validator/register`, `validator/set_rule`/`add_rule`/`remove_rule`/`set_paused`, all `atoken/*` mutation endpoints.
Plain JSON (no encryption): `query_apass`, `query_txs`, `validator/is_register`, `validator/rules`, `validator/verify`, `validator/is_paused`, all Fiat Ramp endpoints.
`cleanverse-client.service.ts` should expose both `postEncrypted()` and `postPlain()` methods so each route calls the correct one.

### Sanity check before writing NestJS integration code

Test credentials directly with `curl` first, isolated from the app, against a plain-JSON endpoint (so it only tests `api-id`, not AES setup):

```bash
curl -X POST https://uatapi.cleanverse.com/api/cooperate/query_apass \
  -H "Content-Type: application/json" \
  -H "api-id: YOUR_SANDBOX_API_ID" \
  -d '{"chain": "base", "address": "0x0000000000000000000000000000000000dEaD"}'
```

A `0002`-style "not found" response confirms auth is working (the address just doesn't have an A-Pass). A `403 Forbidden` means the `api-id` itself is wrong or not yet activated — resolve this before writing any backend code against it.

### Security rule for working with Antigravity — critical

**Never paste the actual `api-id` or `api-key` values into the Antigravity chat window, and never write real values into this brief or any other file the agent reads.** Reference them only by environment variable name (`CLEANVERSE_API_ID`, `CLEANVERSE_API_KEY`) in prompts and docs. The real values belong only in the local, gitignored `.env` file. This matters especially given the plan to push this repo publicly on Aug 8 — a secret that lands in git history is retrievable forever even after being removed in a later commit, so it must never be committed in the first place.
