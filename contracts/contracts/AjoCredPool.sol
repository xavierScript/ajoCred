// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAPassComplianceValidator} from "./interfaces/IAPassComplianceValidator.sol";

/// @title AjoCredPool
/// @notice Collateral-free lending pool gated by Cleanverse's on-chain CVI compliance
///         Validator (Single-Contract Mode). Depositors (LPs) fund the pool; borrowers
///         draw against a backend-calculated borrowing cap derived from verified
///         remittance inflow history.
contract AjoCredPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IAPassComplianceValidator public immutable validator;
    IERC20 public immutable lendingToken;

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrowings;
    mapping(address => uint256) public borrowingCaps;

    uint256 public totalDeposits;
    uint256 public totalBorrowings;

    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event BorrowingCapSet(address indexed user, uint256 cap);

    modifier onlyCompliant() {
        require(validator.complianceVerify(address(this), msg.sender), "AjoCred: A-Pass not qualified");
        _;
    }

    constructor(address validator_, address lendingToken_, address owner_) Ownable(owner_) {
        require(validator_ != address(0), "AjoCred: validator=0");
        require(lendingToken_ != address(0), "AjoCred: token=0");
        validator = IAPassComplianceValidator(validator_);
        lendingToken = IERC20(lendingToken_);
    }

    /// @notice LP deposits `amount` of the lending token into the pool.
    function deposit(uint256 amount) external onlyCompliant nonReentrant {
        require(amount > 0, "AjoCred: zero amount");

        deposits[msg.sender] += amount;
        totalDeposits += amount;

        lendingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount);
    }

    /// @notice Borrower draws `amount`, capped by their backend-set borrowing cap and pool liquidity.
    function borrow(uint256 amount) external onlyCompliant nonReentrant {
        require(amount > 0, "AjoCred: zero amount");
        require(borrowings[msg.sender] + amount <= borrowingCaps[msg.sender], "AjoCred: exceeds borrowing cap");
        require(amount <= availableLiquidity(), "AjoCred: insufficient liquidity");

        borrowings[msg.sender] += amount;
        totalBorrowings += amount;

        lendingToken.safeTransfer(msg.sender, amount);

        emit Borrowed(msg.sender, amount);
    }

    /// @notice Borrower repays up to their outstanding loan balance.
    function repay(uint256 amount) external nonReentrant {
        require(amount > 0, "AjoCred: zero amount");
        require(amount <= borrowings[msg.sender], "AjoCred: repay exceeds debt");

        borrowings[msg.sender] -= amount;
        totalBorrowings -= amount;

        lendingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Repaid(msg.sender, amount);
    }

    /// @notice LP withdraws up to their deposited balance, subject to available liquidity.
    function withdraw(uint256 amount) external onlyCompliant nonReentrant {
        require(amount > 0, "AjoCred: zero amount");
        require(amount <= deposits[msg.sender], "AjoCred: withdraw exceeds balance");
        require(amount <= availableLiquidity(), "AjoCred: insufficient liquidity");

        deposits[msg.sender] -= amount;
        totalDeposits -= amount;

        lendingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Owner (backend) sets a user's max outstanding borrow amount after risk calculation.
    function setBorrowingCap(address user, uint256 cap) external onlyOwner {
        borrowingCaps[user] = cap;
        emit BorrowingCapSet(user, cap);
    }

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

    /// @notice Returns totalDeposits, totalBorrowings, and available liquidity.
    function getPoolStats() external view returns (uint256, uint256, uint256) {
        return (totalDeposits, totalBorrowings, availableLiquidity());
    }

    /// @dev Real token balance backs liquidity checks, not internal counters, so it can't drift.
    function availableLiquidity() public view returns (uint256) {
        return lendingToken.balanceOf(address(this));
    }
}
