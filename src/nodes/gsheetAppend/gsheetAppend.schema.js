const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const GdriveAuth = require("../gdriveAuth/gdriveAuth.schema");

class GsheetAppend extends Node {
    constructor(node, RED) {
        super(node, RED)
    }

    static schema = new Schema({
        name: 'gsheet-append',
        label: 'gsheet-append',
        category: 'Maya Red Gdrive',
        isConfig: false,
        fields: {
            session: new fields.ConfigNode({type: GdriveAuth}),    
            spreadsheetId: new fields.Typed({type: 'str', defaultVal: '', allowedTypes: ['msg', 'flow', 'global']}),
            range: new fields.Typed({type: 'str', defaultVal: '', allowedTypes: ['msg', 'flow', 'global']}),
            values: new fields.Typed({type: 'str', allowedTypes: ['msg', 'flow', 'global']}),
            majorDimension: new fields.Select({ options: ['ROWS', 'COLUMNS'], defaultVal: 'ROWS' }),
            valueInputOption: new fields.Select({ options: ['RAW', 'USER_ENTERED'], defaultVal: 'USER_ENTERED' }),
            insertDataOption: new fields.Select({ options: ['OVERWRITE', 'INSERT_ROWS'], defaultVal: 'INSERT_ROWS' }),
            responseValueRenderOption: new fields.Select({ options: ['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'], defaultVal: 'FORMATTED_VALUE' }),
            responseDateTimeRenderOption: new fields.Select({ options: ['FORMATTED_STRING', 'SERIAL_NUMBER'], defaultVal: 'FORMATTED_STRING' }),
        },
    })

    onInit() {
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        this.setStatus("PROGRESS", "fetching drive files...");
        var fetch = require("node-fetch"); // or fetch() is native in browsers
        try{
            let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${vals.spreadsheetId}/values/${encodeURI(vals.range)}:append?insertDataOption=${vals.insertDataOption}&responseDateTimeRenderOption=${vals.responseDateTimeRenderOption}&responseValueRenderOption=${vals.responseValueRenderOption}&valueInputOption=${vals.valueInputOption}`, 
            {
                method: "POST",
                body:JSON.stringify({
                    range: vals.range,
                    majorDimension: vals.majorDimension,
                    values: vals.values
                }),
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

module.exports = GsheetAppend