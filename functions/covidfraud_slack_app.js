"use strict";
const functions = require("firebase-functions");

const config = functions.config();

const fraudDB = require("./fraud_db");
const messageParser = require("./message_parser");

const {App, ExpressReceiver} = require("@slack/bolt");

exports.createApp = function(appConfigName) {
  const expressReceiver = new ExpressReceiver({
    signingSecret: config[appConfigName].signing_secret,
    endpoints: "/events",
    processBeforeResponse: true,
  });
  const app = new App({
    receiver: expressReceiver,
    token: config[appConfigName].bot_token,
    processBeforeResponse: true,

  });

  // Global error handler
  app.error(console.log);

  // Handle `/echo` command invocations
  app.command("/echo-from-firebase", async ({command, ack, say}) => {
    // Acknowledge command request
    await ack();

    // Requires:
    // Add chat:write scope
    //   + invite the bot user to the channel you run this command
    //
    // Add chat:write.public
    //   + run this command in a public channel
    await say(`You said "${command.text}"`);
  });

  app.command("/verify-contact", async ({command, ack, respond}) => {
    // Acknowledge command request
    await ack("Checking for fraudulent contacts..");

    const msg = command.text;
    const emailIds = messageParser.extractEmailIdsFromMessage(msg);
    const phoneNumbers = messageParser.extractPhoneNumbersFromMessage(msg);

    if (!emailIds.length && !phoneNumbers.length) {
      await respond("No email ids or phone numbers given for verification");
      return;
    }

    let respText = "";
    if (emailIds.length) {
      const fraudulentEmailIds = await fraudDB.searchForEmailIds(emailIds);
      if (fraudulentEmailIds.length) {
        respText += `\nFound fraudulent email ids: ${fraudulentEmailIds}`;
      }
    }

    if (phoneNumbers.length) {
      const fraudulentPhoneNos = await fraudDB.searchForPhoneNumbers(
          phoneNumbers);
      if (fraudulentPhoneNos.length) {
        respText += `\nFound fraudulent phone numbers: ${fraudulentPhoneNos}`;
      }
    }

    respText = respText.trim();
    if (respText.length) {
      await respond(respText);
    } else {
      await respond("No fraudulent contact found");
    }
  });

  app.command("/verify-account", async ({command, ack, respond}) => {
    // Acknowledge command request
    await ack("Checking for fraudulent accounts..");

    const msg = command.text;
    const accounts = messageParser.extractPossibleBankAccountsFromMessage(msg);

    if (!accounts.length) {
      await respond("No accounts given for verification");
      return;
    }

    if (accounts.length) {
      const fraudulentAccounts = await fraudDB.searchForBankAccounts(accounts);
      if (fraudulentAccounts.length) {
        await respond(`Found fraudulent accounts: ${fraudulentAccounts}`);
      } else {
        await respond("No fraudulent account found");
      }
    }
  });

  app.message(async ({message, say}) => {
    if (message.bot_id || message.hidden) {
      return;
    }

    const msg = message.text;
    const blocks = message.blocks;

    const emailIds = messageParser.extractEmailIdsFromMessage(msg, blocks);
    const phoneNumbers = messageParser.extractPhoneNumbersFromMessage(
        msg, blocks);

    let replyTxt = "";
    if (emailIds.length) {
      const fraudulentEmailIds = await fraudDB.searchForEmailIds(emailIds);
      if (fraudulentEmailIds.length) {
        replyTxt += `\nFound fraudulent email ids: ${fraudulentEmailIds}`;
      }
    }

    if (phoneNumbers.length) {
      const fraudulentPhoneNos = await fraudDB.searchForPhoneNumbers(
          phoneNumbers);
      if (fraudulentPhoneNos.length) {
        replyTxt += `\nFound fraudulent phone numbers: ${fraudulentPhoneNos}`;
      }
    }

    replyTxt = replyTxt.trim();
    if (replyTxt.length) {
      const toSay = {
        "channel": message.channel,
        "thread_ts": message.ts,
        "text": replyTxt,
        "reply_broadcast": true,
      };
      await say(toSay);
    }
  });

  return expressReceiver.app;
};
