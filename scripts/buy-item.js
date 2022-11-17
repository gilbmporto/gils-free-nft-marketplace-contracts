const { ethers, network } = require("hardhat")
const { mineBlocks } = require("../utils/mine-blocks")

const TOKEN_ID = 1

const buyItem = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
    console.log("This is the NFT of ID 2: ")
    console.log(listing)
    const itemPrice = listing.price.toString()
    console.log("This is the price of this NFT: ")
    console.log((itemPrice / 1e18).toString())
    const buyTxResponse = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: itemPrice })
    await buyTxResponse.wait(1)
    console.log("Bought NFT!")

    // if (network.config.chainId == "31337") {
    //     await mineBlocks(2, 1000)
    // }
}

buyItem()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
