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

  it("allows owner to burn from approved accounts", async () => {
    await USDUTokenInstance.approve(
      accounts[0],
      web3.utils.toWei("1000", "ether"),
      { from: accounts[1] }
    );
    await USDUTokenInstance.burnFrom(
      accounts[1],
      web3.utils.toWei("100", "ether")
    );
    const balance = await USDUTokenInstance.balanceOf(accounts[1]);
    const totalSupply = await USDUTokenInstance.totalSupply.call();
    assert.strictEqual("9900", web3.utils.fromWei(balance, "ether"));
    assert.strictEqual("99998900", web3.utils.fromWei(totalSupply, "ether"));
    const allowance = await USDUTokenInstance.allowance(
      accounts[1],
      accounts[0]
    );
    assert.strictEqual("900", web3.utils.fromWei(allowance));
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
  it("mintable is ownable", async () => {
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
        "Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner."
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

  it("allows owner to withdraw trapped tokens", async () => {
    await USDUTokenInstance.transfer(
      USDUTokenInstance.address,
      web3.utils.toWei("1", "ether")
    );
    const smartContractBalanceBefore = await USDUTokenInstance.balanceOf.call(
      USDUTokenInstance.address
    );
    const ownerBalanceBefore = await USDUTokenInstance.balanceOf.call(
      accounts[0]
    );
    await USDUTokenInstance.withdrawToken(
      web3.utils.toWei("1", "ether"),
      USDUTokenInstance.address
    );
    const ownerBalanceAfter = await USDUTokenInstance.balanceOf.call(
      accounts[0]
    );
    const smartContractBalanceAfter = await USDUTokenInstance.balanceOf.call(
      USDUTokenInstance.address
    );
    assert.strictEqual(
      parseFloat(web3.utils.fromWei(smartContractBalanceBefore, "ether")),
      parseFloat(web3.utils.fromWei(ownerBalanceAfter, "ether")) -
        parseFloat(web3.utils.fromWei(ownerBalanceBefore, "ether")),
      "smart contract balance mismatch"
    );
    assert.strictEqual(
      parseInt(smartContractBalanceAfter),
      0,
      "smartcontract balance after withdraw mismatched"
    );
  });

  it("should allow owner to transfer in a batch", async () => {
    try {
      
      const rec1BalanceBefore = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[1]),
        "ether"
      );
      const rec2BalanceBefore = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[2]),
        "ether"
      );
      const rec3BalanceBefore = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[3]),
        "ether"
      );
      const rec4BalanceBefore = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[4]),
        "ether"
      );
      // let address = [];
      // let amount = [];
      // for(let i =0; i<800; i++){
      //   address.push(accounts[1])
      //   amount.push(web3.utils.toWei("0.1", "ether"))
      // }
      const receipt = await USDUTokenInstance.batchTransfer(
        [
          accounts[1],
          accounts[2],
          accounts[3],
          accounts[4],
        ],
        [
          web3.utils.toWei("100", "ether"),
          web3.utils.toWei("110", "ether"),
          web3.utils.toWei("120", "ether"),
          web3.utils.toWei("130", "ether"),
        ]
        //address, amount
      );
      const rec1BalanceAfter = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[1]),
        "ether"
      );
      const rec2BalanceAfter = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[2]),
        "ether"
      );
      const rec3BalanceAfter = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[3]),
        "ether"
      );
      const rec4BalanceAfter = web3.utils.fromWei(
        await USDUTokenInstance.balanceOf.call(accounts[4]),
        "ether"
      );
      assert.strictEqual(rec1BalanceAfter - rec1BalanceBefore, 100);
      assert.strictEqual(rec2BalanceAfter - rec2BalanceBefore, 110);
      assert.strictEqual(rec3BalanceAfter - rec3BalanceBefore, 120);
      assert.strictEqual(rec4BalanceAfter - rec4BalanceBefore, 130);
      //console.log("Gas Used for Batch transfer:", receipt.receipt.gasUsed);
    } catch (error) {
      console.log(error)
    }
  });

  it("allows owner to set fee param", async () => {
    await USDUTokenInstance.setFeeParams(10, web3.utils.toWei("1", "ether"));
    const basisPointsRate = await USDUTokenInstance.basisPointsRate.call();
    const maxFee = await USDUTokenInstance.maximumFee.call();
    assert.strictEqual(
      basisPointsRate.toString(),
      "10",
      "setting basisPointRate failed"
    );
    assert.strictEqual(
      maxFee.toString(),
      web3.utils.toWei("1", "ether").toString(),
      "setting maxFee failed"
    );
  });

  it("transfers a portion of transfer amount as fee", async () => {
    const balanceSpenderBefore = await USDUTokenInstance.balanceOf(accounts[1]);
    const balanceRecieverBefore = await USDUTokenInstance.balanceOf(
      accounts[2]
    );
    const balanceOwnerBefore = await USDUTokenInstance.balanceOf(accounts[0]);
    const receipt = await USDUTokenInstance.transfer(
      accounts[2],
      web3.utils.toWei("1000", "ether"),
      { from: accounts[1] }
    );
    const balanceSpenderAfter = await USDUTokenInstance.balanceOf(accounts[1]);
    const balanceRecieverAfter = await USDUTokenInstance.balanceOf(accounts[2]);
    const balanceOwnerAfter = await USDUTokenInstance.balanceOf(accounts[0]);
    assert.strictEqual(
      web3.utils.fromWei(balanceSpenderBefore, "ether").toString() -
        web3.utils.fromWei(balanceSpenderAfter, "ether").toString(),
      1000,
      "spender balance error"
    );
    assert.strictEqual(
      web3.utils.fromWei(balanceRecieverAfter, "ether").toString() -
        web3.utils.fromWei(balanceRecieverBefore, "ether").toString(),
      999,
      "reciever balance error"
    );
    assert.strictEqual(
      web3.utils.fromWei(balanceOwnerAfter, "ether").toString() -
        web3.utils.fromWei(balanceOwnerBefore, "ether").toString(),
      1
    );
  });
});
