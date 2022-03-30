const SECOND = 1000
const MINUTE = 60*SECOND
const HOUR = 60*MINUTE

async function refresh(node, { force = false } = {}) {
    const tokenControl = node.tokens
    console.log('Trying to refresh tokens')

    const toks = await tokenControl.lockLocalTokens(async (localTokens) => {
        console.log('Acquired local token lock', localTokens)

        if (!force) {
            const { lastUpdated } = localTokens
            if (Date.now() - lastUpdated < 1*HOUR - 2*MINUTE) {
                console.log('Tokens were already updated in local cache, no need to refresh', )
                console.log('New tokens:', localTokens)
                tokenControl.vals = { ...(tokenControl.vals), ...localTokens, fromCache: true }
                return localTokens
            }
        }

        const toks = await tokenControl.lockTokens(async (tokens) => {
            console.log('Acquired remote token lock')
            const { access_token, refresh_token, lastUpdated, referenceId } = tokens

            if (Date.now() - lastUpdated < 1*HOUR - 2*MINUTE) {
                console.log('Tokens were already updated, no need to refresh')
                console.log('New tokens:', tokens)
                tokenControl.vals = { ...(tokenControl.vals), ...tokens }
                await node.tokens.setLocal(tokens, { lock: false, referenceId })
                return tokens
            }

            console.log('Tokens were not updated, refreshing with', tokens)
            try {
                const newTokens = await tokenControl.refresh({ access_token, refresh_token })
                if (newTokens.error) {
                    console.log('There was an error:', newTokens.error)
                    return {
                        access_token: null,
                        refresh_token: null,
                        lastUpdated: null,
                        error: true
                    }
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
                    access_token: null,
                    refresh_token: null,
                    lastUpdated: null,
                    error: true
                }
            }
        })
        
        console.log('toks1', toks)
        return toks
    })

    console.log('toks2', toks)
    return toks
}

module.exports = refresh