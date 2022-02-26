//SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

import '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';


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

contract USDU_StableCoin_V1 is ERC20PausableUpgradeable, OwnableUpgradeable, Blacklistable {

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
     * - the caller must have has BURNER_ROLE.
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
     * - the caller must have has BURNER_ROLE.
     */
    function burnFrom(address account, uint256 amount) public virtual onlyOwner {
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
        require(isBlacklisted(user),'address is not blacklisted');
        _removeBlacklist(user);
    }
    
    /**
    * @dev transfer tokens to multiple accounts through a single call.
    * @param transferAddresses array contains the to addresses.
    * @param amounts array contains the amount needed to be transfered.
    * - the caller must be owner of the contract.
     */
    function batchTransfer(address[] calldata transferAddresses, uint256[] calldata amounts) 
    external 
    onlyOwner
    virtual
    {
        require(transferAddresses.length == amounts.length, "Invalid input parameters");

        for(uint256 i = 0; i < transferAddresses.length; i++) {
            require(transfer(transferAddresses[i], amounts[i]), "Unable to transfer token to the account");
        }
    }

    /**
     * @dev checks before token transfer.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(!isBlacklisted(from),'from address is blacklisted');
        require(!isBlacklisted(to),'to address is blacklisted');
        require(amount > 0, 'amount should be greater than 0');
    }
}