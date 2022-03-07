const proxyContract = artifacts.require("USDUProxy");
const tokenContract = artifacts.require("USDU_StableCoin_V1");
const adminContract = artifacts.require("USDUProxyAdmin");
const owner = process.env.OWNER
const transferAddress = process.env.TRANSFER_ADDRESS

module.exports = async function(deployer){
    const contract = new web3.eth.Contract(tokenContract.abi)
    const data = contract.methods.initialize("USDU STABLE COIN","USDU",web3.utils.toWei('100000000')).encodeABI();
    await deployer.deploy(adminContract);
    adminInstance = await adminContract.deployed();
    await deployer.deploy(tokenContract);
    await deployer.deploy(proxyContract,tokenContract.address,adminContract.address,data);
}