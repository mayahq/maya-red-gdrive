const SECOND = 1000
const MINUTE = 60*SECOND
const HOUR = 60*MINUTE
const { Tokens } = require('@mayahq/module-sdk')

/**
 * 
 * @param {Node} node 
 * @param {boolean} force - If true, function will skip cache and directly refresh
 * @returns 
 */
async function refresh(node, { force = false } = {}) {
    tokenControl = node.tokens
    console.log('Trying to refresh tokens')
    
    const toks = await tokenControl.lockLocalTokens(async (localTokens) => {
        console.log('Acquired local token lock')

        if (!force) {
            const { lastUpdated } = localTokens
            if (Date.now() - lastUpdated < 1*HOUR - 2*MINUTE) {
                console.log('Tokens were already updated in local cache, no need to refresh', )
                console.log('New tokens:', localTokens)
                tokenControl.vals = localTokens.tokens
                tokenControl.lastUpdated = localTokens.lastUpdated
                return { ...localTokens, fromCache: true }
            }
        }

        // At this point, we know the tokens in cache are useless. We must hit the cloud API and see if
        // we can get fresh tokens from there.

        const toks = await tokenControl.lockTokens(async (tokenData) => {
            console.log('Acquired remote token lock')
            const { tokens, lastUpdated } = tokenData

            if (Date.now() - lastUpdated < 1*HOUR - 2*MINUTE) {
                console.log('Tokens were already updated in cloud, no need to refresh')
                console.log('New tokens:', tokens)
                tokenControl.vals = tokens
                tokenControl.lastUpdated = lastUpdated
                await node.tokens.setLocal(tokenData, { lock: false })
                return tokenData
            }

            // At this point, we know the tokens are not updated in cloud either. We must refresh them.

            console.log('Tokens were not updated, refreshing with', tokens)
            try {
                const { access_token, refresh_token } = tokens
                const newTokens = await tokenControl.refresh({ access_token, refresh_token })
                if (newTokens.error) {
                    console.log('There was an error:', newTokens.error)
                    return newTokens // This is gonna be empty in case of an error
                }

                console.log('Tokens refreshed via API. New tokens:', newTokens)
                return newTokens
            } catch (e) {
                console.log('Unable to refresh spotify token')
                if (e.response) {
                    console.log('config', e.config)
                    console.log('RESPONSE STATUS', e.response.status)
                    console.log('RESPONSE DATA', e.response.data)
                } else {
                    console.log(e)
                }

                return {
                    referenceId: '',
                    resource: '',
                    tokens: {
                        access_token: null,
                        refresh_token: null,
                        lastUpdated: null,
                        error: true
                    },
                    lastUpdated: -1
                }
            }
        })
        return toks
    })

    console.log('yeehee2')
    return toks
}

module.exports = refresh