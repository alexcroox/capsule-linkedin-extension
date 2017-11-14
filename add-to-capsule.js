let hasApiKey = false

chrome.runtime.sendMessage({ 'message': 'hasApiKey' }, response => {
    hasApiKey = response.hasApiKey
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    switch (request.message) {
        case "pageChanged":
            checkProfile()
            break

        case "siteUrlError":
            alert('Error fetching site URL, please re-enter API key by clicking extension icon in Chrome')
            break

        case "contactExists":
            if (request.data === true)
                $('#capsule-linkedin')
                .addClass('disabled')
                .find('span')
                .html('Already in Capsule')
            break

        case "profileSaved":
            if (request.data !== false) {
                $('#capsule-linkedin')
                    .addClass('disabled')
                    .find('span')
                    .html('Already in Capsule')

                window.open(request.data, '_blank')
            } else {
                alert('There was an error saving this profile to Capsule, please refresh and try again')
            }
            break
    }
})

function saveProfileToCapsule() {

    const name = $('.pv-top-card-section__name').text()
    const splitName = name.split(" ")
    const firstName = splitName[0].trim()
    const lastName = splitName[1].trim()
    const company = $('.pv-top-card-section__company').text().trim()
    const jobTitle = $('.pv-top-card-section__headline').text().trim()
    const linkedInUrl = window.location.href

    const profile = {
        firstName,
        lastName,
        company,
        jobTitle,
        linkedInUrl
    }

    if (firstName && lastName && company && jobTitle) {

        chrome.runtime.sendMessage({ 'message': 'saveProfileToCapsule', 'data': profile })

    } else {
        alert('There is a problem with this profile, check console for errors')
        console.log('Profile debug', profile)
    }
}

function checkProfile() {
    // Only add the button if we are on a LinkedIn profile page
    if ($('.profile-detail').length) {

        $('#capsule-linkedin').remove()

        const $button = $('<a href="#" id="capsule-linkedin" class="button-primary-large mh1"><span class="pv-s-profile-actions__label">Add to Capsule</span></a>')
        $('.pv-top-card-section__actions.pv-top-card-section__actions--at-top').append($button)

        const name = $('.pv-top-card-section__information .pv-top-card-section__name').text()
        chrome.runtime.sendMessage({ 'message': 'checkProfile', 'data': name })

        $button.on('click', function(e) {

            e.preventDefault()

            if ($(this).hasClass('disabled')) {
                alert('This contact is already in Capsule')
                return
            }

            if (!hasApiKey) {
                apiKey = prompt("Please enter your API key from My Preferences > API Authentication Tokens > Personal Access Tokens in Capsule")

                if (apiKey && apiKey != "") {
                    chrome.runtime.sendMessage({ 'message': 'setApiKey', 'data': apiKey }, response => {
                        saveProfileToCapsule()
                    })
                }
            } else {
                saveProfileToCapsule()
            }
        })

    }
}
