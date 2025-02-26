chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "create_post") {
        submitPostDirectly(request.content, sendResponse);
        return true; // Keeps the response open for async calls
    }
});

function submitPostDirectly(content, sendResponse) {
    console.log("Submitting post via Crowdpac API...");

    const apiUrl = "https://crowdpac.com/apiv2/opinion/none";

    // Get Authentication Cookie
    chrome.cookies.get({ url: "https://crowdpac.com", name: "cpsss" }, function (cookie) {
        if (!cookie || !cookie.value) {
            console.error("Error: Authentication cookie missing.");
            sendResponse({ status: "Error: User not logged in or missing authentication." });
            return;
        }

        console.log("Auth token retrieved:", cookie.value);

        // Retrieve CSRF token from the form input field
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs.length) {
                console.error("Error: No active tab found.");
                sendResponse({ status: "Error: No active tab found." });
                return;
            }

            const activeTab = tabs[0];

            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => {
                    let csrfField = document.querySelector('input[id="csrf-token"]');
                    return csrfField ? csrfField.value : "";
                }
            }).then((results) => {
                const csrfToken = results && results[0] && results[0].result ? results[0].result : "";

                if (!csrfToken) {
                    console.error("CSRF token missing. Retrying in 1 second...");
                    setTimeout(() => retryCsrfExtraction(activeTab.id, content, cookie.value, sendResponse), 1000);
                    return;
                }

                console.log("CSRF token retrieved:", csrfToken);
                sendPostRequest(apiUrl, content, csrfToken, cookie.value, sendResponse);
            }).catch(error => {
                console.error("Error executing script:", error);
                sendResponse({ status: "Error executing script: " + error.message });
            });
        });
    });
}

// Retry CSRF extraction if it fails initially
function retryCsrfExtraction(tabId, content, authToken, sendResponse) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            let csrfField = document.querySelector('input[id="csrf-token"]');
            return csrfField ? csrfField.value : "";
        }
    }).then((results) => {
        const csrfToken = results && results[0] && results[0].result ? results[0].result : "";

        if (!csrfToken) {
            console.error("Final attempt: CSRF token still missing.");
            sendResponse({ status: "Error: CSRF token missing after retry." });
            return;
        }

        console.log("CSRF token successfully retrieved on retry:", csrfToken);
        sendPostRequest("https://crowdpac.com/apiv2/opinion/none", content, csrfToken, authToken, sendResponse);
    }).catch(error => {
        console.error("Error retrying CSRF extraction:", error);
        sendResponse({ status: "Error retrying CSRF extraction: " + error.message });
    });
}

function sendPostRequest(apiUrl, content, csrfToken, authToken, sendResponse) {
    console.log("Sending post request with CSRF token:", csrfToken);

    // Prepare headers
    const headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept": "application/json, text/plain, */*",
        "X-CSRF-Token": csrfToken,
        "Authorization": `Bearer ${authToken}`,
        "Cookie": `cpsss=${authToken}`
    };

    // Construct post payload
    const postData = {
        text: content.trim(),
        visibility: "public",
        allow_comments: true
    };

    console.log("Submitting post with payload:", postData);

    fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(postData),
        credentials: "include"
    })
    .then(response => {
        console.log("Response Status:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("Post submitted successfully:", data);
        sendResponse({ status: "Post submitted successfully", response: data });
    })
    .catch(error => {
        console.error("Error submitting post:", error);
        sendResponse({ status: "Error submitting post", error: error.toString() });
    });
}