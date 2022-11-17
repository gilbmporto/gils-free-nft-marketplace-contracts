// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NftMarketplace__PriceMustBeGreaterThanZero();
error NftMarketplace__NFTNotApprovedForMarketplace();
error NftMarketplace__SpenderIsNotTheOwner();
error NftMarketplace__NFTNotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NFTIsAlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotEnoughCash(address nftAddress, uint256 tokenId, uint256 nftPrice);
error NftMarketplace__NotEnoughProceeds();
error NftMarketplace__TransferFailed();

contract NftMarketplace is ReentrancyGuard {
    // Type Variables
    struct NftData {
        uint256 price;
        address seller;
    }

    ////////////////////
    //     Events     //
    ////////////////////
    event NewNftListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event NftBought(address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemCanceled(address indexed owner, address indexed nftAddress, uint256 indexed tokenId);
    event NftPriceUpdated(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 updatedPrice);
    event ProceedsWithdrawed(address indexed owner, uint256 indexed proceeds);

    /////////////////////
    // State Variables //
    /////////////////////

    // NFT address => NFT IDs => NFT Data (Price and Owner)
    mapping(address => mapping(uint256 => NftData)) private s_nftLists;

    // Seller address => Amount earned
    mapping(address => uint256) private s_proceeds;

    ////////////////////
    //    Modifiers   //
    ////////////////////
    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        NftData memory nftData = s_nftLists[nftAddress][tokenId];
        if (nftData.price > 0) {
            revert NftMarketplace__NFTIsAlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        NftData memory nftData = s_nftLists[nftAddress][tokenId];
        if (nftData.price <= 0) {
            revert NftMarketplace__NFTNotListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__SpenderIsNotTheOwner();
        }
        _;
    }

    ////////////////////
    // Main Functions //
    ////////////////////

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId, msg.sender) isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeGreaterThanZero();
        }

        // There is one of the two ways down below we can use to proceed with this function:
        // 1. Send the NFT to the contract. In that case, the contract will be holding the NFT
        // 2. Owners can still hold their NFT and give the marketplace approval to sell the NFT for them.
        // We will use the 2 way.

        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NFTNotApprovedForMarketplace();
        }
        s_nftLists[nftAddress][tokenId] = NftData(price, msg.sender);
        emit NewNftListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(address nftAddress, uint256 tokenId) external payable isListed(nftAddress, tokenId) {
        NftData memory listedItem = s_nftLists[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__NotEnoughCash(nftAddress, tokenId, listedItem.price);
        }
        s_proceeds[listedItem.seller] += msg.value;
        delete (s_nftLists[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        emit NftBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_nftLists[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        s_nftLists[nftAddress][tokenId].price = newPrice;
        emit NftPriceUpdated(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NotEnoughProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
        emit ProceedsWithdrawed(msg.sender, proceeds);
    }

    ////////////////////
    // Read Functions //
    ////////////////////

    function getListing(address nftAddress, uint256 tokenId) external view returns (NftData memory) {
        return s_nftLists[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
