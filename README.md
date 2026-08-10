# AjoCred

> **Remittance-Backed Cooperative Lending Infrastructure on Base**

[![Live App](https://img.shields.io/badge/Live_App-ajocred.vercel.app-blue?style=for-the-badge&logo=vercel)](https://ajocred.vercel.app)
[![Admin Dashboard](https://img.shields.io/badge/Admin_Dashboard-ajocred--admin.vercel.app-black?style=for-the-badge&logo=vercel)](https://ajocred-admin.vercel.app)
[![Network](https://img.shields.io/badge/Network-Base_Sepolia-0052FF?style=for-the-badge&logo=ethereum)](https://sepolia.basescan.org/address/0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215)

---

## 📌 Problem

Millions of Nigerians receive consistent financial support from family abroad, yet those remittances are rarely recognized when applying for loans. Although Nigeria received **$21.8B in diaspora remittances in 2025** (CBN), only **6% of adults have access to formal credit**, while **26% remain financially excluded** (EFInA, 2023).

As a result, borrowers without collateral or formal credit histories often rely on informal lenders despite having verifiable income. At the same time, local cooperatives (*Ajo / Esusu groups*) and community lenders have capital to lend but lack trusted identity verification, alternative credit assessment, and compliance tooling.

---

## 💡 Solution

**AjoCred** is a cooperative lending marketplace on Base that converts verified diaspora remittance history into an alternative measure of creditworthiness.

- **For Borrowers:** Verify identity through Cleanverse A-Pass and unlock collateral-free credit limits derived from verified remittance inflow history.
- **For Cooperatives:** Create multi-tenant lending pools with configurable risk parameters, liquidity ceilings, and risk-tier rules.
- **For Compliance:** Determine loan eligibility using verified remittance activity together with Cleanverse identity verification instead of relying solely on traditional credit histories.

The platform supports onboarding through **Coinbase Developer Platform (CDP)** embedded wallets (email sign-in) and standard Web3 wallets (MetaMask, Coinbase Wallet, Phantom). The embedded wallet integration is complete, while Coinbase's identity verification service will be enabled once it becomes available in Nigeria.

---

## ⚙️ Cleanverse Infrastructure (CVI) & Verifiable Architecture (CVA) Integration

AjoCred is built directly on Cleanverse Infrastructure (CVI) and Cleanverse Verifiable Architecture (CVA).

### Cleanverse Infrastructure (CVI)
- **A-Pass Identity:** Generates and verifies borrower identities (`POST /generate_apass`) before any lending or borrowing activity.
- **A-Token Deposit Vaults:** Assigns dedicated remittance deposit addresses (`POST /query_deposit_address`) and tracks verified inbound `aUSDC` transfers.
- **Remittance Analytics:** Uses historical remittance activity to determine borrowing eligibility while generating Travel Rule compliance exports (`POST /download_travel_rule`).
- **Fiat Ramp:** Enables borrowers to off-ramp borrowed funds directly into local Nigerian bank accounts (`POST /create_ramp_widget_url`).
- **Institutional Whitelisting:** Manages approved liquidity providers for cooperative lending pools (`POST /atoken/add_whitelist_for_institutional`).

### Cleanverse Verifiable Architecture (CVA)
- **On-chain A-Pass Validation:** Borrowers without a valid A-Pass cannot borrow (`onlyCompliant` contract modifier executing `complianceVerify`).
- **Validator Registration:** The `AjoCredPool` lending contract is registered within Cleanverse's validator framework (`POST /validator/register`).
- **Network-wide Risk Controls:** Cooperative administrators can freeze a defaulter's A-Pass in emergency risk scenarios (`POST /update_status`).

---

## 🚀 Deployments & Contracts

| Service / Contract | Network / Provider | Address / Link |
| :--- | :--- | :--- |
| **Member App (Web)** | Vercel | [https://ajocred.vercel.app](https://ajocred.vercel.app) |
| **Admin Dashboard** | Vercel | [https://ajocred-admin.vercel.app](https://ajocred-admin.vercel.app) |
| **AjoCredPool Contract (Primary)** | Base Sepolia (`84532`) | [`0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215`](https://sepolia.basescan.org/address/0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215) |
| **AjoCredPool Contract (Multi-Chain)** | Monad Testnet (`10143`) | `0x791fd2924c92d43d3fca56681412beea548f75f3` |
| **aUSDC Lending Token** | Base Sepolia (`84532`) | [`0xaC0893567D43C3E7e6e35a72803df05416C1f20D`](https://sepolia.basescan.org/address/0xaC0893567D43C3E7e6e35a72803df05416C1f20D) |
| **Cleanverse Validator** | Base Sepolia (`84532`) | `0xaC7e5179C2C7f03f209136886c172eb34F161792` |

---

## 🔍 Honest Shortcomings & Hackathon Technical Learnings

Transparent evaluation of current technical limitations during the hacking window:

1. **Single-Contract Mode vs. Factory Mode Tradeoff (`registerApass` & `0xa6725971`):**
   Cleanverse's `aUSDC` token contract enforces automatic compliance on transfers into smart contract addresses via `registerApass(pool, aToken)`, which can only be called by a Factory contract holding Cleanverse's `REGISTER_ROLE`. We deliberately architected AjoCred using **Single-Contract Mode** to eliminate external factory dependencies and maintain multi-tenant internal accounting within one deployment. The tradeoff is that without Factory-level `registerApass` vault pairing, `aUSDC.transferFrom` into the contract custodian reverts on-chain with custom error `0xa6725971`.

2. **Coinbase Identity Regional Availability:**
   CDP Embedded Wallet authentication (email sign-in) is complete and operational. Coinbase's native identity verification service is currently awaiting regional availability expansion into Nigeria.

---

## 🛠️ Repository Architecture

```text
ajocred-test/
├── frontend/         # React + Vite + Tailwind + Wagmi (Member Application)
├── admin-dashboard/  # React + Vite + Tailwind + Wagmi (Cooperative Admin App)
├── backend/          # NestJS + TypeScript + Viem + Cleanverse Client Service
├── contracts/        # Hardhat + Viem + Solidity 0.8.28 (AjoCredPool Smart Contracts)
└── docs/             # Project briefs, one-page summary, Excalidraw diagrams, Cleanverse API spec
```

---

## 📜 License

MIT License. Built for the Cleanverse Hackathon 2026.
