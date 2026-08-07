import hre from "hardhat";

/**
 * Deploys AjoCredPool to the currently selected network (e.g. `--network baseSepolia`).
 *
 * Required env vars (loaded via `dotenv -e .env --`):
 * - VALIDATOR_CONTRACT_ADDRESS: Cleanverse's deployed IAPassComplianceValidator on Base Sepolia
 * - AUSDC_TOKEN_ADDRESS: the lending token (aUSDC) address on Base Sepolia
 *
 * The deployer account (first configured account for the network) becomes the pool owner.
 */
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

  console.log("Deploying AjoCredPool with account:", deployer.account.address);
  console.log("Validator:", validatorAddress);
  console.log("Lending token:", lendingTokenAddress);

  const pool = await viem.deployContract("AjoCredPool", [
    validatorAddress as `0x${string}`,
    lendingTokenAddress as `0x${string}`,
    deployer.account.address,
  ]);

  console.log("AjoCredPool deployed at:", pool.address);
  console.log("\nSet this in your .env files as POOL_CONTRACT_ADDRESS:");
  console.log(pool.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
