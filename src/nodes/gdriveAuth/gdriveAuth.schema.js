const {
    Node,
    Schema
} = require('@mayahq/module-sdk')
const FastMQ = require('fastmq');
const nodeSchedule = require("node-schedule");
const crypto = require('crypto');

class GdriveAuth extends Node {
    static schema = new Schema({
        name: 'gdrive-auth',
        label: 'gdrive-auth',
        category: 'config',
        isConfig: true,
        fields: {
            // Whatever custom fields the node needs.
            fastmqChannel: {type: String,defaultVal: "master" },
            fastmqTopic: {type: String,defaultVal: "refresh" },
            name: {defaultVal: this.name}
        },
        redOpts: {
            credentials: {
                access_token: {
                    type: String
                },
                expiry_date: {
                    type: Number
                },
                referenceId: {
                    type: String
                }
            }
        }

    })

    refreshCreds (fastmqChannel, fastmqTopic, referenceId) {
        console.log(arguments)
        var requestChannel;
        // create a client with 'requestChannel' channel name and connect to server.
        FastMQ.Client.connect('', fastmqChannel, {reconnect: false}).then((channel) => { // client connected
            requestChannel = channel;
            // send request to 'master' channel  with topic 'test_cmd' and JSON format payload.
            let reqPayload = {
                data: {
                    referenceId: referenceId,
                    configNodes: [this.redNode.type]
                }
            };
            return requestChannel.request(fastmqChannel, fastmqTopic, reqPayload, 'json');
        }).then((result) => {
            console.log('Got response from master, data:' + result.payload.data);
            // client channel disconnect
            requestChannel.disconnect();
        }).catch((err) => {
            console.log('Got error:', err.stack);
        }).finally(() => {
            if(requestChannel){
                if(!requestChannel._socket.destroyed){
                    console.log("destroying client socket");
                    requestChannel.disconnect();
                }
            }
        });
    }

    onInit(RED) {
        this.credentials = RED.nodes.getCredentials(this.redNode.id);
        // Do something on initialization of node
        var localUserCache = {};
        if (this.credentials.access_token && this.credentials.expiry_date) {
            this.credHash = crypto.createHash('sha1').update(this.credentials.access_token).digest('base64');
            localUserCache[this.credHash] = this.name;
            if (localUserCache.hasOwnProperty(this.credHash)) {
                this.localIdentityPromise = Promise.resolve(localUserCache[this.credHash]);
            } else {
                this.warn("Failed to authenticate with Google");
            }
            if(this.credentials.expiry_date < Date.now()){
                this.refreshCreds(this.redNode.fastmqChannel, this.redNode.fastmqTopic, this.credentials.referenceId)
            }
            nodeSchedule.scheduleJob(new Date(this.credentials.expiry_date - 5000), function () {
                this.refreshCreds(this.redNode.fastmqChannel, this.redNode.fastmqTopic, this.credentials.referenceId)
            });
        }
    }

    async onMessage(msg, vals) {
        // Handle the message. The returned value will
        // be sent as the message to any further nodes.

    }
}

module.exports = GdriveAuth