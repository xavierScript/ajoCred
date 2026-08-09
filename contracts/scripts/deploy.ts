import hre from "hardhat";

/**
 * Deploys AjoCredPool to the currently selected network (e.g. `--network baseSepolia`)
 * and registers one test cooperative on-chain.
 *
 * Required env vars (loaded via `dotenv -e .env --`):
 * - VALIDATOR_CONTRACT_ADDRESS: Cleanverse's deployed IAPassComplianceValidator on Base Sepolia
 * - AUSDC_TOKEN_ADDRESS: the lending token (aUSDC) address on Base Sepolia
 *
 * Optional env vars for the seed cooperative (sensible defaults if unset):
 * - COOP_ADMIN_ADDRESS: cooperative admin (defaults to the deployer)
 * - COOP_MAX_LIQUIDITY: cap in whole aUSDC units (defaults to 1,000,000)
 * - COOP_MIN_TIER: cooperative min tier (defaults to 0)
 *
 * The deployer account (first configured account for the network) becomes the pool owner.
 */

const AUSDC_DECIMALS = 6;

async function main() {
  const validatorAddress = process.env.VALIDATOR_CONTRACT_ADDRESS;
  const lendingTokenAddress = process.env.AUSDC_TOKEN_ADDRESS;

  if (!validatorAddress) {
    throw new Error("Missing VALIDATOR_CONTRACT_ADDRESS in environment");
  }
  if (!lendingTokenAddress) {
    throw new Error("Missing AUSDC_TOKEN_ADDRESS in environment");
  }

  const { viem } = await hre.network.create();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("Deploying AjoCredPool with account:", deployer.account.address);
  console.log("Validator:", validatorAddress);
  console.log("Lending token:", lendingTokenAddress);

  const pool = await viem.deployContract("AjoCredPool", [
    validatorAddress as `0x${string}`,
    lendingTokenAddress as `0x${string}`,
    deployer.account.address,
  ]);

  console.log("AjoCredPool deployed at:", pool.address);

  // Register a seed cooperative so the pool is demo-ready immediately after deployment.
  const coopAdmin =
    (process.env.COOP_ADMIN_ADDRESS as `0x${string}` | undefined) ??
    deployer.account.address;
  const maxLiquidityWhole = BigInt(process.env.COOP_MAX_LIQUIDITY ?? "1000000");
  const maxLiquidity = maxLiquidityWhole * 10n ** BigInt(AUSDC_DECIMALS);
  const minTier = Number(process.env.COOP_MIN_TIER ?? "0");

  console.log("\nRegistering seed cooperative...");
  console.log("  admin:", coopAdmin);
  console.log("  maxLiquidity (whole aUSDC):", maxLiquidityWhole.toString());
  console.log("  minTier:", minTier);

  const txHash = await pool.write.registerCooperative([
    coopAdmin,
    maxLiquidity,
    minTier,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const coopId = await pool.read.cooperativeCount();
  console.log("Seed cooperative registered with coopId:", coopId.toString());

  console.log("\nSet this in your .env files as POOL_CONTRACT_ADDRESS:");
  console.log(pool.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
