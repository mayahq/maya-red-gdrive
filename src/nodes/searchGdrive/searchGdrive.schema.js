const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const GdriveAuth = require("../gdriveAuth/gdriveAuth.schema");

class SearchGdrive extends Node {
    static schema = new Schema({
        name: 'search-gdrive',
        label: 'search-gdrive',
        category: 'Maya Red Gdrive',
        isConfig: false,
        fields: {
            session: new fields.ConfigNode({type: GdriveAuth}),
            query: new fields.Typed({type: 'str', defaultVal: '', allowedTypes: ['msg', 'flow', 'global']}),
            includeItemsFromAllDrives: new fields.Typed({type: 'bool', defaultVal: true, allowedTypes: ['msg', 'flow', 'global']}),
            pageSize: new fields.Typed({type: 'num', defaultVal: 10, allowedTypes: ['msg', 'flow', 'global']}),
            pageToken: new fields.Typed({type: 'str', defaultVal: '', allowedTypes: ['msg', 'flow', 'global']}),
        },

    })

    constructor(node, RED) {
        super(node, RED)
    }

    onInit() {
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        // Handle the message. The returned value will
        // be sent as the message to any further nodes.
        this.setStatus("PROGRESS", "fetching drive files...");
        var fetch = require("node-fetch"); // or fetch() is native in browsers
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
            this.setStatus("ERROR", "error occurred");
            return msg;
        }
    }
}

module.exports = SearchGdrive