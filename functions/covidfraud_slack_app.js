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
    }

    if (emailIds.length) {
      await fraudDB.searchForEmailIds(emailIds).then(
          (fraudulentEmailIds) => {
            if (fraudulentEmailIds.length) {
              respond(`Found fraudulent email ids: ${fraudulentEmailIds}`);
            } else {
              respond("No matching email in fraud db");
            }
          },
          (result) => {
            console.warn("No matching email in fraud db");
            console.warn(result);
            respond("No matching email in fraud db");
          },
      ).catch(console.error);
    }

    if (phoneNumbers.length) {
      await fraudDB.searchForPhoneNumbers(phoneNumbers).then(
          (fraudulentPhoneNos) => {
            if (fraudulentPhoneNos.length) {
              respond(`Found fraudulent phone numbers: ${fraudulentPhoneNos}`);
            } else {
              respond("No matching phone number in fraud db");
            }
          },
          (result) => {
            console.warn("No matching phone number in fraud db");
            console.warn(result);
            respond("No matching phone number in fraud db");
          },
      ).catch(console.error);
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

    if (emailIds.length) {
      await fraudDB.searchForEmailIds(emailIds).then(
          (fraudEmailIds) => {
            if (fraudEmailIds.length) {
              const replyTxt = `Found fraudulent email ids: ${fraudEmailIds}`;
              const toSay = {
                "channel": message.channel,
                "thread_ts": message.ts,
                "text": replyTxt.trim(),
                "reply_broadcast": true,
              };
              say(toSay);
            }
          },
      ).catch(console.error);
    }

    if (phoneNumbers.length) {
      await fraudDB.searchForPhoneNumbers(phoneNumbers).then(
          (fraudPhNos) => {
            if (fraudPhNos.length) {
              const replyTxt = `Found fraudulent phone numbers: ${fraudPhNos}`;
              const toSay = {
                "channel": message.channel,
                "thread_ts": message.ts,
                "text": replyTxt.trim(),
                "reply_broadcast": true,
              };
              say(toSay);
            }
          },
      ).catch(console.error);
    }
  });

  return expressReceiver.app;
};
