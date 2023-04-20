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