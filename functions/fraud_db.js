"use strict";
// const functions = require("firebase-functions");

// const config = functions.config();

const firebaseAdmin = require("firebase-admin");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.applicationDefault(),
});

const firestore = firebaseAdmin.firestore();
const fraudsRef = firestore.collection("frauds");

exports.searchForEmailIds = function(emailIds) {
  return fraudsRef.where("emails", "array-contains-any", emailIds).get().then(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          return doc.data();
        });
        const fEmails = [];
        data.forEach((row) => {
          row.emails.forEach((em) => {
            if (emailIds.includes(em)) {
              fEmails.push(em);
            }
          });
        });
        return [...new Set(fEmails)];
      },
  );
};

exports.searchForPhoneNumbers = function(phoneNos) {
  return fraudsRef.where("mobiles", "array-contains-any", phoneNos).get().then(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          return doc.data();
        });
        const fMobiles = [];
        data.forEach((row) => {
          row.mobiles.forEach((ph) => {
            if (phoneNos.includes(ph)) {
              fMobiles.push(ph);
            }
          });
        });
        return [...new Set(fMobiles)];
      },
  );
};

