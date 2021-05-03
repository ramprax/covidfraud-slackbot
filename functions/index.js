"use strict";
const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const config = functions.config();

const fraudDB = require("./fraud_db");
const messageParser = require("./message_parser");

const {App, ExpressReceiver} = require("@slack/bolt");
const expressReceiver = new ExpressReceiver({
  signingSecret: config.slack.signing_secret,
  endpoints: "/events",
  processBeforeResponse: true,
});
const app = new App({
  receiver: expressReceiver,
  token: config.slack.bot_token,
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
  await ack();

  const msg = command.text;
  const emailIds = messageParser.extractEmailIdsFromMessage(msg);
  const phoneNumbers = messageParser.extractPhoneNumbersFromMessage(msg);

  if (emailIds.length) {
    fraudDB.searchForEmailIds(emailIds).then(
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
  } else {
    await respond("No email ids given");
  }

  if (phoneNumbers.length) {
    fraudDB.searchForPhoneNumbers(phoneNumbers).then(
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
  } else {
    await respond("No phone numbers given");
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
    fraudDB.searchForEmailIds(emailIds).then((fraudulentEmailIds) => {
      if (fraudulentEmailIds.length) {
        const replyText = `Found fraudulent email ids: ${fraudulentEmailIds}`;
        const toSay = {
          "channel": message.channel,
          "thread_ts": message.ts,
          "text": replyText.trim(),
          "reply_broadcast": true,
        };
        say(toSay);
      }
    }).catch(console.error);
  }

  if (phoneNumbers.length) {
    fraudDB.searchForPhoneNumbers(phoneNumbers).then((fraudPhoneNos) => {
      if (fraudPhoneNos.length) {
        const replyText = `Found fraudulent phone numbers: ${fraudPhoneNos}`;
        const toSay = {
          "channel": message.channel,
          "thread_ts": message.ts,
          "text": replyText.trim(),
          "reply_broadcast": true,
        };
        say(toSay);
      }
    }).catch(console.error);
  }
});

// https://{your domain}.cloudfunctions.net/slack/events
exports.slack = functions.https.onRequest(expressReceiver.app);
