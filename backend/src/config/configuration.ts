export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  cleanverse: {
    apiId: process.env.CLEANVERSE_API_ID,
    apiKey: process.env.CLEANVERSE_API_KEY,
    baseUrl: process.env.CLEANVERSE_BASE_URL,
  },
  chain: {
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
    poolOwnerPrivateKey: process.env.POOL_OWNER_PRIVATE_KEY,
    poolContractAddress: process.env.POOL_CONTRACT_ADDRESS,
    ausdcTokenAddress: process.env.AUSDC_TOKEN_ADDRESS,
    validatorContractAddress: process.env.VALIDATOR_CONTRACT_ADDRESS,
  },
});
