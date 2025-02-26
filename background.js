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

            // Ensure the page is fully loaded before extracting the CSRF token
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => {
                    return new Promise((resolve) => {
                        const checkForToken = () => {
                            let csrfField = document.querySelector('input[id="csrf-token"]');
                            if (csrfField && csrfField.value) {
                                resolve(csrfField.value);
                            } else {
                                setTimeout(checkForToken, 500);
                            }
                        };
                        checkForToken();
                    });
                }
            }).then((results) => {
                const csrfToken = results && results[0] && results[0].result ? results[0].result : "";

                if (!csrfToken) {
                    console.error("Final attempt: CSRF token still missing.");
                    sendResponse({ status: "Error: CSRF token missing." });
                    return;
                }

                console.log("CSRF token successfully retrieved:", csrfToken);
                sendPostRequest(apiUrl, content, csrfToken, cookie.value, sendResponse);
            }).catch(error => {
                console.error("Error executing script:", error);
                sendResponse({ status: "Error executing script: " + error.message });
            });
        });
    });
}

function sendPostRequest(apiUrl, content, csrfToken, authToken, sendResponse) {
    console.log("Sending post request with CSRF token:", csrfToken);

    const headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept": "application/json, text/plain, */*",
        "X-CSRF-Token": csrfToken,
        "Authorization": `Bearer ${authToken}`,
        "Cookie": `cpsss=${authToken}`
    };

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