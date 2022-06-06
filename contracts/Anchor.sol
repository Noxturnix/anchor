// SPDX-License-Identifier: ISC
pragma solidity ^0.8.0;

/**
 * @title Anchor - A minimalist smart contract implementation for linking HNS names to IPFS content
 * @author Sirawit Thaya (@Noxturnix)
 * @notice Users are supposed to deploy this contract and use it with their own names themselves individually. See https://github.com/Noxturnix/anchor
 */
contract Anchor {
  address public owner;
  mapping(bytes32 => string) private _ipfs;
  mapping(bytes32 => bool) private _locked;
  mapping(bytes32 => bytes) private _dnslinkOf;

  /**
   * @notice Thrown when caller is not the owner
   */
  error NotOwner();

  /**
   * @notice Thrown when trying to set an IPFS CID to a name that is already locked
   */
  error LockedName();

  /**
   * @notice Only allow owner to call a function
   */
  modifier onlyOwner() {
    if (msg.sender != owner) revert NotOwner();
    _;
  }

  /**
   * Set the owner to deploying address
   */
  constructor() {
    owner = msg.sender;
  }

  /**
   * @notice Set contract ownership to a new address
   * @param newOwner The new owner of the contract
   */
  function setOwner(address newOwner) external onlyOwner {
    owner = newOwner;
  }

  /**
   * @notice Return this contract itself as a resolver
   */
  function resolver(bytes32) external view returns (address) {
    return address(this);
  }

  /**
   * @notice Return DNS record
   * @dev Only used to return _dnslink.* queries
   * @param wireformatNamehash The keccak256 hash of a wire-formatted name
   */
  function dnsRecord(
    bytes32,
    bytes32 wireformatNamehash,
    uint16 resource
  ) external view returns (bytes memory) {
    uint8 ipfsCIDLength = uint8(bytes(_ipfs[wireformatNamehash]).length);
    if (ipfsCIDLength > 0 && resource == 16)
      return
        abi.encodePacked(
          _dnslinkOf[wireformatNamehash],
          "\x00\x10\x00\x01\x00\x00\x0e\x10\x00",
          ipfsCIDLength + 14 + 1,
          ipfsCIDLength + 14,
          "dnslink=/ipfs/",
          _ipfs[wireformatNamehash]
        );
    return "";
  }

  /**
   * @notice Set IPFS CID to a name
   * @param wireformatName Name encoded in wire format
   * @param ipfsCID IPFS CID
   * @param lock Whether to lock the name from further changes after the process is done
   */
  function setIPFS(
    bytes calldata wireformatName,
    string calldata ipfsCID,
    bool lock
  ) external onlyOwner {
    bytes memory dnsLinkWireformatName = _dnsLinkWireformat(wireformatName);
    bytes32 dnsLinkWireformatNamehash = keccak256(dnsLinkWireformatName);

    if (_locked[dnsLinkWireformatNamehash]) revert LockedName();

    _dnslinkOf[dnsLinkWireformatNamehash] = dnsLinkWireformatName;
    _ipfs[dnsLinkWireformatNamehash] = ipfsCID;
    _locked[dnsLinkWireformatNamehash] = lock;
  }

  /**
   * @notice Reset IPFS CID for a name
   * @param wireformatName Name encoded in wire format
   */
  function resetIPFS(bytes calldata wireformatName) external onlyOwner {
    bytes32 dnsLinkWireformatNamehash = keccak256(_dnsLinkWireformat(wireformatName));

    if (_locked[dnsLinkWireformatNamehash]) revert LockedName();

    delete _ipfs[dnsLinkWireformatNamehash];
  }

  /**
   * @notice Lock a name from further changes
   * @param wireformatName Name encoded in wire format
   */
  function lockName(bytes calldata wireformatName) external onlyOwner {
    _locked[keccak256(_dnsLinkWireformat(wireformatName))] = true;
  }

  /**
   * @notice Check if a name is locked
   * @param wireformatName Name encoded in wire format
   */
  function isLocked(bytes calldata wireformatName) external view returns (bool) {
    return _locked[keccak256(_dnsLinkWireformat(wireformatName))];
  }

  /**
   * @dev Add _dnslink subdomain to `wireformatName`
   * @param wireformatName Name encoded in wire format
   */
  function _dnsLinkWireformat(bytes calldata wireformatName) private pure returns (bytes memory) {
    return bytes.concat("\x08\x5f\x64\x6e\x73\x6c\x69\x6e\x6b", wireformatName);
  }
}
