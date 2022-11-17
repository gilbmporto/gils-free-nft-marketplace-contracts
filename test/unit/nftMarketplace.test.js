const { expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace Contract Unit Tests", function () {
          let nftMarketplace, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              nftOwner = accounts[1]
              await deployments.fixture(["nftmarketplace"])
              nftMarketplace = await ethers.getContract("NftMarketplace")
              BasicNft = await ethers.getContractFactory("BasicNft", deployer)
              basicNft = await BasicNft.deploy()
              await basicNft.deployed()
          })

          describe("ListItem", () => {
              beforeEach(async () => {
                  let basicNftTxResponse = await basicNft.connect(nftOwner).mintNft()
                  await basicNftTxResponse.wait(1)
                  let basicNftTxApproval = await basicNft.connect(nftOwner).approve(nftMarketplace.address, "0")
                  await basicNftTxApproval.wait(1)
              })

              it("Should be able to list new NFTs", async () => {
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.01"))
                  let nftMarketplaceTxReceipt = await nftMarketplaceTxResponse.wait(1)
                  expect(nftMarketplaceTxReceipt.events[0].args.seller.toString()).to.equal(nftOwner.address.toString())
                  expect(nftMarketplaceTxReceipt.events[0].args.nftAddress.toString()).to.equal(basicNft.address.toString())
                  expect(nftMarketplaceTxReceipt.events[0].args.tokenId.toString()).to.equal("0")
              })

              it("Should not allow anyone to 'relist' the NFT item", async () => {
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.01"))
                  let nftMarketplaceTxReceipt = await nftMarketplaceTxResponse.wait(1)
                  await expect(
                      nftMarketplace.connect(nftOwner).listItem(basicNft.address, "0", ethers.utils.parseEther("0.01"))
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NFTIsAlreadyListed")
              })

              it("Should allow only the owner of the NFT item to enlist it", async () => {
                  await expect(
                      nftMarketplace.connect(deployer).listItem(basicNft.address, "0", ethers.utils.parseEther("0.01"))
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__SpenderIsNotTheOwner")
              })

              it("Should revert if the NFT owner doesn't enter a price", async () => {
                  await expect(nftMarketplace.connect(nftOwner).listItem(basicNft.address, "0", "0")).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeGreaterThanZero"
                  )
              })
          })

          describe("BuyItem", () => {
              beforeEach(async () => {
                  let basicNftTxResponse = await basicNft.connect(nftOwner).mintNft()
                  await basicNftTxResponse.wait(1)
                  let basicNftTxApproval = await basicNft.connect(nftOwner).approve(nftMarketplace.address, "0")
                  await basicNftTxApproval.wait(1)
              })

              it("Should revert if the item is not listed", async () => {
                  await expect(
                      nftMarketplace.connect(deployer).buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.1") })
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NFTNotListed")
              })

              it("Should allow another account to buy a listed NFT", async () => {
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
                  nftMarketplaceTxResponse = await nftMarketplace
                      .connect(deployer)
                      .buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.1") })
                  let nftMarketplaceTxReceipt = await nftMarketplaceTxResponse.wait(1)
                  expect(nftMarketplaceTxReceipt).to.emit(nftMarketplace.address, "NftBought")
              })

              it("Should transfer the ownership of the NFT to the client", async () => {
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
                  nftMarketplaceTxResponse = await nftMarketplace
                      .connect(deployer)
                      .buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.1") })
                  await nftMarketplaceTxResponse.wait(1)
                  expect(await basicNft.connect(deployer).ownerOf("0")).to.equal(deployer.address)
              })

              it("Should transfer the ETH paid to the previous owner of the sold NFT", async () => {
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
                  nftMarketplaceTxResponse = await nftMarketplace
                      .connect(deployer)
                      .buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.1") })
                  await nftMarketplaceTxResponse.wait(1)
                  expect(await nftMarketplace.getProceeds(nftOwner.address)).to.equal(ethers.utils.parseEther("0.1"))
              })

              it("Should delete listing of the NFT after it's sold", async () => {
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
                  nftMarketplaceTxResponse = await nftMarketplace
                      .connect(deployer)
                      .buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.1") })
                  await nftMarketplaceTxResponse.wait(1)
                  expect((await nftMarketplace.connect(deployer).getListing(basicNft.address, "0")).toString()).to.equal(
                      "0,0x0000000000000000000000000000000000000000"
                  )
              })

              it("Should revert if the buyer is sending less money than the price of the item", async () => {
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
                  await expect(
                      nftMarketplace.connect(deployer).buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.05") })
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotEnoughCash")
              })
          })

          describe("CancelListing", () => {
              beforeEach(async () => {
                  let basicNftTxResponse = await basicNft.connect(nftOwner).mintNft()
                  await basicNftTxResponse.wait(1)
                  let basicNftTxApproval = await basicNft.connect(nftOwner).approve(nftMarketplace.address, "0")
                  await basicNftTxApproval.wait(1)
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
              })

              it("Only the owner of the NFT is able to cancel the listing", async () => {
                  await expect(nftMarketplace.connect(deployer).cancelListing(basicNft.address, "0")).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__SpenderIsNotTheOwner"
                  )
              })

              it("Should delete the listing of the NFT", async () => {
                  const txResponse = await nftMarketplace.connect(nftOwner).cancelListing(basicNft.address, "0")
                  await txResponse.wait(1)
                  const nftListing = await nftMarketplace.getListing(basicNft.address, "0")
                  expect(nftListing.toString()).to.equal("0,0x0000000000000000000000000000000000000000")
              })

              it("Should emit an event called ItemCanceled", async () => {
                  const txResponse = await nftMarketplace.connect(nftOwner).cancelListing(basicNft.address, "0")
                  expect(txResponse.wait(1)).to.emit(nftMarketplace.address, "ItemCanceled")
              })
          })

          describe("UpdateListing", () => {
              beforeEach(async () => {
                  let basicNftTxResponse = await basicNft.connect(nftOwner).mintNft()
                  await basicNftTxResponse.wait(1)
                  let basicNftTxApproval = await basicNft.connect(nftOwner).approve(nftMarketplace.address, "0")
                  await basicNftTxApproval.wait(1)
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
              })

              it("Should only be able to be called by the owner", async () => {
                  await expect(
                      nftMarketplace.connect(deployer).updateListing(basicNft.address, "0", ethers.utils.parseEther("1"))
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__SpenderIsNotTheOwner")
              })

              it("Should update the price of the NFT", async () => {
                  let txResponse = await nftMarketplace.getListing(basicNft.address, "0")
                  expect(txResponse[0].toString()).to.equal(ethers.utils.parseEther("0.1"))
                  await nftMarketplace.connect(nftOwner).updateListing(basicNft.address, "0", ethers.utils.parseEther("0.2"))
                  let txResponseAfterUpdatingNFT = await nftMarketplace.getListing(basicNft.address, "0")
                  expect(txResponseAfterUpdatingNFT[0].toString()).to.equal(ethers.utils.parseEther("0.2"))
              })

              it("Should emit an event called NftPriceUpdated", async () => {
                  const txResponse = await nftMarketplace
                      .connect(nftOwner)
                      .updateListing(basicNft.address, "0", ethers.utils.parseEther("0.2"))
                  expect(txResponse.wait(1)).to.emit(nftMarketplace.address, "NftPriceUpdated")
              })
          })

          describe("WithdrawProceeds", () => {
              beforeEach(async () => {
                  let basicNftTxResponse = await basicNft.connect(nftOwner).mintNft()
                  await basicNftTxResponse.wait(1)
                  let basicNftTxApproval = await basicNft.connect(nftOwner).approve(nftMarketplace.address, "0")
                  await basicNftTxApproval.wait(1)
                  let nftMarketplaceTxResponse = await nftMarketplace
                      .connect(nftOwner)
                      .listItem(basicNft.address, "0", ethers.utils.parseEther("0.1"))
                  await nftMarketplaceTxResponse.wait(1)
              })

              it("Should revert if account has no proceeds", async () => {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotEnoughProceeds"
                  )
              })

              it("Proceeds of the user must be set to ZERO", async () => {
                  const buyNftTx = await nftMarketplace
                      .connect(deployer)
                      .buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.1") })
                  await buyNftTx.wait(1)
                  const txResponse = await nftMarketplace.connect(nftOwner).withdrawProceeds()
                  await txResponse.wait(1)
                  const nftOwnerProceeds = await nftMarketplace.getProceeds(nftOwner.address)
                  expect(nftOwnerProceeds.toString()).to.equal("0")
              })

              it("Should emit an event named ProceedsWithdrawed", async () => {
                  const buyNftTx = await nftMarketplace
                      .connect(deployer)
                      .buyItem(basicNft.address, "0", { value: ethers.utils.parseEther("0.1") })
                  await buyNftTx.wait(1)
                  const txResponse = await nftMarketplace.connect(nftOwner).withdrawProceeds()
                  const txReceipt = await txResponse.wait(1)
                  expect(txReceipt).to.emit(nftMarketplace.address, "ProceedsWithdrawed")
              })
          })
      })
