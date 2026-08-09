// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAPassComplianceValidator} from "./interfaces/IAPassComplianceValidator.sol";

/// @title AjoCredPool
/// @notice Compliant, collateral-free lending infrastructure with cooperative
///         multi-tenancy in Single-Contract Mode. One contract registers once with
///         Cleanverse's on-chain CVI Validator and internally partitions many
///         cooperatives, each with its own admin, liquidity cap, and risk tier.
///         Cooperative admins fund their own pool; compliant borrowers draw against
///         a backend-calculated per-cooperative borrowing cap derived from verified
///         remittance inflow history. Repayments carry a flat interest fee that
///         accrues to the cooperative as earnings.
/// @dev    Multi-tenancy is internal accounting (nested mappings), NOT Cleanverse
///         Factory Mode — a single `complianceVerify(address(this), msg.sender)`
///         checkpoint gates every cooperative. Per-cooperative liquidity is tracked
///         in `Cooperative.totalLiquidity`, never the raw token balance, so one
///         cooperative can never borrow another's funds.
contract AjoCredPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IAPassComplianceValidator public immutable validator;
    IERC20 public immutable lendingToken;

    struct Cooperative {
        address admin; // the only account that may fund/withdraw this cooperative's pool
        uint256 totalLiquidity; // currently lendable liquidity (deposits - borrowed + repaid + fees)
        uint256 maxLiquidity; // capped-pilot-mode ceiling, enforced on-chain in deposit()
        uint8 minTier; // cooperative-specific risk threshold, app-enforced on top of the base CVI check
        bool active;
    }

    /// @notice Cooperatives are 1-indexed; id 0 is reserved as "none".
    mapping(uint256 => Cooperative) public cooperatives;
    uint256 public cooperativeCount;

    /// @notice coopId => liquidity provider (the admin) => amount contributed.
    mapping(uint256 => mapping(address => uint256)) public deposits;
    /// @notice coopId => borrower => outstanding principal.
    mapping(uint256 => mapping(address => uint256)) public borrowings;
    /// @notice coopId => borrower => max outstanding borrow (owner/backend-set from off-chain eligibility).
    mapping(uint256 => mapping(address => uint256)) public borrowingCaps;

    /// @notice Flat interest fee charged on repayment, in basis points (500 = 5% of principal repaid).
    ///         NOT time-accruing — a single flat fee per the project brief.
    uint256 public constant INTEREST_BPS = 500;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    event CooperativeRegistered(
        uint256 indexed coopId,
        address indexed admin,
        uint256 maxLiquidity,
        uint8 minTier
    );
    event CooperativeConfigUpdated(uint256 indexed coopId, uint256 maxLiquidity, uint8 minTier);
    event CooperativeActiveSet(uint256 indexed coopId, bool active);
    event Deposited(uint256 indexed coopId, address indexed admin, uint256 amount);
    event Borrowed(uint256 indexed coopId, address indexed borrower, uint256 amount);
    event Repaid(uint256 indexed coopId, address indexed borrower, uint256 principal, uint256 fee);
    event Withdrawn(uint256 indexed coopId, address indexed admin, uint256 amount);
    event BorrowingCapSet(uint256 indexed coopId, address indexed user, uint256 cap);

    modifier onlyCompliant() {
        require(validator.complianceVerify(address(this), msg.sender), "AjoCred: A-Pass not qualified");
        _;
    }

    modifier coopExists(uint256 coopId) {
        require(coopId != 0 && coopId <= cooperativeCount, "AjoCred: unknown cooperative");
        _;
    }

    constructor(address validator_, address lendingToken_, address owner_) Ownable(owner_) {
        require(validator_ != address(0), "AjoCred: validator=0");
        require(lendingToken_ != address(0), "AjoCred: token=0");
        validator = IAPassComplianceValidator(validator_);
        lendingToken = IERC20(lendingToken_);
    }

    // ---------------------------------------------------------------------
    // Cooperative lifecycle
    // ---------------------------------------------------------------------

    /// @notice Owner registers a new cooperative with its own admin, liquidity cap, and min tier.
    /// @return coopId the new cooperative's 1-indexed id.
    function registerCooperative(address admin, uint256 maxLiquidity, uint8 minTier)
        external
        onlyOwner
        returns (uint256 coopId)
    {
        require(admin != address(0), "AjoCred: admin=0");
        require(maxLiquidity > 0, "AjoCred: maxLiquidity=0");

        coopId = ++cooperativeCount;
        cooperatives[coopId] = Cooperative({
            admin: admin,
            totalLiquidity: 0,
            maxLiquidity: maxLiquidity,
            minTier: minTier,
            active: true
        });

        emit CooperativeRegistered(coopId, admin, maxLiquidity, minTier);
    }

    /// @notice Owner or the cooperative's own admin adjusts its liquidity cap and min tier.
    /// @dev The new cap cannot be set below liquidity already deposited.
    function updateCooperativeConfig(uint256 coopId, uint256 maxLiquidity, uint8 minTier)
        external
        coopExists(coopId)
    {
        Cooperative storage coop = cooperatives[coopId];
        require(msg.sender == owner() || msg.sender == coop.admin, "AjoCred: not authorized");
        require(maxLiquidity >= coop.totalLiquidity, "AjoCred: cap below current liquidity");

        coop.maxLiquidity = maxLiquidity;
        coop.minTier = minTier;

        emit CooperativeConfigUpdated(coopId, maxLiquidity, minTier);
    }

    /// @notice Owner pauses or resumes a cooperative (blocks new deposits/borrows while inactive).
    function setCooperativeActive(uint256 coopId, bool active) external onlyOwner coopExists(coopId) {
        cooperatives[coopId].active = active;
        emit CooperativeActiveSet(coopId, active);
    }

    // ---------------------------------------------------------------------
    // Liquidity operations
    // ---------------------------------------------------------------------

    /// @notice Cooperative admin funds their pool. Compliance-gated and cap-enforced.
    function deposit(uint256 coopId, uint256 amount)
        external
        coopExists(coopId)
        onlyCompliant
        nonReentrant
    {
        require(amount > 0, "AjoCred: zero amount");
        Cooperative storage coop = cooperatives[coopId];
        require(coop.active, "AjoCred: inactive cooperative");
        require(msg.sender == coop.admin, "AjoCred: only cooperative admin");
        require(coop.totalLiquidity + amount <= coop.maxLiquidity, "AjoCred: cap reached");

        deposits[coopId][msg.sender] += amount;
        coop.totalLiquidity += amount;

        lendingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(coopId, msg.sender, amount);
    }

    /// @notice Compliant borrower draws `amount` from a cooperative, capped by their backend-set cap
    ///         and that cooperative's available liquidity.
    function borrow(uint256 coopId, uint256 amount)
        external
        coopExists(coopId)
        onlyCompliant
        nonReentrant
    {
        require(amount > 0, "AjoCred: zero amount");
        Cooperative storage coop = cooperatives[coopId];
        require(coop.active, "AjoCred: inactive cooperative");
        require(
            borrowings[coopId][msg.sender] + amount <= borrowingCaps[coopId][msg.sender],
            "AjoCred: exceeds borrowing cap"
        );
        require(amount <= coop.totalLiquidity, "AjoCred: insufficient liquidity");

        borrowings[coopId][msg.sender] += amount;
        coop.totalLiquidity -= amount;

        lendingToken.safeTransfer(msg.sender, amount);

        emit Borrowed(coopId, msg.sender, amount);
    }

    /// @notice Borrower repays principal plus a flat interest fee (INTEREST_BPS of the principal repaid).
    /// @dev Not compliance-gated — a frozen borrower must still be able to clear their debt. Principal and
    ///      fee both return to the cooperative's lendable liquidity; the fee is the cooperative's earnings.
    function repay(uint256 coopId, uint256 amount) external coopExists(coopId) nonReentrant {
        require(amount > 0, "AjoCred: zero amount");
        uint256 debt = borrowings[coopId][msg.sender];
        require(amount <= debt, "AjoCred: repay exceeds debt");

        uint256 fee = (amount * INTEREST_BPS) / BPS_DENOMINATOR;

        borrowings[coopId][msg.sender] = debt - amount;
        cooperatives[coopId].totalLiquidity += amount + fee;

        lendingToken.safeTransferFrom(msg.sender, address(this), amount + fee);

        emit Repaid(coopId, msg.sender, amount, fee);
    }

    /// @notice Cooperative admin withdraws liquidity (their contributions plus earned interest).
    function withdraw(uint256 coopId, uint256 amount)
        external
        coopExists(coopId)
        onlyCompliant
        nonReentrant
    {
        require(amount > 0, "AjoCred: zero amount");
        Cooperative storage coop = cooperatives[coopId];
        require(msg.sender == coop.admin, "AjoCred: only cooperative admin");
        require(amount <= coop.totalLiquidity, "AjoCred: insufficient liquidity");

        coop.totalLiquidity -= amount;
        // Reduce the admin's recorded contribution, floored at 0 since withdrawn interest
        // can exceed the original deposit.
        uint256 recorded = deposits[coopId][msg.sender];
        deposits[coopId][msg.sender] = recorded > amount ? recorded - amount : 0;

        lendingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(coopId, msg.sender, amount);
    }

    /// @notice Owner (backend) sets a borrower's max outstanding borrow for a cooperative,
    ///         after off-chain eligibility calculation.
    function setBorrowingCap(uint256 coopId, address user, uint256 cap)
        external
        onlyOwner
        coopExists(coopId)
    {
        borrowingCaps[coopId][user] = cap;
        emit BorrowingCapSet(coopId, user, cap);
    }

    // ---------------------------------------------------------------------
    // Validator rule management (pool-level, coop-agnostic — unchanged)
    // ---------------------------------------------------------------------

    /// @notice Replaces all Validator compliance rules for this pool.
    function setRuleV2FromContract(IAPassComplianceValidator.RuleV2 calldata rule) external onlyOwner {
        validator.setRuleV2FromContract(rule);
    }

    /// @notice Appends an additional Validator compliance rule (OR logic) for this pool.
    function addRuleV2FromContract(IAPassComplianceValidator.RuleV2 calldata rule) external onlyOwner {
        validator.addRuleV2FromContract(rule);
    }

    /// @notice Removes a Validator compliance rule from this pool by index.
    function removeRuleV2FromContract(uint256 index) external onlyOwner {
        validator.removeRuleV2FromContract(index);
    }

    /// @notice Returns the Validator compliance rules currently configured for this pool.
    function getRulesV2() external view returns (IAPassComplianceValidator.RuleV2[] memory) {
        return validator.getRulesV2(address(this));
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Returns a cooperative's full record.
    function getCooperative(uint256 coopId) external view returns (Cooperative memory) {
        return cooperatives[coopId];
    }

    /// @dev Total token balance held by the contract across all cooperatives. Per-cooperative
    ///      liquidity checks use `Cooperative.totalLiquidity`, not this global figure.
    function availableLiquidity() public view returns (uint256) {
        return lendingToken.balanceOf(address(this));
    }
}
