const { Node, Schema, fields } = require("@mayahq/module-sdk");
const fetch = require("node-fetch");
const { createWriteStream } = require("fs");
const { promisify } = require("util");
const { homedir } = require("os");
const { pipeline } = require("stream")
const path = require("path");
const refresh = require('../../util/refresh')
class GdriveExportFile extends Node {
	constructor(node, RED) {
		super(node, RED);
	}

	static schema = new Schema({
		name: "Export File",
		label: "gdrive-export-file",
		category: "Maya Red Gdrive",
		isConfig: false,
		color: "#FDF0C2",
		icon: "fa-google",
		fields: {
			// Whatever custom fields the node needs.
			session: new fields.ConfigNode({ type: GdriveAuth }),
			docUrl: new fields.Typed({
				type: "str",
				allowedTypes: ["str", "msg", "flow", "global"],
				displayName: "File URL",
			}),
			documentType: new fields.SelectFieldSet({
				fieldSets: {
					sheet: {
						sheetType: new fields.Select({
							options: ["xlsx", "ods", "pdf", "csv"],
							defaultVal: "xlsx",
							displayName: "Export Type",
						}),
					},
					doc: {
						docType: new fields.Select({
							options: ["docx", "odt", "pdf", "txt"],
							defaultVal: "docx",
							displayName: "Export Type",
						}),
					},
					slide: {
						slideType: new fields.Select({
							options: ["pptx", "odp", "pdf", "txt"],
							defaultVal: "pptx",
							displayName: "Export Type",
						}),
					},
				},
				displayName: "Document Type",
			}),
			saveTo: new fields.Typed({type: 'str', allowedTypes: ["str", "msg", "flow", "global"], defaultVal: "", displayName: "Save To"}),
			fileName: new fields.Typed({type: 'str', allowedTypes: ["str", "msg", "flow", "global"], defaultVal: "", displayName: "Filename"})
		},
	});
	async refreshTokens() {
        const newTokens = await refresh(this)
        await this.tokens.set(newTokens)
        return newTokens
    }
	onInit() {
		// Do something on initialization of node
	}

	async onMessage(msg, vals) {
		// Handle the message. The returned value will
		// be sent as the message to any further nodes.
		let urlLength, fileId, mimeType, ext;
		switch (vals.documentType.selected) {
			case "sheet": {
				switch (vals.documentType.childValues.sheetType) {
					case "xlsx": {
						mimeType =
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
						ext = "xlsx";
						break;
					}
					case "ods": {
						mimeType = "application/vnd.oasis.opendocument.spreadsheet";
						ext = "ods";
						break;
					}
					case "pdf": {
						mimeType = "application/pdf";
						ext = "pdf";
						break;
					}
					case "csv": {
						mimeType = "text/csv";
						ext = "csv";
						break;
					}
					default: {
						mimeType =
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
						ext = "xlsx";
					}
				}
				urlLength = "https://docs.google.com/spreadsheets/d/".length;
				fileId = vals.docUrl.substring(urlLength, vals.docUrl.indexOf('/',urlLength));
				break;
			}
			case "doc": {
				switch (vals.documentType.childValues.docType) {
					case "docx": {
						mimeType =
							"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
						ext = "docx";
						break;
					}
					case "odt": {
						mimeType = "application/vnd.oasis.opendocument.text";
						ext = "odt";
						break;
					}
					case "pdf": {
						mimeType = "application/pdf";
						ext = "pdf";
						break;
					}
					case "txt": {
						mimeType = "text/plain";
						ext = "txt";
						break;
					}
					default: {
						mimeType =
							"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
						ext = "docx";
					}
				}
				urlLength = "https://docs.google.com/document/d/".length;
				fileId = vals.docUrl.substring(urlLength, vals.docUrl.indexOf('/',urlLength));
				break;
			}
			case "slide": {
				switch (vals.documentType.childValues.slideType) {
					case "pptx": {
						mimeType =
							"application/vnd.openxmlformats-officedocument.presentationml.presentation";
						ext = "pptx";
						break;
					}
					case "odp": {
						mimeType = "application/vnd.oasis.opendocument.presentation";
						ext = "odp";
						break;
					}
					case "pdf": {
						mimeType = "application/pdf";
						ext = "pdf";
						break;
					}
					case "txt": {
						mimeType = "text/plain";
						ext = "txt";
						break;
					}
					default: {
						mimeType =
							"application/vnd.openxmlformats-officedocument.presentationml.presentation";
						ext = "pptx";
					}
				}
				urlLength = "https://docs.google.com/presentation/d/".length;
				fileId = vals.docUrl.substring(urlLength, vals.docUrl.indexOf('/',urlLength));
				break;
			}
		}
		let apiRequestUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${mimeType}&prettyPrint=true`;
		try {
			const downloadFile = async (apiRequestUrl, savePath, options) => {
				const streamPipeline = promisify(pipeline);
			
				const response = await fetch(apiRequestUrl, options);
				if (!response.ok) {
					throw new Error(`unexpected response ${response.statusText}`);
				} else {
					await streamPipeline(response.body, createWriteStream(savePath));
					return response;
				}
			};
			let filePathToSave = vals.saveTo ? path.join(vals.saveTo, vals.fileName || "maya-autodownload")+"."+ext: path.join(homedir(), vals.fileName || "maya-autodownload") + "."+ ext;
			let res = await downloadFile(
				apiRequestUrl,
				filePathToSave,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.credentials.session.access_token}`,
						"Content-Type": "application/json",
					},
				}
			);

			if (res.status === 200) {
				msg.payload = filePathToSave;
				this.setStatus("SUCCESS", "file downloaded");
				return msg;
			} else {
				if(res.status === 401) {
					const { access_token } = await this.refreshTokens();
					if (!access_token) {
                        this.setStatus('ERROR', 'Failed to refresh access token')
                        msg.isError = true
                        msg.error = {
                            reason: 'TOKEN_REFRESH_FAILED',
                        }
                        return msg
                    }
					res = await downloadFile(
						apiRequestUrl,
						filePathToSave,
						{
							method: "GET",
							headers: {
								Authorization: `Bearer ${access_token}`,
								"Content-Type": "application/json",
							},
						}
					);
					if (res.status === 200) {
						msg.payload = filePathToSave;
						this.setStatus("SUCCESS", "file downloaded");
						return msg;
					} else {
						msg.error = "Error downloading file";
						this.setStatus("ERROR", "error occurred");
						return msg;
					}
				} else {
					msg.error = "Error downloading file";
					this.setStatus("ERROR", "error occurred");
					return msg;
				}
			}
		} catch (err) {
			msg.error = err;
			console.log(err);
			this.setStatus("ERROR", "error occurred");
			return msg;
		}
	}
}

module.exports = GdriveExportFile;
