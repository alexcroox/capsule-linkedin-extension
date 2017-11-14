let apiKey = null
let siteUrl = null

const api = axios.create({
    baseURL: 'https://api.capsulecrm.com/api/v2/',
    timeout: 5000,
    headers: { 'Authorization': 'Bearer' },
})

chrome.storage.local.get('apiKey', key => {

    if (Object.keys(key).length > 0)
        setApiKey(key.apiKey)
})

function setApiKey(key) { 
    apiKey = key
    chrome.storage.local.set({ 'apiKey': apiKey })
    api.defaults.headers['Authorization'] = `Bearer ${apiKey}`
    getSiteUrl()
}

// LinkedIn is a SPA so we need to detect page transitions
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {

    if (details.url.includes('linkedin.com/in/')) {
        console.log('LinkedIn page changed', details)

        sendMessageToContent({ 'message': 'pageChanged' })
    }
})

function sendMessageToContent(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, message)
    })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('message:', request)

    switch (request.message) {
        case "hasApiKey":
            const hasApiKey = (apiKey) ? true : false
            sendResponse({ "hasApiKey": hasApiKey })
            break

        case "setApiKey":
            setApiKey(request.data)
            break

        case "checkProfile":
            findContact(request.data)
                .then(() => {
                    console.log(request.data, 'exists')
                    sendMessageToContent({ 'message': 'contactExists', 'data': true })
                })
                .catch(() => {
                    console.log(request.data, 'doesnt exist')
                    sendMessageToContent({ 'message': 'contactExists', 'data': false })
                })
            break

        case "saveProfileToCapsule":

            if (siteUrl) {
                saveContact(request.data)
                    .then(profileUrl => {
                        console.log('Saved profile', profileUrl)
                        sendMessageToContent({ 'message': 'profileSaved', 'data': profileUrl })
                    })
                    .catch(error => {
                        console.log('Error saving profile', error)
                        sendMessageToContent({ 'message': 'profileSaved', 'data': false })
                    })
            } else {
                sendMessageToContent({ 'message': 'siteUrlError' })
            }

            break
    }
})

// Click extension icon
chrome.browserAction.onClicked.addListener(tab => {
    let getApiKey = prompt("Please enter your API key from My Preferences > API Authentication Tokens > Personal Access Tokens in Capsule")

    if (getApiKey && getApiKey != "") {
        setApiKey(getApiKey)
        alert('New API key saved, refresh any open LinkedIn pages first')
    }
})

function getSiteUrl() {
    api.get('/site')
        .then(response => {
            console.log('Got site URL', response.data)
            siteUrl = response.data.site.url
        })
}

function saveContact(profile) {
    return new Promise((resolve, reject) => {
        console.log('Saving profile')
        api.post('/parties', {
                "party": {
                    "type": "person",
                    "firstName": profile.firstName,
                    "lastName": profile.lastName,
                    "jobTitle": profile.jobTitle,
                    "organisation": {
                        "name": profile.company,
                        "type": "organisation"
                    },
                    "websites": [{
                        "service": "LINKED_IN",
                        "address": profile.linkedInUrl
                    }]
                }
            })
            .then(response => {
                console.log(response.data)
                if (response.data.party.id != null)
                    resolve(`${siteUrl}/party/${response.data.party.id}`)
                else
                    reject()
            })
            .catch(error => {
                console.log(error)
                reject()
            })
    })
}

function findContact(name) {
    return new Promise((resolve, reject) => {
        console.log('Searching')
        api.get('/parties/search', {
                params: {
                    q: `${name}`
                }
            })
            .then(response => {
                console.log(response.data)
                if (response.data.parties.length)
                    resolve()
                else
                    reject()
            })
            .catch(error => {
                console.log(error)
                reject()
            })
    })
}
