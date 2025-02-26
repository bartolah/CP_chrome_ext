chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "create_post") {
        submitPostDirectly(request.content, sendResponse);
        return true; // Keeps the response open for async calls
    }
});

function submitPostDirectly(content, sendResponse) {
    console.log("Submitting post via Crowdpac API...");

    const apiUrl = "https://crowdpac.com/apiv2/opinion/none";

    chrome.cookies.get({ url: "https://crowdpac.com", name: "cpsss" }, function (cookie) {
        if (!cookie || !cookie.value) {
            console.error("Error: Authentication cookie missing.");
            sendResponse({ status: "Error: User not logged in or missing authentication." });
            return;
        }

        console.log("Auth token retrieved:", cookie.value);

        chrome.tabs.query({ url: "https://crowdpac.com/*" }, function (tabs) {
            if (!tabs.length) {
                console.error("Crowdpac tab not found.");
                sendResponse({ status: "Error: Crowdpac must be open in a tab." });
                return;
            }

            const crowdpacTab = tabs[0];

            // Request CSRF token from content script
            chrome.tabs.sendMessage(crowdpacTab.id, { action: "get_csrf_token" }, function (response) {
                if (chrome.runtime.lastError || !response || response.status !== "success") {
                    console.error("Error retrieving CSRF token:", chrome.runtime.lastError?.message || "No response.");
                    sendResponse({ status: "Error: CSRF token missing." });
                    return;
                }

                console.log("CSRF token received:", response.csrfToken);
                sendPostRequest(apiUrl, content, response.csrfToken, cookie.value, sendResponse);
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
        "Cookie": `cpsss=${authToken}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36"
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