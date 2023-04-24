/**
 * Deploy script for minting soulbound NFTs.
 *
 * Logic Flow:
 * 1) Parse list of Othent users ✅
 * 2) For each contract address: ✅
 * 2.A) Mint a new atomic asset with the provided contract.js ✅
 * 2.B) Send an email to the user with the template provided by Fayaz ✅
 * 3) Celebrate 🎉
 */

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import { DeployPlugin, ArweaveSigner } from 'warp-contracts-plugin-deploy';
import { WarpFactory } from 'warp-contracts';


dotenv.config();

const emailFrom = "hello@othent.io";
const emailPassword = process.env.EMAIL_PASSWORD;
const emailTemplate = fs.readFileSync(
  path.resolve(__dirname, "./templates/email.html")
);

// Parse JWK
const JWK = JSON.parse(process.env.JWK_PATH ?
  fs.readFileSync(path.resolve(__dirname, process.env.JWK_PATH), 'utf-8')
  :
  Buffer.from(process.env.BASE64_JWK, 'base64').toString('utf-8')
);

// Prepare Base64 Image DataURL
const imgData = fs.readFileSync(
  path.resolve(__dirname, "./templates/certificate.jpg")
);
const imgDataEncoded = "data:image/jpeg;base64," + imgData.toString('base64');

// Prepare contract source for all sbts
const warp = WarpFactory.forMainnet().use(new DeployPlugin());
const contractSource = fs.readFileSync(
  path.resolve(__dirname, "./templates/contract.js")
);
let contractSrcTxId;
try {
  const contractTx = await warp.createSource({ src: contractSource }, new ArweaveSigner(JWK));
  contractSrcTxId = await warp.saveSource(contractTx);
  console.log("Contract Source deployed to: ", contractSrcTxId);
} catch (err) {
  throw new Error(err);
}

async function parseUserList() {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './listOfUsers.json'), 'utf-8')
  );
}

async function mintAsset(userAddress) {

  const sbtTx = await warp.deployFromSourceTx({
    wallet: JWK,
    srcTxId: contractSrcTxId,
    initState: JSON.stringify({
      name: "Arweave Fundamentals Certificate",
      description: "Certificate of completion of Arweave Fundamentals",
      ticker: "ARFCert",
      contentType: "image/JPEG",
      owner: userAddress,
      balances: {
        [userAddress]: 1,
      },
    }),
    data: { "Content-Type": "image/JPEG", body: imgDataEncoded },
  })

  return sbtTx.contractTxId;
}

async function sendEmail(userEmail, txId) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailFrom,
      pass: emailPassword,
    },
  });
  const emailContent = emailTemplate.replace(
    '{{NFT_LINK}}',
    !txId ?
      'https://vt.communitylabs.com/email-certificate.jpg'
      :
      `https://arweave.net/${txId}`);
  const outboundEmail = {
    from: emailFrom,
    to: userEmail,
    subject: "Arweave Frontier NFT",
    html: emailContent,
  };
  transporter.sendMail(outboundEmail, (error, info) => {
    if (error) {
      console.log(error, info);
      throw new Error(error);
    } else {
      return "Email sent";
    }
  });
}

async function runIt() {
  // userList type should be: { address: string, email: string }[]
  const userList = await parseUserList();
  for (let i = 0; i < userList.length; i++) {
    console.log(`Now minting for user: ${userList[i].address}`);
    let txID;
    try {
      txID = await mintAsset(userList[i].address);
    } catch (err) {
      throw new Error(err);
    }

    console.log(`Now emailing for user: ${userList[i].address}`);
    try {
      const confirmation = await sendEmail(userList[i].email, txID);
    } catch (err) {
      throw new Error(err);
    }

    console.log("Sleeping to avoid DDOSing mail servers");
    await delay(1000);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Bombs away
// runIt();
