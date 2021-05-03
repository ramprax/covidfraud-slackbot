## Setup

Use node 12.x and its corresponding npm.

```bash
cp _firebaserc .firebaserc
vi .firebaserc # set your own project

npm install -g firebase-tools
firebase login
# Change 'slack_test' to 'slack' in the following lines when deploying for the actual slack workspace
firebase functions:config:set slack_test.signing_secret=xxx
firebase functions:config:set slack_test.bot_token=xoxb-111-111-xxx
```

## How to run the app on your laptop

```bash
cd functions
npm i
cd -
firebase functions:config:get > .runtimeconfig.json
firebase serve
```

## How to deploy

```bash
firebase deploy --only functions
```
