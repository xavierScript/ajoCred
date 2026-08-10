import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const client = createPublicClient({ chain: baseSepolia, transport: http() });
const POOL_ADDRESS = "0x2d24b34cf7cae0fc2b6620e956ff09ea61f3b215";

async function run() {
  // Call deposit(1, 1000000) from Admin 0x13e6A9c07aE80f13eE3266a18c764149dC390605
  // Function signature for deposit(uint256,uint256) is 0x47e7d518
  // coopId = 1 = 0000000000000000000000000000000000000000000000000000000000000001
  // amount = 1000000 = 00000000000000000000000000000000000000000000000000000000000f4240
  const calldata = "0x47e7d518000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000f4240";

  try {
    const raw = await client.call({
      to: POOL_ADDRESS,
      data: calldata,
      account: "0x13e6A9c07aE80f13eE3266a18c764149dC390605",
    });
    console.log("Raw call output:", raw);
  } catch (err) {
    console.log("Raw call error details:");
    console.log("  message:", err.message);
    console.log("  data:", err.data);
    console.log("  cause:", err.cause);
  }
}
run();
