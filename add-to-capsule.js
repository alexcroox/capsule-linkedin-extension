let hasApiKey = false
let profileAlreadyInCapsule = false

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
            if (request.data !== false) {
                $('#capsule-linkedin')
                .addClass('disabled')
                .attr('href', request.data)
                .find('span')
                .html('Already in Capsule')

                profileAlreadyInCapsule = request.data
            }
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
    console.log('CL: Checking for profile')

    profileAlreadyInCapsule = false

    // Only add the button if we are on a LinkedIn profile page
    if ($('.profile-detail').length) {

        console.log('CL: Found profile')

        $('#capsule-linkedin').remove()

        const $button = $('<a href="#" id="capsule-linkedin" class="button-primary-large mh1"><span class="pv-s-profile-actions__label">Add to Capsule</span></a>')
        
        const name = $('.pv-top-card-section__information .pv-top-card-section__name').text()
        chrome.runtime.sendMessage({ 'message': 'checkProfile', 'data': name })

        // Wait for SPA to finish rendering before injecting button
        let waitForPage = setInterval(function() {

            if ($('.pv-top-card-section__actions.pv-top-card-section__actions--at-top').length) {

                clearInterval(waitForPage);
                $('.pv-top-card-section__actions.pv-top-card-section__actions--at-top').append($button)

                if (profileAlreadyInCapsule)
                    $('#capsule-linkedin')
                        .addClass('disabled')
                        .attr('href', profileAlreadyInCapsule)
                        .find('span')
                        .html('Already in Capsule')
            }
        }, 500);

        $button.on('click', function(e) {

            e.preventDefault()

            if ($(this).hasClass('disabled')) {
                window.open($(this).attr('href'), '_blank')
                return
            }

            if (!hasApiKey) {
                apiKey = prompt("Please enter your API key from My Preferences > API Authentication Tokens > Personal Access Tokens in Capsule")

                if (apiKey && apiKey != "") {
                    chrome.runtime.sendMessage({ 'message': 'setApiKey', 'data': apiKey }, response => {
                        setTimeout(function() {
                            saveProfileToCapsule()
                        }, 2000)
                    })
                }
            } else {
                saveProfileToCapsule()
            }
        })

    } else {
        console.log('CL: No profile found');
        chrome.runtime.sendMessage({ 'message': 'noProfileFound' })
    }
}
