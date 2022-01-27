const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
// const GdriveAuth = require("../gdriveAuth/gdriveAuth.schema");
const refresh = require('../../util/refresh');

class GsheetAppend extends Node {
    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts
        })
    }

    static schema = new Schema({
        name: 'gsheet-append',
        label: 'gsheet-append',
        category: 'Maya Red Gdrive',
        color: '#FDF0C2',
        isConfig: false,
        icon: "drive.png",
        fields: {  
            url: new fields.Typed({type: 'str', defaultVal: '', allowedTypes: ['msg', 'flow', 'global']}),
            range: new fields.Typed({type: 'str', defaultVal: 'Sheet1', allowedTypes: ['msg', 'flow', 'global']}),
            values: new fields.Typed({type: 'msg', defaultVal: 'payload', allowedTypes: ['msg', 'flow', 'global']}),
            majorDimension: new fields.Select({ options: ['ROWS', 'COLUMNS'], defaultVal: 'ROWS' }),
            valueInputOption: new fields.Select({ options: ['RAW', 'USER_ENTERED'], defaultVal: 'USER_ENTERED' }),
            insertDataOption: new fields.Select({ options: ['OVERWRITE', 'INSERT_ROWS'], defaultVal: 'INSERT_ROWS' }),
            responseValueRenderOption: new fields.Select({ options: ['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'], defaultVal: 'FORMATTED_VALUE' }),
            responseDateTimeRenderOption: new fields.Select({ options: ['FORMATTED_STRING', 'SERIAL_NUMBER'], defaultVal: 'FORMATTED_STRING' }),
        },
    })

    async refreshTokens() {
        const newTokens = await refresh(this)
        await this.tokens.set(newTokens)
        return newTokens
    }

    onInit() {
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        this.setStatus("PROGRESS", "fetching drive files...");
        var fetch = require("node-fetch"); // or fetch() is native in browsers
        let len = "https://docs.google.com/spreadsheets/d/".length;
        let spreadsheetId = vals.url.substring(len,vals.url.indexOf('/',len));
        let  values = [vals.values];
        let fetchConfig = {
            url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURI(vals.range)}:append?insertDataOption=${vals.insertDataOption}&responseDateTimeRenderOption=${vals.responseDateTimeRenderOption}&responseValueRenderOption=${vals.responseValueRenderOption}&valueInputOption=${vals.valueInputOption}`,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.tokens.vals.access_token}`,
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                    range: vals.range,
                    majorDimension: vals.majorDimension,
                    values: values
                })
        }
        try{
            let res = await fetch(fetchConfig.url, 
            {
                method: fetchConfig.method,
                headers: fetchConfig.headers,
                body: fetchConfig.body
            });
            let json = await res.json();
            if(json.error){
                if(json.error.code === 401){
                    const { access_token } = await this.refreshTokens()
                    if (!access_token) {
                        this.setStatus('ERROR', 'Failed to refresh access token')
                        msg["__isError"] = true;
                        msg.error = {
                            reason: 'TOKEN_REFRESH_FAILED',
                        }
                        return msg
                    }
                    fetchConfig.headers.Authorization = `Bearer ${access_token}`;
                    res = await fetch(fetchConfig.url, 
                            {
                                method: fetchConfig.method,
                                headers: fetchConfig.headers,
                                body: fetchConfig.body
                            });
                    json = await res.json();
                    if(json.error){
                        msg["__isError"] = true;
                        msg.error = json.error;
                        this.setStatus("ERROR", json.error.message);
                        return msg;
                    }
                } else {
                    msg.error = json.error;
                    msg["__isError"] = true;
                    this.setStatus("ERROR", json.error.message);
                    return msg;
                }
                
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