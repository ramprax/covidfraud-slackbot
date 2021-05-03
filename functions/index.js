"use strict";
const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const covidFraudSlackApp = require("./covidfraud_slack_app");

if (functions.config().slack_test) {
  // https://{your domain}.cloudfunctions.net/slack/events
  const slackTestApp = covidFraudSlackApp.createApp("slack_test");
  exports.slackTest = functions.https.onRequest(slackTestApp);
}

if (functions.config().slack) {
  // https://{your domain}.cloudfunctions.net/slack/events
  const slackApp = covidFraudSlackApp.createApp("slack");
  exports.slack = functions.https.onRequest(slackApp);
}
