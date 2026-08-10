import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";

const client = createPublicClient({ chain: baseSepolia, transport: http() });

const POOL_ADDRESS = "0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215";
const AUSDC_ADDRESS = "0xaC0893567D43C3E7e6e35a72803df05416C1f20D";
const VALIDATOR_ADDRESS = "0xaC7e5179C2C7f03f209136886c172eb34F161792";

const poolAbi = parseAbi([
  "function cooperativeCount() view returns (uint256)",
  "function cooperatives(uint256) view returns (address admin, uint256 totalLiquidity, uint256 maxLiquidity, uint8 minTier, bool active)",
  "function validator() view returns (address)",
  "function lendingToken() view returns (address)",
  "function deposit(uint256 coopId, uint256 amount)",
  "function getRulesV2() view returns ((bytes2 allowedGroup, bytes2 allowedSubGroup, uint8 minTier, uint8 minSubTier, uint256 poolCountryBitmap)[])"
]);

const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
]);

const validatorAbi = parseAbi([
  "function complianceVerify(address poolAddress, address userAddress) view returns (bool)",
  "function getRulesV2(address poolAddress) view returns ((bytes2 allowedGroup, bytes2 allowedSubGroup, uint8 minTier, uint8 minSubTier, uint256 poolCountryBitmap)[])",
  "function isRegistered(address poolAddress) view returns (bool)"
]);

async function main() {
  console.log("=== CHECK 1: ERC20 APPROVE & ALLOWANCE ===");
  const coopCount = await client.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "cooperativeCount" });
  console.log(`Live Cooperative Count: ${coopCount}`);

  for (let i = 1n; i <= coopCount; i++) {
    const coop = await client.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "cooperatives", args: [i] });
    const admin = coop[0];
    const allowance = await client.readContract({ address: AUSDC_ADDRESS, abi: erc20Abi, functionName: "allowance", args: [admin, POOL_ADDRESS] });
    const balance = await client.readContract({ address: AUSDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [admin] });
    console.log(`Coop #${i}: Admin=${admin}`);
    console.log(`  Admin Balance: ${balance.toString()} base units (${Number(balance) / 1e6} aUSDC)`);
    console.log(`  Admin Allowance for Pool: ${allowance.toString()} base units (${Number(allowance) / 1e6} aUSDC)`);

    console.log(`\n=== CHECK 2: MSG.SENDER MATCH & ADMIN REGISTERED ===`);
    console.log(`  Coop #${i} Admin Registered On-Chain: ${admin}`);

    console.log(`\n=== CHECK 3: VALIDATOR RULES & COMPLIANCEVERIFY ===`);
    try {
      const isReg = await client.readContract({ address: VALIDATOR_ADDRESS, abi: validatorAbi, functionName: "isRegistered", args: [POOL_ADDRESS] });
      console.log(`  Pool Registered with Validator: ${isReg}`);
    } catch (e) {
      console.log(`  isRegistered check error: ${e.message}`);
    }

    try {
      const rules = await client.readContract({ address: VALIDATOR_ADDRESS, abi: validatorAbi, functionName: "getRulesV2", args: [POOL_ADDRESS] });
      console.log(`  Rules set on Validator for Pool: ${JSON.stringify(rules)}`);
    } catch (e) {
      console.log(`  getRulesV2 error: ${e.message}`);
    }

    try {
      const compliant = await client.readContract({ address: VALIDATOR_ADDRESS, abi: validatorAbi, functionName: "complianceVerify", args: [POOL_ADDRESS, admin] });
      console.log(`  complianceVerify(pool, admin) result: ${compliant}`);
    } catch (e) {
      console.log(`  complianceVerify error: ${e.message}`);
    }

    console.log(`\n=== CHECK 4: SIMULATION OF DEPOSIT(coopId=${i}, amount=1000000) ===`);
    try {
      const sim = await client.simulateContract({
        address: POOL_ADDRESS,
        abi: poolAbi,
        functionName: "deposit",
        args: [i, 1000000n],
        account: admin,
      });
      console.log(`  Simulation SUCCESS for Admin ${admin}! Result:`, sim.result);
    } catch (err) {
      console.log(`  Simulation REVERTED for Admin ${admin}. Reason / Error:`, err.shortMessage || err.message);
    }
  }
}

main().catch(console.error);
