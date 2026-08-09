export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  cleanverse: {
    apiId: process.env.CLEANVERSE_API_ID,
    apiKey: process.env.CLEANVERSE_API_KEY,
    baseUrl: process.env.CLEANVERSE_BASE_URL,
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY ?? '',
  },
  eligibility: {
    // Configurable lookback window (brief §6). Production default ~6 months;
    // compress via env for the demo (e.g. OBSERVATION_WINDOW_SECONDS=3600).
    observationWindowSeconds: parseInt(
      process.env.OBSERVATION_WINDOW_SECONDS ?? '15552000',
      10,
    ),
    // Minimum qualifying inbound deposits before a wallet becomes eligible.
    minQualifyingDeposits: parseInt(
      process.env.MIN_QUALIFYING_DEPOSITS ?? '3',
      10,
    ),
  },
  chain: {
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
    poolOwnerPrivateKey: process.env.POOL_OWNER_PRIVATE_KEY,
    poolContractAddress: process.env.POOL_CONTRACT_ADDRESS,
    ausdcTokenAddress: process.env.AUSDC_TOKEN_ADDRESS,
    validatorContractAddress: process.env.VALIDATOR_CONTRACT_ADDRESS,
  },
});
