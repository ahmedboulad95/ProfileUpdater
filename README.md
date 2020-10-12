# Salesforce Profile Updater

## Dependencies
```
Node.Js (v12.x.x): https://nodejs.org/en/
```

## Before Running
Update the config.json file to add the classes and objects you want to update. You can exclude profiles by adding them to the excludeProfiles section.
Also, add a .env with the Salesforce user credentials. The .env_sample file contains the required format.

## To run the application
```
cd ProfileUpdater
npm install
node index.js
```
