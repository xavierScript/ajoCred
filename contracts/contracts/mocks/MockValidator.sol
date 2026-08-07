// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAPassComplianceValidator} from "../interfaces/IAPassComplianceValidator.sol";

/// @title MockValidator
/// @notice Test double for Cleanverse's on-chain Validator. Defaults every address to
///         compliant; call `setCompliant` to simulate a wallet failing the A-Pass check.
contract MockValidator is IAPassComplianceValidator {
    mapping(address => bool) public overridden;
    mapping(address => bool) public compliant;
    mapping(address => RuleV2[]) private _rules;

    /// @notice Overrides the compliance result for a specific (pool, user) pair.
    function setCompliant(address user, bool isCompliant) external {
        overridden[user] = true;
        compliant[user] = isCompliant;
    }

    function complianceVerify(address, address userAddress) external view returns (bool) {
        if (overridden[userAddress]) {
            return compliant[userAddress];
        }
        return true;
    }

    function setRuleV2FromContract(RuleV2 calldata rule) external {
        delete _rules[msg.sender];
        _rules[msg.sender].push(rule);
    }

    function addRuleV2FromContract(RuleV2 calldata rule) external {
        _rules[msg.sender].push(rule);
    }

    function removeRuleV2FromContract(uint256 index) external {
        RuleV2[] storage rules = _rules[msg.sender];
        require(index < rules.length, "MockValidator: index out of range");
        rules[index] = rules[rules.length - 1];
        rules.pop();
    }

    function getRulesV2(address poolAddress) external view returns (RuleV2[] memory) {
        return _rules[poolAddress];
    }
}
