import { ethers } from "ethers";
const { encoding, wire } = require("bns");

export const encodeName = (name: string) => {
  let n = (name.endsWith(".") ? name : name + ".").toLowerCase();

  return encoding.packName(n);
};

export const decodeRdata = (rdata: string) => {
  let r = rdata.startsWith("0x") ? rdata.substring(2) : rdata;

  return new wire.Record().fromHex(r);
};

export const namehash = (name: string) => {
  return ethers.utils.keccak256(encodeName(name));
};
