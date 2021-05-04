"use strict";
const functions = require("firebase-functions");

const config = functions.config();

const fraudDB = require("./fraud_db");
const messageParser = require("./message_parser");

const {App, ExpressReceiver} = require("@slack/bolt");

/**
 *
 * @param {Array} fraudulentEmailIds
 * @param {Array} fraudulentPhoneNos
 * @return {String} responseText
 */
function makeResponseText(fraudulentEmailIds, fraudulentPhoneNos) {
  let respText = "";
  if (fraudulentEmailIds.length) {
    respText += `\nFound fraudulent email ids: ${fraudulentEmailIds}`;
  }
  if (fraudulentPhoneNos.length) {
    respText += `\nFound fraudulent phone numbers: ${fraudulentPhoneNos}`;
  }
  return respText.trim();
}

/**
 *
 * @param {String} txt
 * @param {Object} blocks
 * @return {Object} emailIds and phoneNumbers
 */
function extractContactsFromText(txt, blocks) {
  const emailIds = messageParser.extractEmailIdsFromMessage(txt, blocks);

  let msgWithoutEmails = txt;
  if (emailIds.length) {
    emailIds.forEach((em) => {
      msgWithoutEmails = msgWithoutEmails.replace(new RegExp(em, "gi"), "\n");
    });
  }
  const phoneNumbers = messageParser.extractPhoneNumbersFromMessage(
      msgWithoutEmails, blocks);

  return {emailIds: emailIds, phoneNumbers: phoneNumbers};
}

/**
 *
 * @param {Array} emailIds
 * @param {Array} phoneNumbers
 * @return {Object} fraudulentEmailIds & fraudulentPhoneNumbers
 */
async function verifyContacts(emailIds, phoneNumbers) {
  let fraudulentEmailIds = [];
  if (emailIds.length) {
    fraudulentEmailIds = await fraudDB.searchForEmailIds(emailIds);
  }

  let fraudulentPhoneNumbers = [];
  if (phoneNumbers.length) {
    fraudulentPhoneNumbers = await fraudDB.searchForPhoneNumbers(
        phoneNumbers);
  }

  return {
    fraudulentEmailIds: fraudulentEmailIds,
    fraudulentPhoneNumbers: fraudulentPhoneNumbers,
  };
}


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
  app.command("/echo-from-firebase",
      async ({command, ack, respond, client}) => {
        // Acknowledge command request
        await ack();

        // Requires:
        // Add chat:write scope
        //   + invite the bot user to the channel you run this command
        //
        // Add chat:write.public
        //   + run this command in a public channel
        await respond(`You said "${command.text}"`);

        const authTestResp = await client.auth.test();
        await respond(`Auth test response:
          OK:${authTestResp.ok}
          bot_id:${authTestResp.bot_id}`);
      },
  );

  app.command("/verify-contact", async ({command, ack, respond}) => {
    // Acknowledge command request
    await ack("Checking for fraudulent contacts..");

    const {emailIds, phoneNumbers} = extractContactsFromText(command.text);

    if (!emailIds.length && !phoneNumbers.length) {
      await respond("No email ids or phone numbers given for verification");
      return;
    }

    const {fraudulentEmailIds, fraudulentPhoneNumbers} = await verifyContacts(
        emailIds, phoneNumbers);

    const respText = makeResponseText(
        fraudulentEmailIds, fraudulentPhoneNumbers);
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

  app.message(async ({message, say, client}) => {
    if (message.hidden) {
      return;
    }
    if (message.bot_id) {
      const authTestResp = await client.auth.test();
      if (authTestResp.bot_id == message.bot_id) {
        return;
      }
    }

    const txt = message.text;
    const blocks = message.blocks;

    const {emailIds, phoneNumbers} = extractContactsFromText(txt, blocks);

    const {fraudulentEmailIds, fraudulentPhoneNumbers} = await verifyContacts(
        emailIds, phoneNumbers);

    const replyTxt = makeResponseText(
        fraudulentEmailIds, fraudulentPhoneNumbers);

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
