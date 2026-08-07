// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IAPassComplianceValidator
/// @notice Interface for Cleanverse's on-chain CVI Compliance Validator (Single-Contract Mode).
/// @dev This is Cleanverse's already-deployed contract on Base Sepolia — AjoCred does not
///      deploy or own this contract, only calls it. Registrar-only functions (registerV2,
///      registerApass, setRuleV2FromRegistrar, isRegistered) are declared for completeness
///      but are not used by AjoCredPool, since registration happens via the Cleanverse REST
///      API (`POST /validator/register`), not on-chain.
interface IAPassComplianceValidator {
    struct RuleV2 {
        bytes2 allowedGroup;
        bytes2 allowedSubGroup;
        uint8 minTier;
        uint8 minSubTier;
        uint256 poolCountryBitmap;
    }

    /// @notice Checks whether `userAddress` satisfies the compliance rules configured for `poolAddress`.
    function complianceVerify(address poolAddress, address userAddress) external view returns (bool);

    /// @notice Replaces all rules for the calling pool contract with a single rule.
    function setRuleV2FromContract(RuleV2 calldata rule) external;

    /// @notice Appends an additional rule (OR logic) for the calling pool contract.
    function addRuleV2FromContract(RuleV2 calldata rule) external;

    /// @notice Removes a rule from the calling pool contract by index.
    function removeRuleV2FromContract(uint256 index) external;

    /// @notice Returns all rules currently configured for `poolAddress`.
    function getRulesV2(address poolAddress) external view returns (RuleV2[] memory);
}
