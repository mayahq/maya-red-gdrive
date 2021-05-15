const {
    Node,
    Schema
} = require('@mayahq/module-sdk')
const GdriveAuth = require("../gdriveAuth/gdriveAuth.schema");

class SearchGdrive extends Node {
    static schema = new Schema({
        name: 'search-gdrive',
        label: 'search-gdrive',
        category: 'Maya Red Gdrive',
        isConfig: false,
        fields: {
            session: GdriveAuth,
            query: {
                type: String,
                defaultValue: ''
            },
            includeItemsFromAllDrives: {
                type: String,
                defaultValue: 'true'
            },
            pageSize: {
                type: Number,
                defaultValue: 10
            },
            pageToken: {
                type: String,
                defaultValue: ''
            }
        },

    })

    onInit() {
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        // Handle the message. The returned value will
        // be sent as the message to any further nodes.
        this.setStatus("PROGRESS", "fetching drive files...");
        var fetch = require("node-fetch"); // or fetch() is native in browsers
        console.log(vals)
        try{
            let res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURI(vals.query)}&includeItemsFromAllDrives=${vals.includeItemsFromAllDrives}&supportsTeamDrives=${vals.includeItemsFromAllDrives}&pageSize=${vals.pageSize}${vals.pageToken && vals.pageToken!== '' ? `&pageToken=${vals.pageToken}` : ''}`, 
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.credentials.session.access_token}`,
                    "Content-Type":"application/json"
                }
            });
            let json = await res.json();
            if(json.error){
                msg.error = json.error;
                this.setStatus("ERROR", json.error.message);
                return msg;
            }
            msg.payload = json;
            this.setStatus("SUCCESS", "fetched");
            return msg;
        }
        catch(err){
            msg.error = err;
            this.setStatus("ERROR", err.substring(0, 15));
            return msg;
        }
    }
}

module.exports = SearchGdrive