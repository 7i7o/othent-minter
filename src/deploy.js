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
import Arweave from "arweave";
import dotenv from 'dotenv';

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
const contractSource = fs.readFileSync(
  path.resolve(__dirname, "./templates/contract.js")
);
let contractSrcTxId;
try {
  contractSrcTxId = await deployContractSource(contractSource);
} catch (err) {
  throw new Error(err);
}

// Set a Template for the Initial (and permanent) State of the sbts
const initStateTemplate = {
  name: "Arweave Fundamentals Certificate",
  description: "Certificate of completion of Arweave Fundamentals",
  ticker: "ARFCert",
  maxSupply: 1,
  contentType: "image/JPEG",
}

async function deployContractSource(contractSrc) {
  // Initialize client
  const client = await Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  // Create Tx
  const contractTx = await client.createTransaction({ data: contractSrc, }, JWK);
  contractTx.addTag("App-Name", "SmartWeaveContractSource");
  contractTx.addTag("App-Version", "0.3.0");
  contractTx.addTag('Content-Type', 'application/javascript');

  // Sign
  await client.transactions.sign(contractTx);
  const contractTxId = contractTx.id;

  // Post
  await client.transactions.post(contractTx);

  return contractTxId
}

async function parseUserList() {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './listOfUsers.json'), 'utf-8')
  );
}

async function mintAsset(userAddress) {
  // Initialize client
  const client = await Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  // Create Tx
  const sbt = await client.createTransaction(
    {
      data: imgDataEncoded,
    },
    JWK
  );
  sbt.addTag("App-Name", "SmartWeaveContract");
  sbt.addTag("App-Version", "0.3.0");
  // Set the txId of the Contract as Contract-Src
  sbt.addTag("Contract-Src", contractSrcTxId);
  sbt.addTag("Content-Type", "image/JPEG");
  sbt.addTag(
    "Init-State",
    JSON.stringify({
      ...initStateTemplate,
      owner: userAddress,
      balances: {
        [userAddress]: 1,
      },
    })
  );

  // Sign
  await client.transactions.sign(sbt);
  const sbtTxId = sbt.id;

  // Post
  await client.transactions.post(sbt);

  // TODO: return txId
  return sbtTxId;
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
runIt();
