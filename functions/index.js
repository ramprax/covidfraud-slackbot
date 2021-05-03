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

// This instance is for testing
// https://{your domain}.cloudfunctions.net/slack/events
const testSlackApp = covidFraudSlackApp.createApp("slack");
exports.slack = functions.https.onRequest(testSlackApp);
