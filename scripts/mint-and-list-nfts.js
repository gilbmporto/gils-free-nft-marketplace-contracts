const { ethers, network } = require("hardhat")
const { mineBlocks } = require("../utils/mine-blocks")

const PRICE = ethers.utils.parseEther("0.2")

async function mintAndList() {
    const nftMarketplace = await ethers.getContractAt("NftMarketplace", "0xbC0F9b666a7907f081F995DEb8C2b4155859D416")
    const basicNft = await ethers.getContractAt("BasicNft", "0x60f37A70cf14f2E670b22E72104d13c61423CfA0")

    console.log("Minting new NFT...")

    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events[0].args.tokenId

    console.log("Approving NFT to be listed...")

    const approveTx = await basicNft.approve(nftMarketplace.address, tokenId)
    await approveTx.wait(1)

    console.log("NFT approved to be listed! Now, let's list the NFT...")

    const txResponse = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE)
    const txReceipt = await txResponse.wait(1)

    console.log("NFT listed! There follows the listing event: ", txReceipt.events[0].args)

    // if (network.config.chainId == "31337") {
    //     await mineBlocks(2, 1000)
    // }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
