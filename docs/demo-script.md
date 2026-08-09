# AjoCred — End-to-End Demo Script & Verification Guide

This document outlines the step-by-step procedure to demonstrate the full **AjoCred** ecosystem: user borrowing against remittance history (`frontend`), cooperative treasury and risk administration (`admin-dashboard`), and background compliance validation (`backend`).

---

## 1. Prerequisites & Environment Setup

### Environment Variables Check
Ensure `.env` files are configured across all three packages:

1. **`backend/.env`**:
   - `PORT=3001`
   - `CLEANVERSE_BASE_URL=https://uatapi.cleanverse.com/api/cooperate`
   - `CLEANVERSE_API_ID=<your-cleanverse-api-id>`
   - `CLEANVERSE_AES_KEY=<your-cleanverse-aes-key>`
   - `ADMIN_KEY=secret_admin_key_123`
   - `AJO_CRED_POOL_ADDRESS=0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215`
   - `AUSDC_TOKEN_ADDRESS=0xaC0893567D43C3E7e6e35a72803df05416C1f20D`
   - `RPC_URL=https://sepolia.base.org`

2. **`frontend/.env`**:
   - `VITE_API_URL=http://localhost:3001`
   - `VITE_CDP_PROJECT_ID=<your-cdp-project-id>`
   - `VITE_POOL_CONTRACT_ADDRESS=0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215`
   - `VITE_AUSDC_TOKEN_ADDRESS=0xaC0893567D43C3E7e6e35a72803df05416C1f20D`

3. **`admin-dashboard/.env`**:
   - `VITE_API_URL=http://localhost:3001`
   - `VITE_ADMIN_KEY=secret_admin_key_123`
   - `VITE_CDP_PROJECT_ID=<your-cdp-project-id>`
   - `VITE_POOL_CONTRACT_ADDRESS=0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215`
   - `VITE_AUSDC_TOKEN_ADDRESS=0xaC0893567D43C3E7e6e35a72803df05416C1f20D`

---

## 2. Running Local Development Servers

Open 3 terminal sessions:

```bash
# Terminal 1: Backend API
cd backend && npm run start:dev

# Terminal 2: Member Web App
cd frontend && npm run dev

# Terminal 3: Cooperative Admin Portal
cd admin-dashboard && npm run dev
```

---

## 3. End-to-End Demo Script Steps

### Part A: Cooperative Registration & Treasury Funding (Admin Portal)
1. Open `http://localhost:5174` (Cooperative Admin Portal).
2. **Sign In**: Click **"Sign in"** in the top header (using email sign-in or external wallet).
3. **Register Cooperative**:
   - Go to **Manage Coops** (`/cooperatives`).
   - Fill in **Register New Cooperative**: Max Pool Capacity = `10000`, Minimum Risk Tier = `1`.
   - Click **"Register Cooperative"**. Note the generated **Coop ID** (e.g. `#1`).
4. **Fund Pool Treasury**:
   - Go to **Fund Pool** (`/fund`).
   - Enter Deposit Amount = `1000` USD.
   - Click **"Approve USD"** then **"Deposit Liquidity"**. Verify pool total updates.

---

### Part B: User Onboarding & Borrowing Flow (Member App)
1. Open `http://localhost:5173` (Member App).
2. **Sign In**: Click **"Sign in"** in the top header.
3. **Join Cooperative**:
   - Go to **Cooperatives** (`/cooperatives`).
   - Click **"Select Cooperative"** on Coop `#1`.
4. **Identity Verification**:
   - Navigate to **Onboarding** (`/onboard`).
   - Click **"Verify Identity"**. Cleanverse identity check completes and returns *"Identity verified"*.
5. **Receive Money & Build Credit History**:
   - Go to **Dashboard** (`/dashboard`).
   - Note the **Receive Money** section with your QR code and deposit address.
   - Expand **Demo Tools (Local Dev)**: click **"Inject Simulated Remittance"** or request test funds to build 3+ months of verified inbound transfer history.
   - Verify that **Credit limit calculation** displays an eligible borrowing limit (e.g. `250.00 USD`).
6. **Activate Limit & Borrow**:
   - Go to **Borrow** (`/borrow`).
   - Click **"Activate credit limit"** to sync your computed off-chain limit with the smart contract pool.
   - In **Amount to borrow**, enter `50` USD and click **"Borrow"**.
   - Confirm your **Outstanding balance** updates to `50.00 USD` and available wallet balance increases by `50.00 USD`.
7. **Repay Loan**:
   - Toggle segment to **Repay**.
   - Enter `20` USD and click **"Repay"**. Outstanding loan drops to `30.00 USD`.

---

### Part C: Cooperative Risk Control & Compliance (Admin Portal)
1. Return to `http://localhost:5174` (Admin Portal).
2. **Member Inspection & Limit Adjustment**:
   - Go to **Members & Risk** (`/members`).
   - Paste the user's address in the inspector search bar and click **"Inspect Member"**.
   - Verify member deposit, active borrowing balance, and verified transfer history display.
   - In **Set Member Borrowing Limit**, set `300` USD and submit.
3. **Emergency Freeze / Default Handling**:
   - Click **"Freeze Account (Mark Defaulted)"**. Verification status flips to *Frozen / Defaulted*.
   - Switch back to the Member App (`http://localhost:5173/borrow`) — borrowing is immediately blocked.
   - Return to Admin Portal and click **"Restore Verification / Unfreeze Member"**. Access is restored.
4. **Travel Rule Compliance Report Export**:
   - Go to **Compliance** (`/compliance`).
   - Paste a confirmed transaction hash (`0x...`).
   - Click **"Generate Report"**. A verified Travel Rule export link is returned.
5. **Institutional Whitelist Management**:
   - Go to **Whitelist** (`/whitelist`).
   - Enter a sender address in **Add Institutional Address** and submit.
   - Verify the address is registered in the institutional whitelist table. Test **Deactivate** and **Restore** controls.
6. **Fiat Cash Out**:
   - Go to **Fiat Ramp** (`/ramp`).
   - Select **Withdraw to Bank**, enter `$50`, and click **"Get Transfer Quote"**.
   - Click **"Proceed to Transfer"** to open the payment processing widget.

---

## 4. Summary of Verification Commands

```bash
# 1. Typecheck Backend
cd backend && npx tsc --noEmit

# 2. Typecheck Frontend
cd frontend && npx tsc --noEmit

# 3. Typecheck Admin Dashboard
cd admin-dashboard && npx tsc --noEmit
```

*All typecheck commands exit cleanly with code 0.*
