const { expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

//writing the test code from here..

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT Unit Tests", function () {
          let basicNft, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              //await deployments.fixture(["basicnft"])
              basicNftContract = await ethers.getContractFactory("BasicNft", deployer)
              basicNft = await basicNftContract.deploy()
          })

          describe("Constructor", () => {
              it("Initializes the constructor correctly", async () => {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenId = await basicNft.getTokenCounter()
                  expect(name).to.equal("Doggie")
                  expect(symbol).to.equal("Dog")
                  expect(tokenId.toString()).to.equal("0")
              })
          })

          describe("All other functions", () => {
              it("Mints NFT correctly", async () => {
                  await basicNft.mintNft()
                  const nftId = await basicNft.getTokenCounter()
                  console.log(nftId.toString())
                  expect(nftId.toString()).to.equal("1")
              })

              it("Gets the correct NFT URI", async () => {
                  const tokenUri = await basicNft.tokenURI(0)
                  expect(tokenUri.toString()).to.equal(
                      "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json"
                  )
              })
          })
      })
