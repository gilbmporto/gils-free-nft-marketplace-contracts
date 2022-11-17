const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    // const chainId = network.config.chainId

    let args = []

    log("----------------------------------------------------------------")
    const nftMarketPlace = await deploy("NftMarketplace", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying contract deployed with EtherScan...")
        await verify(nftMarketPlace.address, args)
    }
    log("----------------------------------------------------------------")
}

module.exports.tags = ["all", "nftmarketplace"]
