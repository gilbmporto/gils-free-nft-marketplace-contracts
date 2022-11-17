const { ethers, network } = require("hardhat")
const { mineBlocks } = require("../utils/mine-blocks")

const TOKEN_ID = 0

async function cancelItem() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    const cancelTxResponse = await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
    await cancelTxResponse.wait(1)
    console.log("NFT canceled!")

    if (network.config.chainId == "31337") {
        await mineBlocks(2, 1000)
    }
}

cancelItem()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
