const {
    Node,
    Schema,
    fields
} = require('@mayahq/module-sdk')
const GdriveAuth = require("../gdriveAuth/gdriveAuth.schema");

class GdriveExportFile extends Node {
    constructor(node, RED) {
        super(node, RED)
    }

    static schema = new Schema({
        name: 'Export File',
        label: 'gdrive-export-file',
        category: 'Maya Red Gdrive',
        isConfig: false,
        color: '#FDF0C2',
        icon: 'fa-google',
        fields: {
            // Whatever custom fields the node needs.
            session: new fields.ConfigNode({type: GdriveAuth}),
            fileId: new fields.Typed({ type: "str", allowedTypes: ["str", "msg", "flow", "global"], displayName: "File Id"}),
            documentType: new fields.SelectFieldSet({
                fieldSets:{
                    sheet: {
                        sheetType: new fields.Select({options: ["xlsx", "odf", "pdf", "csv"], defaultVal: "xlsx", displayName: "Export Type"})
                    },
                    doc: {
                        docType: new fields.Select({options: ["docx", "odt", "pdf", "txt"], defaultVal: "docx", displayName: "Export Type"})
                    },
                    slide: {
                        slideType: new fields.Select({options: ["pptx", "odp", "pdf", "txt"], defaultVal: "pptx", displayName: "Export Type"})
                    }
                }, displayName: "Document Type"
            })
        },

    })

    onInit() {
        // Do something on initialization of node
    }

    async onMessage(msg, vals) {
        // Handle the message. The returned value will
        // be sent as the message to any further nodes.

    }
}

module.exports = GdriveExportFile