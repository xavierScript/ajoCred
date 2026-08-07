import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";
import { getAddress, parseUnits } from "viem";

const { viem, networkHelpers } = await hre.network.create();

const DECIMALS = 6;
const amount = (n: number) => parseUnits(n.toString(), DECIMALS);

async function deployPoolFixture() {
  const [owner, lp, borrower, other] = await viem.getWalletClients();

  const token = await viem.deployContract("MockERC20", [
    "Mock aUSDC",
    "mausdc",
    DECIMALS,
  ]);
  const validator = await viem.deployContract("MockValidator");
  const pool = await viem.deployContract("AjoCredPool", [
    validator.address,
    token.address,
    owner.account.address,
  ]);

  // Fund LP and borrower with mock aUSDC, and approve the pool.
  await token.write.mint([lp.account.address, amount(10_000)]);
  await token.write.mint([borrower.account.address, amount(10_000)]);

  const tokenAsLp = await viem.getContractAt("MockERC20", token.address, {
    client: { wallet: lp },
  });
  await tokenAsLp.write.approve([pool.address, amount(10_000)]);

  const tokenAsBorrower = await viem.getContractAt("MockERC20", token.address, {
    client: { wallet: borrower },
  });
  await tokenAsBorrower.write.approve([pool.address, amount(10_000)]);

  const poolAsLp = await viem.getContractAt("AjoCredPool", pool.address, {
    client: { wallet: lp },
  });
  const poolAsBorrower = await viem.getContractAt("AjoCredPool", pool.address, {
    client: { wallet: borrower },
  });
  const poolAsOther = await viem.getContractAt("AjoCredPool", pool.address, {
    client: { wallet: other },
  });
  const validatorAsAdmin = validator;

  return {
    owner,
    lp,
    borrower,
    other,
    token,
    validator,
    validatorAsAdmin,
    pool,
    poolAsLp,
    poolAsBorrower,
    poolAsOther,
  };
}

describe("AjoCredPool", () => {
  it("deploys with the correct validator and lending token", async () => {
    const { pool, validator, token } =
      await networkHelpers.loadFixture(deployPoolFixture);

    assert.equal(
      getAddress(await pool.read.validator()),
      getAddress(validator.address),
    );
    assert.equal(
      getAddress(await pool.read.lendingToken()),
      getAddress(token.address),
    );
  });

  describe("deposit", () => {
    it("accepts a compliant deposit and updates balances", async () => {
      const { pool, poolAsLp, lp, token } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.emitWithArgs(
        poolAsLp.write.deposit([amount(1000)]),
        pool,
        "Deposited",
        [getAddress(lp.account.address), amount(1000)],
      );

      assert.equal(
        await pool.read.deposits([lp.account.address]),
        amount(1000),
      );
      assert.equal(await pool.read.totalDeposits(), amount(1000));
      assert.equal(await token.read.balanceOf([pool.address]), amount(1000));
    });

    it("reverts when the depositor is not compliant", async () => {
      const { poolAsLp, lp, validatorAsAdmin } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await validatorAsAdmin.write.setCompliant([lp.account.address, false]);

      await viem.assertions.revertWith(
        poolAsLp.write.deposit([amount(100)]),
        "AjoCred: A-Pass not qualified",
      );
    });

    it("reverts on a zero-amount deposit", async () => {
      const { poolAsLp } = await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWith(
        poolAsLp.write.deposit([0n]),
        "AjoCred: zero amount",
      );
    });
  });

  describe("borrow", () => {
    it("allows a borrower within their cap to draw against pool liquidity", async () => {
      const { pool, poolAsLp, poolAsBorrower, borrower, owner, token } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(1000)]);

      const poolAsOwner = await viem.getContractAt(
        "AjoCredPool",
        pool.address,
        {
          client: { wallet: owner },
        },
      );
      await poolAsOwner.write.setBorrowingCap([
        borrower.account.address,
        amount(200),
      ]);

      await viem.assertions.emitWithArgs(
        poolAsBorrower.write.borrow([amount(150)]),
        pool,
        "Borrowed",
        [getAddress(borrower.account.address), amount(150)],
      );

      assert.equal(
        await pool.read.borrowings([borrower.account.address]),
        amount(150),
      );
      assert.equal(await pool.read.totalBorrowings(), amount(150));
      assert.equal(
        await token.read.balanceOf([borrower.account.address]),
        amount(10_000) + amount(150),
      );
    });

    it("reverts when borrowing beyond the cap", async () => {
      const { poolAsLp, poolAsBorrower, borrower, owner, pool } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(1000)]);
      const poolAsOwner = await viem.getContractAt(
        "AjoCredPool",
        pool.address,
        {
          client: { wallet: owner },
        },
      );
      await poolAsOwner.write.setBorrowingCap([
        borrower.account.address,
        amount(100),
      ]);

      await viem.assertions.revertWith(
        poolAsBorrower.write.borrow([amount(101)]),
        "AjoCred: exceeds borrowing cap",
      );
    });

    it("reverts when borrowing beyond available liquidity", async () => {
      const { poolAsLp, poolAsBorrower, borrower, owner, pool } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(100)]);
      const poolAsOwner = await viem.getContractAt(
        "AjoCredPool",
        pool.address,
        {
          client: { wallet: owner },
        },
      );
      await poolAsOwner.write.setBorrowingCap([
        borrower.account.address,
        amount(1000),
      ]);

      await viem.assertions.revertWith(
        poolAsBorrower.write.borrow([amount(101)]),
        "AjoCred: insufficient liquidity",
      );
    });

    it("reverts when the borrower is not compliant", async () => {
      const {
        poolAsLp,
        poolAsBorrower,
        borrower,
        owner,
        pool,
        validatorAsAdmin,
      } = await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(1000)]);
      const poolAsOwner = await viem.getContractAt(
        "AjoCredPool",
        pool.address,
        {
          client: { wallet: owner },
        },
      );
      await poolAsOwner.write.setBorrowingCap([
        borrower.account.address,
        amount(200),
      ]);
      await validatorAsAdmin.write.setCompliant([
        borrower.account.address,
        false,
      ]);

      await viem.assertions.revertWith(
        poolAsBorrower.write.borrow([amount(100)]),
        "AjoCred: A-Pass not qualified",
      );
    });
  });

  describe("repay", () => {
    it("reduces the borrower's outstanding balance", async () => {
      const { pool, poolAsLp, poolAsBorrower, borrower, owner } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(1000)]);
      const poolAsOwner = await viem.getContractAt(
        "AjoCredPool",
        pool.address,
        {
          client: { wallet: owner },
        },
      );
      await poolAsOwner.write.setBorrowingCap([
        borrower.account.address,
        amount(200),
      ]);
      await poolAsBorrower.write.borrow([amount(150)]);

      await viem.assertions.emitWithArgs(
        poolAsBorrower.write.repay([amount(100)]),
        pool,
        "Repaid",
        [getAddress(borrower.account.address), amount(100)],
      );

      assert.equal(
        await pool.read.borrowings([borrower.account.address]),
        amount(50),
      );
      assert.equal(await pool.read.totalBorrowings(), amount(50));
    });

    it("reverts when repaying more than the outstanding debt", async () => {
      const { poolAsBorrower } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWith(
        poolAsBorrower.write.repay([amount(1)]),
        "AjoCred: repay exceeds debt",
      );
    });
  });

  describe("withdraw", () => {
    it("allows an LP to withdraw up to their deposited balance", async () => {
      const { pool, poolAsLp, lp, token } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(1000)]);

      await viem.assertions.emitWithArgs(
        poolAsLp.write.withdraw([amount(400)]),
        pool,
        "Withdrawn",
        [getAddress(lp.account.address), amount(400)],
      );

      assert.equal(await pool.read.deposits([lp.account.address]), amount(600));
      assert.equal(await token.read.balanceOf([pool.address]), amount(600));
      assert.equal(
        await token.read.balanceOf([lp.account.address]),
        amount(10_000) - amount(600),
      );
    });

    it("reverts when withdrawing more than deposited", async () => {
      const { poolAsLp } = await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(100)]);

      await viem.assertions.revertWith(
        poolAsLp.write.withdraw([amount(101)]),
        "AjoCred: withdraw exceeds balance",
      );
    });

    it("reverts when pool liquidity has been lent out", async () => {
      const { poolAsLp, poolAsBorrower, borrower, owner, pool } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsLp.write.deposit([amount(1000)]);
      const poolAsOwner = await viem.getContractAt(
        "AjoCredPool",
        pool.address,
        {
          client: { wallet: owner },
        },
      );
      await poolAsOwner.write.setBorrowingCap([
        borrower.account.address,
        amount(900),
      ]);
      await poolAsBorrower.write.borrow([amount(900)]);

      await viem.assertions.revertWith(
        poolAsLp.write.withdraw([amount(200)]),
        "AjoCred: insufficient liquidity",
      );
    });
  });

  describe("admin", () => {
    it("only lets the owner set a borrowing cap", async () => {
      const { poolAsOther, other } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWithCustomError(
        poolAsOther.write.setBorrowingCap([other.account.address, amount(100)]),
        poolAsOther,
        "OwnableUnauthorizedAccount",
      );
    });

    it("forwards rule management calls to the validator", async () => {
      const { pool, owner, validator } =
        await networkHelpers.loadFixture(deployPoolFixture);

      const poolAsOwner = await viem.getContractAt(
        "AjoCredPool",
        pool.address,
        {
          client: { wallet: owner },
        },
      );

      const rule = {
        allowedGroup: "0x0000",
        allowedSubGroup: "0x0000",
        minTier: 1,
        minSubTier: 0,
        poolCountryBitmap: 0n,
      } as const;

      await poolAsOwner.write.setRuleV2FromContract([rule]);

      const rules = await validator.read.getRulesV2([pool.address]);
      assert.equal(rules.length, 1);
      assert.equal(rules[0].minTier, 1);
    });
  });
});
