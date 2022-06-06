import { ethers } from "ethers";
const { encoding } = require("bns");

export const encodeName = (name: string) => {
  let n = (name.endsWith(".") ? name : name + ".").toLowerCase();

  return encoding.packName(n);
};

export const namehash = (name: string) => {
  return ethers.utils.keccak256(encodeName(name));
};
