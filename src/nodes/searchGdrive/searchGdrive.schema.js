const {
    Node,
    Schema,
    fields,
} = require('@mayahq/module-sdk');
const refresh = require('../../util/refresh')
// const GdriveAuth = require("../gdriveAuth/gdriveAuth.schema");

class SearchGdrive extends Node {
    static schema = new Schema({
        name: 'search-gdrive',
        label: 'search-gdrive',
        category: 'Maya Red Gdrive',
        color: '#FDF0C2',
        isConfig: false,
        icon: "drive.png",
        fields: {
            query: new fields.Typed({ type: 'str', defaultVal: '', allowedTypes: ['msg', 'flow', 'global'] }),
            includeItemsFromAllDrives: new fields.Typed({ type: 'bool', defaultVal: true, allowedTypes: ['msg', 'flow', 'global'] }),
            pageSize: new fields.Typed({ type: 'num', defaultVal: 10, allowedTypes: ['msg', 'flow', 'global'] }),
            pageToken: new fields.Typed({ type: 'str', defaultVal: '', allowedTypes: ['msg', 'flow', 'global'] }),
        },

    })

    constructor(node, RED, opts) {
        super(node, RED, {
            ...opts
        })
    }

    async refreshTokens({ force = false } = {}) {
        const newTokens = await refresh(this, { force })
        return newTokens
    }

    onInit() {
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        // Handle the message. The returned value will
        // be sent as the message to any further nodes.
        this.setStatus("PROGRESS", "fetching drive files...");
        var fetch = require("node-fetch"); // or fetch() is native in browsers
        let fetchConfig = {
            url: `https://www.googleapis.com/drive/v3/files?q=${encodeURI(vals.query)}&includeItemsFromAllDrives=${vals.includeItemsFromAllDrives}&supportsTeamDrives=${vals.includeItemsFromAllDrives}&pageSize=${vals.pageSize}${vals.pageToken && vals.pageToken !== '' ? `&pageToken=${vals.pageToken}` : ''}`,
            method: "GET",
            headers: {
                "Authorization": `Bearer ${this.tokens.vals.access_token}`,
                "Content-Type": "application/json"
            }
        }
        let res
        try {
            res = await fetch(fetchConfig.url,
                {
                    method: fetchConfig.method,
                    headers: fetchConfig.headers
                });
            let json = await res.json();
            // let json = { error: { code: 401 }}
            if (json.error) {
                if (json.error.code === 401) {
                    console.log('We refreshing')
                    const { access_token, fromCache } = await this.refreshTokens({ force: false })
                    console.log('access_token', access_token, fromCache)
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
                            headers: fetchConfig.headers
                        });
                    json = await res.json();
                    if (json.error) {
                        if (json.error.code === 401 && fromCache) {
                            const { access_token } = await this.refreshTokens({ force: true })
                            fetchConfig.headers.Authorization = `Bearer ${access_token}`;
                            res = await fetch(fetchConfig.url,
                                {
                                    method: fetchConfig.method,
                                    headers: fetchConfig.headers
                                });
                            json = await res.json();
                        } else {
                            msg["__isError"] = true
                            msg.error = json.error;
                            this.setStatus("ERROR", json.error.message);
                            return msg;
                        }
                    }
                } else {
                    msg["__isError"] = true;
                    msg.error = json.error;
                    this.setStatus("ERROR", json.error.message);
                    return msg;
                }

            }
            msg.payload = json;
            this.setStatus("SUCCESS", "fetched");
            return msg;
        }
        catch (err) {
            console.log('There be error', err)
            msg["__isError"] = true;
            msg.error = err;
            this.setStatus("ERROR", "error occurred");
            return msg;
        }
    }
}

module.exports = SearchGdrive