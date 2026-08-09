import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";
import { getAddress, parseUnits } from "viem";

const { viem, networkHelpers } = await hre.network.create();

const DECIMALS = 6;
const amount = (n: number) => parseUnits(n.toString(), DECIMALS);

// The seed cooperative registered by the fixture.
const COOP_ID = 1n;
const COOP_MAX_LIQUIDITY = amount(5000);
const COOP_MIN_TIER = 0;

async function deployPoolFixture() {
  const [owner, coopAdmin, borrower, other] = await viem.getWalletClients();

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

  // Register a seed cooperative administered by `coopAdmin`.
  await pool.write.registerCooperative([
    coopAdmin.account.address,
    COOP_MAX_LIQUIDITY,
    COOP_MIN_TIER,
  ]);

  // Fund the cooperative admin (funds the pool) and the borrower (repays with interest),
  // and approve the pool to pull their tokens.
  await token.write.mint([coopAdmin.account.address, amount(10_000)]);
  await token.write.mint([borrower.account.address, amount(10_000)]);

  const tokenAsAdmin = await viem.getContractAt("MockERC20", token.address, {
    client: { wallet: coopAdmin },
  });
  await tokenAsAdmin.write.approve([pool.address, amount(10_000)]);

  const tokenAsBorrower = await viem.getContractAt("MockERC20", token.address, {
    client: { wallet: borrower },
  });
  await tokenAsBorrower.write.approve([pool.address, amount(10_000)]);

  const poolAsOwner = await viem.getContractAt("AjoCredPool", pool.address, {
    client: { wallet: owner },
  });
  const poolAsAdmin = await viem.getContractAt("AjoCredPool", pool.address, {
    client: { wallet: coopAdmin },
  });
  const poolAsBorrower = await viem.getContractAt("AjoCredPool", pool.address, {
    client: { wallet: borrower },
  });
  const poolAsOther = await viem.getContractAt("AjoCredPool", pool.address, {
    client: { wallet: other },
  });

  return {
    owner,
    coopAdmin,
    borrower,
    other,
    token,
    validator,
    pool,
    poolAsOwner,
    poolAsAdmin,
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

  describe("registerCooperative", () => {
    it("records the seed cooperative and increments the count", async () => {
      const { pool, coopAdmin } =
        await networkHelpers.loadFixture(deployPoolFixture);

      assert.equal(await pool.read.cooperativeCount(), 1n);

      const coop = await pool.read.getCooperative([COOP_ID]);
      assert.equal(getAddress(coop.admin), getAddress(coopAdmin.account.address));
      assert.equal(coop.totalLiquidity, 0n);
      assert.equal(coop.maxLiquidity, COOP_MAX_LIQUIDITY);
      assert.equal(coop.minTier, COOP_MIN_TIER);
      assert.equal(coop.active, true);
    });

    it("lets the owner register additional cooperatives", async () => {
      const { pool, poolAsOwner, other } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.emitWithArgs(
        poolAsOwner.write.registerCooperative([
          other.account.address,
          amount(1000),
          2,
        ]),
        pool,
        "CooperativeRegistered",
        [2n, getAddress(other.account.address), amount(1000), 2],
      );

      assert.equal(await pool.read.cooperativeCount(), 2n);
    });

    it("reverts when a non-owner registers a cooperative", async () => {
      const { poolAsOther, other } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWithCustomError(
        poolAsOther.write.registerCooperative([
          other.account.address,
          amount(1000),
          0,
        ]),
        poolAsOther,
        "OwnableUnauthorizedAccount",
      );
    });

    it("reverts on a zero admin or zero cap", async () => {
      const { poolAsOwner, other } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWith(
        poolAsOwner.write.registerCooperative([
          "0x0000000000000000000000000000000000000000",
          amount(1000),
          0,
        ]),
        "AjoCred: admin=0",
      );
      await viem.assertions.revertWith(
        poolAsOwner.write.registerCooperative([other.account.address, 0n, 0]),
        "AjoCred: maxLiquidity=0",
      );
    });
  });

  describe("deposit", () => {
    it("accepts a compliant deposit from the cooperative admin", async () => {
      const { pool, poolAsAdmin, coopAdmin, token } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.emitWithArgs(
        poolAsAdmin.write.deposit([COOP_ID, amount(1000)]),
        pool,
        "Deposited",
        [COOP_ID, getAddress(coopAdmin.account.address), amount(1000)],
      );

      assert.equal(
        await pool.read.deposits([COOP_ID, coopAdmin.account.address]),
        amount(1000),
      );
      const coop = await pool.read.getCooperative([COOP_ID]);
      assert.equal(coop.totalLiquidity, amount(1000));
      assert.equal(await token.read.balanceOf([pool.address]), amount(1000));
    });

    it("reverts when a non-admin tries to fund the pool", async () => {
      const { poolAsBorrower } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWith(
        poolAsBorrower.write.deposit([COOP_ID, amount(100)]),
        "AjoCred: only cooperative admin",
      );
    });

    it("enforces the cooperative liquidity cap (capped pilot mode)", async () => {
      const { poolAsAdmin } =
        await networkHelpers.loadFixture(deployPoolFixture);

      // Cap is 5000; a 5001 deposit must revert.
      await viem.assertions.revertWith(
        poolAsAdmin.write.deposit([COOP_ID, amount(5001)]),
        "AjoCred: cap reached",
      );

      // A deposit at the cap succeeds; a further deposit then exceeds it.
      await poolAsAdmin.write.deposit([COOP_ID, amount(5000)]);
      await viem.assertions.revertWith(
        poolAsAdmin.write.deposit([COOP_ID, amount(1)]),
        "AjoCred: cap reached",
      );
    });

    it("reverts when the admin is not compliant", async () => {
      const { poolAsAdmin, coopAdmin, validator } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await validator.write.setCompliant([coopAdmin.account.address, false]);

      await viem.assertions.revertWith(
        poolAsAdmin.write.deposit([COOP_ID, amount(100)]),
        "AjoCred: A-Pass not qualified",
      );
    });

    it("reverts for an unknown cooperative", async () => {
      const { poolAsAdmin } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWith(
        poolAsAdmin.write.deposit([99n, amount(100)]),
        "AjoCred: unknown cooperative",
      );
    });
  });

  describe("borrow", () => {
    async function fundedFixture() {
      const base = await networkHelpers.loadFixture(deployPoolFixture);
      await base.poolAsAdmin.write.deposit([COOP_ID, amount(1000)]);
      return base;
    }

    it("allows a borrower within their cap to draw against coop liquidity", async () => {
      const { pool, poolAsOwner, poolAsBorrower, borrower, token } =
        await fundedFixture();

      await poolAsOwner.write.setBorrowingCap([
        COOP_ID,
        borrower.account.address,
        amount(200),
      ]);

      await viem.assertions.emitWithArgs(
        poolAsBorrower.write.borrow([COOP_ID, amount(150)]),
        pool,
        "Borrowed",
        [COOP_ID, getAddress(borrower.account.address), amount(150)],
      );

      assert.equal(
        await pool.read.borrowings([COOP_ID, borrower.account.address]),
        amount(150),
      );
      const coop = await pool.read.getCooperative([COOP_ID]);
      assert.equal(coop.totalLiquidity, amount(850));
      assert.equal(
        await token.read.balanceOf([borrower.account.address]),
        amount(10_000) + amount(150),
      );
    });

    it("reverts when borrowing beyond the cap", async () => {
      const { poolAsOwner, poolAsBorrower, borrower } = await fundedFixture();

      await poolAsOwner.write.setBorrowingCap([
        COOP_ID,
        borrower.account.address,
        amount(100),
      ]);

      await viem.assertions.revertWith(
        poolAsBorrower.write.borrow([COOP_ID, amount(101)]),
        "AjoCred: exceeds borrowing cap",
      );
    });

    it("reverts when borrowing beyond coop liquidity", async () => {
      const { poolAsOwner, poolAsBorrower, borrower } = await fundedFixture();

      // Cap is generous, but only 1000 was deposited.
      await poolAsOwner.write.setBorrowingCap([
        COOP_ID,
        borrower.account.address,
        amount(5000),
      ]);

      await viem.assertions.revertWith(
        poolAsBorrower.write.borrow([COOP_ID, amount(1001)]),
        "AjoCred: insufficient liquidity",
      );
    });

    it("reverts when the borrower is not compliant", async () => {
      const { poolAsOwner, poolAsBorrower, borrower, validator } =
        await fundedFixture();

      await poolAsOwner.write.setBorrowingCap([
        COOP_ID,
        borrower.account.address,
        amount(200),
      ]);
      await validator.write.setCompliant([borrower.account.address, false]);

      await viem.assertions.revertWith(
        poolAsBorrower.write.borrow([COOP_ID, amount(100)]),
        "AjoCred: A-Pass not qualified",
      );
    });
  });

  describe("repay", () => {
    async function borrowedFixture() {
      const base = await networkHelpers.loadFixture(deployPoolFixture);
      await base.poolAsAdmin.write.deposit([COOP_ID, amount(1000)]);
      await base.poolAsOwner.write.setBorrowingCap([
        COOP_ID,
        base.borrower.account.address,
        amount(200),
      ]);
      await base.poolAsBorrower.write.borrow([COOP_ID, amount(150)]);
      return base;
    }

    it("reduces debt and charges a flat 5% interest fee", async () => {
      const { pool, poolAsBorrower, borrower } = await borrowedFixture();

      // Repay 100 principal → fee = 100 * 5% = 5.
      await viem.assertions.emitWithArgs(
        poolAsBorrower.write.repay([COOP_ID, amount(100)]),
        pool,
        "Repaid",
        [COOP_ID, getAddress(borrower.account.address), amount(100), amount(5)],
      );

      assert.equal(
        await pool.read.borrowings([COOP_ID, borrower.account.address]),
        amount(50),
      );
      // Liquidity: 1000 - 150 borrowed + (100 principal + 5 fee) = 955.
      const coop = await pool.read.getCooperative([COOP_ID]);
      assert.equal(coop.totalLiquidity, amount(955));
    });

    it("reverts when repaying more than the outstanding debt", async () => {
      const { poolAsBorrower } = await borrowedFixture();

      await viem.assertions.revertWith(
        poolAsBorrower.write.repay([COOP_ID, amount(151)]),
        "AjoCred: repay exceeds debt",
      );
    });
  });

  describe("withdraw", () => {
    it("allows the admin to withdraw up to coop liquidity", async () => {
      const { pool, poolAsAdmin, coopAdmin, token } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsAdmin.write.deposit([COOP_ID, amount(1000)]);

      await viem.assertions.emitWithArgs(
        poolAsAdmin.write.withdraw([COOP_ID, amount(400)]),
        pool,
        "Withdrawn",
        [COOP_ID, getAddress(coopAdmin.account.address), amount(400)],
      );

      const coop = await pool.read.getCooperative([COOP_ID]);
      assert.equal(coop.totalLiquidity, amount(600));
      assert.equal(await token.read.balanceOf([pool.address]), amount(600));
    });

    it("reverts when a non-admin tries to withdraw", async () => {
      const { poolAsAdmin, poolAsBorrower } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsAdmin.write.deposit([COOP_ID, amount(1000)]);

      await viem.assertions.revertWith(
        poolAsBorrower.write.withdraw([COOP_ID, amount(100)]),
        "AjoCred: only cooperative admin",
      );
    });

    it("reverts when withdrawing more than coop liquidity", async () => {
      const { poolAsAdmin } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsAdmin.write.deposit([COOP_ID, amount(100)]);

      await viem.assertions.revertWith(
        poolAsAdmin.write.withdraw([COOP_ID, amount(101)]),
        "AjoCred: insufficient liquidity",
      );
    });
  });

  describe("cooperative admin controls", () => {
    it("only lets the owner set a borrowing cap", async () => {
      const { poolAsOther, other } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await viem.assertions.revertWithCustomError(
        poolAsOther.write.setBorrowingCap([
          COOP_ID,
          other.account.address,
          amount(100),
        ]),
        poolAsOther,
        "OwnableUnauthorizedAccount",
      );
    });

    it("lets the coop admin update its config but not an outsider", async () => {
      const { pool, poolAsAdmin, poolAsOther } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsAdmin.write.updateCooperativeConfig([
        COOP_ID,
        amount(8000),
        3,
      ]);
      const coop = await pool.read.getCooperative([COOP_ID]);
      assert.equal(coop.maxLiquidity, amount(8000));
      assert.equal(coop.minTier, 3);

      await viem.assertions.revertWith(
        poolAsOther.write.updateCooperativeConfig([COOP_ID, amount(1), 0]),
        "AjoCred: not authorized",
      );
    });

    it("rejects a cap set below current liquidity", async () => {
      const { poolAsAdmin } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsAdmin.write.deposit([COOP_ID, amount(1000)]);

      await viem.assertions.revertWith(
        poolAsAdmin.write.updateCooperativeConfig([COOP_ID, amount(500), 0]),
        "AjoCred: cap below current liquidity",
      );
    });

    it("blocks deposits into a paused cooperative", async () => {
      const { poolAsOwner, poolAsAdmin } =
        await networkHelpers.loadFixture(deployPoolFixture);

      await poolAsOwner.write.setCooperativeActive([COOP_ID, false]);

      await viem.assertions.revertWith(
        poolAsAdmin.write.deposit([COOP_ID, amount(100)]),
        "AjoCred: inactive cooperative",
      );
    });

    it("forwards rule management calls to the validator", async () => {
      const { pool, poolAsOwner, validator } =
        await networkHelpers.loadFixture(deployPoolFixture);

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
