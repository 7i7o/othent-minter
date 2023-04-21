/**
 * Deploy script for minting soulbound NFTs.
 *
 * Logic Flow:
 * 1) Parse list of Othent users
 * 2) For each contract address:
 * 2.A) Mint a new atomic asset with the provided contract.js
 * 2.B) Send an email to the user with the template provided by Fayaz
 * 3) Celebrate 🎉
 */

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import Arweave from "arweave";

const emailFrom = "hello@othent.io";
const emailPassword = "PASSWORD GOES HERE";
const emailTemplate = fs.readFileSync(
  path.resolve(__dirname, "./templates/email.html")
);
const contractSource = "CONTRACT SOURCE HERE";
const JWK = {};

// Prepare Base64 Image DataURL
const imgData = fs.readFileSync(
  path.resolve(__dirname, "./templates/certificate.jpg")
);
const imgDataEncoded = "data:image/jpeg;base64," + imgData.toString('base64')

async function parseUserList() { }

async function mintAsset(userAddress) {
  const client = await Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  const sbt = await client.createTransaction(
    {
      data: imgDataEncoded,
    },
    JWK
  );
  sbt.addTag("App-Name", "SmartWeaveContract");
  sbt.addTag("App-Version", "0.3.0");
  sbt.addTag("Contract-Src", contractSource);
  sbt.addTag("Content-Type", "image/JPEG");
  sbt.addTag(
    "Contract-State",
    JSON.stringify({
      balances: {
        userAddress: 1,
      },
    })
  );

  await client.transactions.sign(sbt);
  await client.transactions.post(sbt);
}

async function sendEmail(userEmail) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailFrom,
      pass: emailPassword,
    },
  });
  const outboundEmail = {
    from: emailFrom,
    to: userEmail,
    subject: "Arweave Frontier NFT",
    html: emailTemplate,
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
      const confirmation = await sendEmail(userList[i].email);
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
