//SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 *@dev Contract module which helps to label accounts as blacklisted.
 * blacklisted accounts wont able to send or recieve tokens.
 */

contract Blacklistable {
    mapping(address => bool) internal _blacklist;

    /**
     * @dev internal function to add an account to _blacklist.
     */
    function _addblacklist(address _user) internal virtual {
        _blacklist[_user] = true;
        emit BlacklistAdded(_user);
    }

    /**
     * @dev internal function to remove an account from blacklist.
     */
    function _removeBlacklist(address _user) internal virtual {
        _blacklist[_user] = false;
        emit BlacklistRemoved(_user);
    }

    /**
     * @dev function to check whether an account is blacklisted.
     */
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklist[account];
    }

    /**
     * @dev Emitted when new `address` added to holders list.
     */
    event BlacklistAdded(address indexed _account);

    /**
     * @dev Emitted when an `address` removed from holders list.
     */
    event BlacklistRemoved(address indexed _account);
}

contract USDU_StableCoin_V1 is
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    Blacklistable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    // additional variables for use if transaction fees ever became necessary
    uint256 public basisPointsRate;
    uint256 public maximumFee;

    event ParamsSet(uint256 feeBasisPoints, uint256 maxFee);

    // prevent intialization of logic contract.
    constructor() initializer {}

    /**
     * @dev initialize the token contract. Minting _totalSupply into owners account.
     * setting msg sender as DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE.
     * Note:initializer modifier is used to prevent initialize token twice.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_
    ) public initializer {
        __ERC20Pausable_init_unchained();
        __Pausable_init_unchained();
        __Context_init_unchained();
        __ERC20_init_unchained(name_, symbol_);
        __Ownable_init_unchained();
        _mint(_msgSender(), initialSupply_);
    }

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     *
     * Requirements:
     *
     * - the caller must have has owner of the contract.
     */
    function burn(uint256 amount) public virtual onlyOwner returns (bool) {
        _burn(_msgSender(), amount);
        return true;
    }

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's
     * allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     *
     * - the caller must be owner of the contract.
     */
    function burnFrom(address account, uint256 amount)
        public
        virtual
        onlyOwner
    {
        uint256 currentAllowance = allowance(account, _msgSender());
        require(
            currentAllowance >= amount,
            "ERC20: burn amount exceeds allowance"
        );
        unchecked {
            _approve(account, _msgSender(), currentAllowance - amount);
        }
        _burn(account, amount);
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - the caller must be the owner of the contract.
     */
    function pause() public virtual onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - the caller must be owner of the contract.
     */
    function unpause() public virtual onlyOwner {
        _unpause();
    }

    /**
     * @dev mint new token to the provided address.
     * Requirements:
     *
     * - the caller must have has MINTER_ROLE.
     */
    function mint(address to, uint256 amount) public virtual onlyOwner {
        _mint(to, amount);
    }

    function setParams(uint256 newBasisPoints, uint256 newMaxFee)
        public
        onlyOwner
    {
        // Ensure transparency by hardcoding limit beyond which fees can never be added
        require(newBasisPoints < 20);
        require(newMaxFee < 50);

        basisPointsRate = newBasisPoints;
        maximumFee = newMaxFee * (10**decimals());

        emit ParamsSet(basisPointsRate, maximumFee);
    }

    /**
     * @dev mark a user as blacklisted .
     *
     * - the caller must be owner of the contract.
     */

    function blacklist(address user) public virtual onlyOwner {
        _addblacklist(user);
    }

    /**
     * @dev remove user from blacklist.
     *
     * - the caller must be owner of the contract.
     */
    function removeBlacklist(address user) public virtual onlyOwner {
        require(isBlacklisted(user), "address is not blacklisted");
        _removeBlacklist(user);
    }

    /**
     * @dev transfer tokens to multiple accounts through a single call.
     * @param transferAddresses array contains the to addresses.
     * @param amounts array contains the amount needed to be transfered.
     * - the caller must be owner of the contract.
     */
    function batchTransfer(
        address[] calldata transferAddresses,
        uint256[] calldata amounts
    ) external virtual onlyOwner {
        require(
            transferAddresses.length == amounts.length,
            "params length mismatch"
        );

        for (uint256 i = 0; i < transferAddresses.length; i++) {
            require(
                transfer(transferAddresses[i], amounts[i]),
                "Unable to transfer token to the account"
            );
        }
    }

    /**
     * @dev  overriding ERC-20 transfer function. Fee calculation and transfer added.
     * refer ERC-20
     */
    function transfer(address to, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        address tokenOwner = _msgSender();
        uint256 fee = (amount * (basisPointsRate)) / (10000);
        if (fee > maximumFee) {
            fee = maximumFee;
        }
        uint256 sendAmount = amount - fee;
        if (fee > 0) {
            _transfer(tokenOwner, owner(), fee);
        }
        _transfer(tokenOwner, to, sendAmount);
        return true;
    }

    /**
     * @dev  overriding ERC-20 transferFrom function. Fee calculation and transfer added.
     * refer ERC-20
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        uint256 fee = (amount * (basisPointsRate)) / (10000);
        if (fee > maximumFee) {
            fee = maximumFee;
        }
        uint256 sendAmount = amount - fee;
        if (fee > 0) {
            _transfer(from, owner(), fee);
        }
        _transfer(from, to, sendAmount);
        return true;
    }

    /**
     * @dev function to withdraw ERC20 tokens trapped on smartcontract.
     * @param amount amount of token reuired to withdraw.
     * @param token addres of the ERC20 token smartcontract
     * Requirement - fuction access restricted to owner.
     */

    function withdrawToken(uint256 amount, address token)
        external
        virtual
        onlyOwner
    {
        IERC20Upgradeable ERC20Token = IERC20Upgradeable(token);
        ERC20Token.safeTransfer(owner(), amount);
    }

    /**
     * @dev checks before token transfer.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(!isBlacklisted(from), "from address is blacklisted");
        require(!isBlacklisted(to), "to address is blacklisted");
        require(amount > 0, "amount should be greater than 0");
    }
}
