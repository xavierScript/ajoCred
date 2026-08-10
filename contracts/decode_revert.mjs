import { keccak256, toHex } from "viem";

const errors = [
  "SafeERC20FailedOperation(address)",
  "ERC20InsufficientAllowance(address,uint256,uint256)",
  "ERC20InsufficientBalance(address,uint256,uint256)",
  "OwnableUnauthorizedAccount(address)",
  "ReentrancyGuardReentrantCall()",
  "AjoCred: zero amount",
  "AjoCred: inactive cooperative",
  "AjoCred: only cooperative admin",
  "AjoCred: cap reached",
  "AjoCred: A-Pass not qualified"
];

for (const err of errors) {
  const sig = keccak256(toHex(err)).slice(0, 10);
  console.log(`${sig} -> ${err}`);
}
