import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { decodeRdata, encodeName, namehash } from "../libs/wireformat";
const { wire } = require("bns");

const TEST_NAME_1 = "noxturnix";
const TEST_NAME_2 = "n.xtnx";

const setupTest = deployments.createFixture(async (hre: HardhatRuntimeEnvironment) => {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { deployer, randomPerson1 } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  const randomPerson1Signer = await ethers.getSigner(randomPerson1);

  await deployments.fixture();

  const anchor = await ethers.getContract("Anchor");

  return {
    deployer,
    deployerSigner,
    randomPerson1,
    randomPerson1Signer,
    anchor
  };
});

describe("Anchor", function () {
  it("Should return its own address as resolver", async function () {
    const { anchor } = await setupTest();

    expect(await anchor.resolver(ethers.utils.namehash(TEST_NAME_1))).to.equal(anchor.address);
  });

  it("Should allow owner to set IPFS record", async function () {
    const { anchor } = await setupTest();

    let testCIDv0 = "QmdytmR4wULMd3SLo6ePF4s3WcRHWcpnJZ7bHhoj3QB13v";
    let testCIDv1 = "bafybeihingyc22a6bqpjxxnugujozdm7xi6sobumhbak4x3wahwfvsmhne";

    await expect(anchor.setIPFS(encodeName(TEST_NAME_1), testCIDv0, false)).to.not.reverted;

    let dnsRecordCIDv0 = decodeRdata(
      await anchor.dnsRecord(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        namehash(TEST_NAME_1),
        16
      )
    );

    expect(dnsRecordCIDv0.name).to.equal(TEST_NAME_1 + ".");
    expect(dnsRecordCIDv0.type).to.equal(16);
    expect(dnsRecordCIDv0.data.txt).to.contain("dnslink=/ipfs/" + testCIDv0);

    await expect(anchor.setIPFS(encodeName(TEST_NAME_1), testCIDv1, false)).to.not.reverted;

    let dnsRecordCIDv1 = decodeRdata(
      await anchor.dnsRecord(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        namehash(TEST_NAME_1),
        16
      )
    );

    expect(dnsRecordCIDv1.name).to.equal(TEST_NAME_1 + ".");
    expect(dnsRecordCIDv1.type).to.equal(16);
    expect(dnsRecordCIDv1.data.txt).to.contain("dnslink=/ipfs/" + testCIDv1);
  });

  it("Should reset record", async function () {
    const { anchor } = await setupTest();

    let testCID = "QmdytmR4wULMd3SLo6ePF4s3WcRHWcpnJZ7bHhoj3QB13v";

    await expect(anchor.setIPFS(encodeName(TEST_NAME_1), testCID, false)).to.not.reverted;
    await expect(anchor.resetIPFS(encodeName(TEST_NAME_1))).to.not.reverted;

    expect(
      await anchor.dnsRecord(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        namehash(TEST_NAME_1),
        16
      )
    ).to.equal("0x");
  });

  it("Should not allow other addresses from updating data", async function () {
    const { anchor, randomPerson1, randomPerson1Signer } = await setupTest();

    let testCID1 = "QmdytmR4wULMd3SLo6ePF4s3WcRHWcpnJZ7bHhoj3QB13v";
    let testCID2 = "QmSFxnK675wQ9Kc1uqWKyJUaNxvSc2BP5DbXCD3x93oq61";

    await expect(
      anchor.connect(randomPerson1Signer).setIPFS(encodeName(TEST_NAME_1), testCID2, false)
    ).to.be.revertedWithCustomError(anchor, "NotOwner");

    await expect(anchor.setIPFS(encodeName(TEST_NAME_1), testCID1, false)).to.not.reverted;

    await expect(
      anchor.connect(randomPerson1Signer).setIPFS(encodeName(TEST_NAME_1), testCID2, false)
    ).to.be.revertedWithCustomError(anchor, "NotOwner");
    await expect(
      anchor.connect(randomPerson1Signer).lockName(encodeName(TEST_NAME_1))
    ).to.be.revertedWithCustomError(anchor, "NotOwner");
    await expect(
      anchor.connect(randomPerson1Signer).setOwner(randomPerson1)
    ).to.be.revertedWithCustomError(anchor, "NotOwner");
  });

  it("Should not allow names from getting updated if locked", async function () {
    const { anchor } = await setupTest();

    let testCID1 = "QmdytmR4wULMd3SLo6ePF4s3WcRHWcpnJZ7bHhoj3QB13v";
    let testCID2 = "QmSFxnK675wQ9Kc1uqWKyJUaNxvSc2BP5DbXCD3x93oq61";

    await expect(anchor.setIPFS(encodeName(TEST_NAME_1), testCID1, false)).to.not.reverted;
    await expect(anchor.setIPFS(encodeName(TEST_NAME_1), testCID2, true)).to.not.reverted;
    await expect(
      anchor.setIPFS(encodeName(TEST_NAME_1), testCID1, false)
    ).to.be.revertedWithCustomError(anchor, "LockedName");

    await expect(anchor.setIPFS(encodeName(TEST_NAME_2), testCID1, false)).to.not.reverted;
    await expect(anchor.lockName(encodeName(TEST_NAME_2))).to.not.reverted;
    await expect(
      anchor.setIPFS(encodeName(TEST_NAME_2), testCID2, false)
    ).to.be.revertedWithCustomError(anchor, "LockedName");
  });

  it("Should accept new owner", async function () {
    const { anchor, randomPerson1, randomPerson1Signer } = await setupTest();

    let testCID1 = "QmdytmR4wULMd3SLo6ePF4s3WcRHWcpnJZ7bHhoj3QB13v";
    let testCID2 = "QmSFxnK675wQ9Kc1uqWKyJUaNxvSc2BP5DbXCD3x93oq61";

    await expect(anchor.setIPFS(encodeName(TEST_NAME_1), testCID1, false)).to.not.reverted;
    await expect(anchor.setOwner(randomPerson1)).to.not.reverted;

    await expect(
      anchor.connect(randomPerson1Signer).setIPFS(encodeName(TEST_NAME_1), testCID2, false)
    ).to.not.reverted;
    await expect(anchor.connect(randomPerson1Signer).lockName(encodeName(TEST_NAME_1))).to.not
      .reverted;
    await expect(
      anchor.setIPFS(encodeName(TEST_NAME_1), testCID1, false)
    ).to.be.revertedWithCustomError(anchor, "NotOwner");
  });
});
