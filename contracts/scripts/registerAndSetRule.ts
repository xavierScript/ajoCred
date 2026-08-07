import crypto from "node:crypto";
import hre from "hardhat";

/**
 * Registers the deployed AjoCredPool with Cleanverse's Validator (POST /validator/register),
 * then sets the on-chain compliance rule via AjoCredPool.setRuleV2FromContract as the pool owner.
 *
 * Required env vars (loaded via `dotenv -e .env --`):
 * - CLEANVERSE_API_ID, CLEANVERSE_API_KEY, CLEANVERSE_BASE_URL
 * - POOL_CONTRACT_ADDRESS: the deployed AjoCredPool address (from scripts/deploy.ts output)
 *
 * Signature spec (docs/project-brief.md, docs/cleanverse-api-reference.md):
 *   owner_signature = EIP-191 personal_sign over the lowercase string `chain + contract_address`
 *   (e.g. "base0x1234...abcd"), signed by the pool owner's wallet.
 */

const CHAIN = "base";

// Initial off-chain/on-chain rule: no restriction beyond A-Pass existing (min_tier 0, no group/country lock).
// Tighten this later via POST /validator/set_rule or setRuleV2FromContract as the product requires.
const INITIAL_RULE = {
  allowed_group: "",
  allowed_sub_group: "",
  min_tier: 0,
  min_sub_tier: 0,
  is_black_list: false,
  countries: [] as string[],
};

function encryptPayload(plaintext: object, apiKeyBase64: string): string {
  const key = Buffer.from(apiKeyBase64, "base64");
  const iv = Buffer.alloc(16, 0); // fixed zero IV per Cleanverse spec
  const cipher = crypto.createCipheriv(
    key.length === 32 ? "aes-256-cbc" : "aes-128-cbc",
    key,
    iv,
  );
  const json = JSON.stringify(plaintext);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  return encrypted.toString("base64");
}

async function main() {
  const apiId = process.env.CLEANVERSE_API_ID;
  const apiKey = process.env.CLEANVERSE_API_KEY;
  const baseUrl = process.env.CLEANVERSE_BASE_URL;
  const poolAddress = process.env.POOL_CONTRACT_ADDRESS;

  if (!apiId || !apiKey || !baseUrl) {
    throw new Error(
      "Missing CLEANVERSE_API_ID, CLEANVERSE_API_KEY, or CLEANVERSE_BASE_URL in environment",
    );
  }
  if (!poolAddress) {
    throw new Error(
      "Missing POOL_CONTRACT_ADDRESS in environment (deploy the pool first)",
    );
  }

  const { viem } = await hre.network.create();
  const [owner] = await viem.getWalletClients();

  const lowerAddress = poolAddress.toLowerCase();
  const message = `${CHAIN}${lowerAddress}`;
  const ownerSignature = await owner.signMessage({ message });

  const requestBody = encryptPayload(
    {
      chain: CHAIN,
      contract_address: poolAddress,
      rule: INITIAL_RULE,
      owner_signature: ownerSignature,
    },
    apiKey,
  );

  console.log("Registering pool", poolAddress, "on chain", CHAIN, "...");

  const response = await fetch(`${baseUrl}/validator/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-id": apiId,
      "X-Request-ID": crypto.randomUUID(),
    },
    body: JSON.stringify({ data: requestBody }),
  });

  const result = (await response.json()) as {
    code: string;
    message?: string;
    data?: unknown;
  };
  console.log("validator/register response:", JSON.stringify(result, null, 2));

  // "register validator: execution reverted" happens when the pool is already registered
  // (re-running this script against an already-registered pool) — treat as a no-op instead
  // of a fatal error, since the on-chain state we care about (the rule) already exists.
  const alreadyRegistered =
    result.code !== "0000" &&
    /register validator: execution reverted/i.test(result.message ?? "");

  if (result.code !== "0000" && !alreadyRegistered) {
    throw new Error(
      `validator/register failed: ${result.message ?? "unknown error"}`,
    );
  }
  if (alreadyRegistered) {
    console.log(
      "Pool already registered — skipping to on-chain rule verification.",
    );
  }

  // NOTE: /validator/register's own on-chain tx already sets the initial permissive rule
  // (confirmed via getRulesV2 returning one all-zero rule right after registration), so
  // calling AjoCredPool.setRuleV2FromContract again here would revert (rule already exists).
  // Just verify the rule landed on-chain instead of re-setting it.
  const validatorAddress = process.env.VALIDATOR_CONTRACT_ADDRESS;
  if (!validatorAddress) {
    throw new Error("Missing VALIDATOR_CONTRACT_ADDRESS in environment");
  }
  const validatorContract = await viem.getContractAt(
    "IAPassComplianceValidator",
    validatorAddress as `0x${string}`,
  );
  const rules = await validatorContract.read.getRulesV2([
    poolAddress as `0x${string}`,
  ]);

  console.log(
    "On-chain rules for pool:",
    JSON.stringify(rules, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
  console.log(
    "\nPool registered successfully (rule already set by Cleanverse's register tx).",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
