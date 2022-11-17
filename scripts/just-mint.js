const { ethers, network } = require("hardhat")
const { mineBlocks } = require("../utils/mine-blocks")

const PRICE = ethers.utils.parseEther("0.2")

async function justMint() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")

    console.log("Minting new NFT...")

    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events[0].args.tokenId

    console.log(`New NFT minted! Token ID: ${tokenId}`)
    console.log(`NFT Address: ${basicNft.address}`)
}

justMint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
