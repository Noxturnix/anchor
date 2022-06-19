import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import { boolean } from "hardhat/internal/core/params/argumentTypes";
import { decodeRdata, encodeName, namehash } from "./libs/wireformat";

dotenv.config();

const exampleDomain = "n.xtnx";

task("set-ipfs", "Set a name to an IPFS CID")
  .addOptionalParam("lock", "Lock `name` from further changes after the operation", false, boolean)
  .addPositionalParam("contractAddress", "Address of the Anchor smart contract to update")
  .addPositionalParam("name", `Domain name. (eg. "${exampleDomain}")`)
  .addPositionalParam("ipfsCID", "The IPFS CID")
  .setAction(async (args, hre) => {
    const AnchorFactory = await hre.ethers.getContractFactory("Anchor");
    const Anchor = AnchorFactory.attach(args.contractAddress);

    await Anchor.setIPFS(encodeName(args.name), args.ipfsCID, args.lock);

    console.log(`Successfully set IPFS on ${args.name}`);
  });

task("get-ipfs", "Get the IPFS CID of a name")
  .addPositionalParam("contractAddress", "Address of the Anchor smart contract to interact with")
  .addPositionalParam("name", `Domain name. (eg. "${exampleDomain}")`)
  .setAction(async (args, hre) => {
    const AnchorFactory = await hre.ethers.getContractFactory("Anchor");
    const Anchor = AnchorFactory.attach(args.contractAddress);

    let rdata: string = await Anchor.dnsRecord(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      namehash(args.name),
      16
    );

    if (rdata === "0x") console.error(`No IPFS record found for ${args.name}`);
    else {
      let record = decodeRdata(rdata);

      console.log(record.data.txt[0].substring(14));
    }
  });

task("reset-ipfs", "Reset the IPFS CID of a name")
  .addPositionalParam("contractAddress", "Address of the Anchor smart contract to update")
  .addPositionalParam("name", `Domain name. (eg. "${exampleDomain}")`)
  .setAction(async (args, hre) => {
    const AnchorFactory = await hre.ethers.getContractFactory("Anchor");
    const Anchor = AnchorFactory.attach(args.contractAddress);

    await Anchor.resetIPFS(encodeName(args.name));

    console.log(`Successfully reset IPFS on ${args.name}`);
  });

task("lock-name", "Lock a name from further changes")
  .addPositionalParam("contractAddress", "Address of the Anchor smart contract to update")
  .addPositionalParam("name", `Domain name. (eg. "${exampleDomain}")`)
  .setAction(async (args, hre) => {
    const AnchorFactory = await hre.ethers.getContractFactory("Anchor");
    const Anchor = AnchorFactory.attach(args.contractAddress);

    await Anchor.lockName(encodeName(args.name));

    console.log(`Successfully locked ${args.name}`);
  });

task("is-locked", "Check if a name is locked")
  .addPositionalParam("contractAddress", "Address of the Anchor smart contract to interact with")
  .addPositionalParam("name", `Domain name. (eg. "${exampleDomain}")`)
  .setAction(async (args, hre) => {
    const AnchorFactory = await hre.ethers.getContractFactory("Anchor");
    const Anchor = AnchorFactory.attach(args.contractAddress);

    let locked = await Anchor.isLocked(encodeName(args.name));

    console.log(`Name ${args.name} is ${locked ? "locked" : "not locked"}`);
  });

task("set-owner", "Set an address as the contract owner")
  .addPositionalParam("contractAddress", "Address of the Anchor smart contract to update")
  .addPositionalParam("ownerAddress", "The new owner address")
  .setAction(async (args, hre) => {
    const AnchorFactory = await hre.ethers.getContractFactory("Anchor");
    const Anchor = AnchorFactory.attach(args.contractAddress);

    await Anchor.setOwner(args.ownerAddress);

    console.log(`Successfully set ${args.ownerAddress} to owner`);
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.14",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      }
    }
  },
  namedAccounts: {
    deployer: 0,
    randomPerson1: 1
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    },
    ethereum: {
      url: process.env.ETHEREUM_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    },
    polygon: {
      url: process.env.POLYGON_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};

export default config;
