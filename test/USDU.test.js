const assert = require("assert");
const proxy = artifacts.require("USDUProxy");
const USDUToken = artifacts.require("USDU_StableCoin_V1");

let USDUTokenInstance;
let proxyInstance;

beforeEach(async () => {
  proxyInstance = await proxy.deployed();
  USDUTokenInstance = await USDUToken.at(proxyInstance.address);
});

contract("USDUToken Test", async (accounts) => {
  it("should initialize only once", async () => {
    try {
      await USDUTokenInstance.initialize(
        "USDU TOKEN",
        "USDU",
        web3.utils.toWei("100000000")
      );
      assert.fail();
    } catch (error) {
      assert.strictEqual(
        error.message,
        "Returned error: VM Exception while processing transaction: revert Initializable: contract is already initialized -- Reason given: Initializable: contract is already initialized."
      );
    }
  });

  it("should return token initial call data", async () => {
    const name = await USDUTokenInstance.name.call();
    const symbol = await USDUTokenInstance.symbol.call();
    const totalSupply = await USDUTokenInstance.totalSupply.call();
    const decimals = await USDUTokenInstance.decimals.call();
    assert.strictEqual("USDU STABLE COIN", name);
    assert.strictEqual("USDU", symbol);
    assert.strictEqual("100000000", web3.utils.fromWei(totalSupply, "ether"));
    assert.strictEqual(18, web3.utils.hexToNumber(decimals));
  });

  it("should check initial supply minted to owner", async () => {
    const owner = await USDUTokenInstance.owner.call();
    const ownerBalance = await USDUTokenInstance.balanceOf(owner);
    const totalSupply = await USDUTokenInstance.totalSupply.call();
    assert.strictEqual(
      web3.utils.fromWei(totalSupply, "ether"),
      web3.utils.fromWei(ownerBalance, "ether")
    );
  });

  it("should transfer tokens", async () => {
    const balanceSpenderBefore = await USDUTokenInstance.balanceOf(accounts[0]);
    const balanceRecieverBefore = await USDUTokenInstance.balanceOf(
      accounts[1]
    );
    await USDUTokenInstance.transfer(
      accounts[1],
      web3.utils.toWei("10000", "ether")
    );
    const balanceSpenderAfter = await USDUTokenInstance.balanceOf(accounts[0]);
    const balanceRecieverAfter = await USDUTokenInstance.balanceOf(accounts[1]);
    assert.strictEqual(
      "100000000",
      web3.utils.fromWei(balanceSpenderBefore, "ether")
    );
    assert.strictEqual(
      "99990000",
      web3.utils.fromWei(balanceSpenderAfter, "ether")
    );
    assert.strictEqual("0", web3.utils.fromWei(balanceRecieverBefore, "ether"));
    assert.strictEqual(
      "10000",
      web3.utils.fromWei(balanceRecieverAfter, "ether")
    );
  });

  it("should approve spending", async () => {
    await USDUTokenInstance.approve(
      accounts[1],
      web3.utils.toWei("1000", "ether")
    );
    const allowance = await USDUTokenInstance.allowance(
      accounts[0],
      accounts[1]
    );
    assert.strictEqual("1000", web3.utils.fromWei(allowance, "ether"));
  });

  it("is possible to increase or decrease allowance", async () => {
    await USDUTokenInstance.decreaseAllowance(
      accounts[1],
      web3.utils.toWei("100", "ether")
    );
    let allowance = await USDUTokenInstance.allowance(accounts[0], accounts[1]);
    assert.strictEqual("900", web3.utils.fromWei(allowance, "ether"));
    await USDUTokenInstance.increaseAllowance(
      accounts[1],
      web3.utils.toWei("200", "ether")
    );
    allowance = await USDUTokenInstance.allowance(accounts[0], accounts[1]);
    assert.strictEqual("1100", web3.utils.fromWei(allowance, "ether"));
  });

  it("allows transfer from approved spender", async () => {
    ``;
    await USDUTokenInstance.transferFrom(
      accounts[0],
      accounts[2],
      web3.utils.toWei("1000"),
      { from: accounts[1] }
    );
    const recieverBalance = await USDUTokenInstance.balanceOf(accounts[2]);
    const allowance = await USDUTokenInstance.allowance(
      accounts[0],
      accounts[1]
    );
    assert.strictEqual("1000", web3.utils.fromWei(recieverBalance, "ether"));
    assert.strictEqual("100", web3.utils.fromWei(allowance));
  });

  it("is burnable", async () => {
    await USDUTokenInstance.burn(web3.utils.toWei("1000", "ether"), {
      from: accounts[0],
    });
    const totalSupply = await USDUTokenInstance.totalSupply.call();
    assert.strictEqual("99999000", web3.utils.fromWei(totalSupply, "ether"));
  });

  it("allows burn from approved accounts", async () => {
    await USDUTokenInstance.approve(
      accounts[0],
      web3.utils.toWei("1000", "ether"),
      { from: accounts[1] }
    );
    await USDUTokenInstance.burnFrom(
      accounts[1],
      web3.utils.toWei("100", "ether"),
    );
    const balance = await USDUTokenInstance.balanceOf(accounts[1]);
    const totalSupply = await USDUTokenInstance.totalSupply.call();
    assert.strictEqual("99988900", web3.utils.fromWei(balance, "ether"));
    assert.strictEqual("99998900", web3.utils.fromWei(totalSupply, "ether"));
    const allowance = await USDUTokenInstance.allowance(
      accounts[0],
      accounts[1]
    );
    assert.strictEqual("0", web3.utils.fromWei(allowance));
  });

  it("burnable is access controlled", async () => {
    try {
      await USDUTokenInstance.revokeRole(
        "0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848",
        accounts[1]
      );
      await USDUTokenInstance.burn(web3.utils.toWei("1000", "ether"), {
        from: accounts[1],
      });
      assert.fail();
    } catch (error) {
      assert.strictEqual(
        error.message,
        "Returned error: VM Exception while processing transaction: revert AccessControl: account 0xf17f52151ebef6c7334fad080c5704d77216b732 is missing role 0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848 -- Reason given: AccessControl: account 0xf17f52151ebef6c7334fad080c5704d77216b732 is missing role 0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848."
      );
    }
  });

  it("is Pausable", async () => {
    let paused = await USDUTokenInstance.paused.call();
    assert.strictEqual(false, paused);
    await USDUTokenInstance.pause();
    paused = await USDUTokenInstance.paused.call();
    assert.ok(paused);
  });

  it("block transer during paused ", async () => {
    try {
      await USDUTokenInstance.pause();
      await USDUTokenInstance.transfer(
        accounts[1],
        web3.utils.toWei("10000", "ether")
      );
      assert.fail();
    } catch (error) {
      assert.strictEqual(
        error.message,
        "Returned error: VM Exception while processing transaction: revert Pausable: paused -- Reason given: Pausable: paused."
      );
    }
  });

  it("is ownable", async () => {
    try {
      await USDUTokenInstance.unpause({ from: accounts[1] });
      assert.fail();
    } catch (error) {
      if (error.code === "ERR_ASSERTION") assert.fail("Test Failed");
      else {
        const unpause = await USDUTokenInstance.unpause({ from: accounts[0] });
        assert.ok(unpause);
      }
    }
  });

  it("is mintable", async () => {
    await USDUTokenInstance.mint(
      accounts[3],
      web3.utils.toWei("100000000", "ether"),
      { from: accounts[0] }
    );
    const balance = await USDUTokenInstance.balanceOf(accounts[3]);
    const totalSupply = await USDUTokenInstance.totalSupply.call();
    assert.strictEqual("100000000", web3.utils.fromWei(balance, "ether"));
    assert.strictEqual("199998900", web3.utils.fromWei(totalSupply, "ether"));
  });
  it("mintable access controlled", async () => {
    try {
      await USDUTokenInstance.mint(
        accounts[3],
        web3.utils.toWei("100000000", "ether"),
        { from: accounts[1] }
      );
      assert.fail();
    } catch (error) {
      assert.strictEqual(
        error.message,
        "Returned error: VM Exception while processing transaction: revert AccessControl: account 0xf17f52151ebef6c7334fad080c5704d77216b732 is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 -- Reason given: AccessControl: account 0xf17f52151ebef6c7334fad080c5704d77216b732 is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6."
      );
    }
  });

  it("block transfer if to address is blacklisted", async () => {
    try {
      await USDUTokenInstance.blacklist(accounts[3]);
      await USDUTokenInstance.transfer(
        accounts[3],
        web3.utils.toWei("1000", "ether")
      );
      assert.fail();
    } catch (error) {
      assert.strictEqual(
        error.message,
        "Returned error: VM Exception while processing transaction: revert to address is blacklisted -- Reason given: to address is blacklisted."
      );
    }
  });

  it("block transfer if from address is blacklisted", async () => {
    try {
      await USDUTokenInstance.blacklist(accounts[3]);
      await USDUTokenInstance.transfer(
        accounts[2],
        web3.utils.toWei("1000", "ether"),
        { from: accounts[3] }
      );
      assert.fail();
    } catch (error) {
      assert.strictEqual(
        error.message,
        "Returned error: VM Exception while processing transaction: revert from address is blacklisted -- Reason given: from address is blacklisted."
      );
    }
  });
  it("allow transfer if address removed from blacklist", async () => {
    try {
      await USDUTokenInstance.removeBlacklist(accounts[3]);
      await USDUTokenInstance.transfer(
        accounts[3],
        web3.utils.toWei("1000", "ether")
      );
      await USDUTokenInstance.transfer(
        accounts[2],
        web3.utils.toWei("1000", "ether"),
        { from: accounts[3] }
      );
      assert.ok(true);
    } catch (error) {
      assert.fail();
    }
  });
});
