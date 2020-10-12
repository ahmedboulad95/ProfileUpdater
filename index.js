const { Connection } = require('jsforce');
const config = require('./config.json');
require('dotenv').config();

connectToSalesforce = (url, username, password) => {
    if(!url) return Promise.reject('No url provided');
    if(!username) return Promise.reject('No username provided');
    if(!password) return Promise.reject('No password provided');

    console.log('Connecting to Salesforce...');
    return new Promise((resolve, reject) => {
        const conn = new Connection({
            loginUrl: url
        });

        conn.login(username, password, async function(err, userInfo) {
            if(err) return reject(err);
            return resolve(conn);
        });
    });
}

listMetadata = (conn, types, apiVersion) => {
    if(!types) return Promise.reject('No types provided to list metadata');
    if(!apiVersion) return Promise.reject('No api version specified to list metadata');

    console.log('Retrieving profile metadata...');
    return new Promise((resolve, reject) => {
        conn.metadata.list(types, '50.0', function(err, metadata) {
            if(err) return reject(err);
            return resolve(metadata);
        });
    });
}

extractProfileNamesFromMdt = (metadata) => {
    if(!metadata || !Array.isArray(metadata)) return [];

    const profileNames = [];
    for(let i = 0; i < metadata.length; ++i) {
        const profileName = decodeURIComponent(metadata[i].fullName);
        if(!config.excludedProfiles.includes(profileName))
            profileNames.push(profileName);
    }
    return profileNames;
}

updateClassAccess = (classNames) => {
    if(!classNames || !Array.isArray(classNames)) return [];

    const classAccesses = [];
    for(let j = 0; j < classNames.length; ++j) {
        classAccesses.push({
            "apexClass": classNames[j],
            "enabled": "true"
        });
    }
    return classAccesses;
}

batch = (items, size) => {
    if(!items || !Array.isArray(items)) return [];

    const batchedItems = [];
    for (let i = 0; i< items.length; i+=size) {
        batchedItems.push(items.slice(i, i+size));
    }
    return batchedItems;
}

updateMetadata = (conn, metadataType, metadata) => {
    if(!metadataType) return Promise.reject('No metadata type specified');
    if(!metadata || !Array.isArray(metadata)) return Promise.reject('Not metadata provided');

    return new Promise((resolve, reject) => {
        conn.metadata.update(metadataType, metadata, function(err, results) {
            if(err) return reject(err);
            return resolve(results);
        });
    });
}

(async function() {
    try {
        const conn = await connectToSalesforce(process.env.LOGIN_URL, process.env.USERNAME, process.env.PASSWORD);
        if(!conn) throw new Error('Failed to establish Salesforce connection');
        console.log('Successfully established Salesforce connection');

        const metadata = await listMetadata(conn, [{type:'Profile', folder:null}], '50.0');
        if(!metadata || !Array.isArray(metadata)) throw new Error('Failed to retrieve profile metadata');
        console.log('Successfully retrieved profile metadata');

        const profileNames = extractProfileNamesFromMdt(metadata);

        const profileMetadata = [];
        for(let i = 0; i < profileNames.length; ++i) {
            const profile = {
                "fullName": profileNames[i],
                "classAccesses": updateClassAccess(config.classAccess),
                "objectPermissions": config.objectAccess || []
            };
            
            profileMetadata.push(profile);
        }

        console.log('Updating profiles...');
        const batchedMetadata = batch(profileMetadata, 10);
        const updatePromises = batchedMetadata.map(mdt => updateMetadata(conn, 'Profile', mdt));

        Promise.all(updatePromises).then(results => {
            console.log('All profiles updated');
            results = results.flat();
            for(let i = 0; i < results.length; ++i) {
                console.log('success ? : ' + results[i].success);
                console.log('fullName : ' + results[i].fullName);
            } 
        }).catch(err => console.error(err));
    } catch(ex) {
        console.error(ex);
    }
})();