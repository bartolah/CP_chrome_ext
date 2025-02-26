function openCrowdpacAndExtractCsrf(content, sendResponse) {
    console.log("Opening Crowdpac to extract CSRF token...");

    chrome.tabs.create({ url: "https://crowdpac.com", active: false }, function (newTab) {
        console.log("Crowdpac tab opened. Waiting for page to load...");

        // Wait for tab to fully load before injecting the script
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (tabId === newTab.id && changeInfo.status === "complete") {
                console.log("Crowdpac page fully loaded. Extracting CSRF token...");

                // Remove listener to prevent multiple triggers
                chrome.tabs.onUpdated.removeListener(listener);

                // Inject script to extract CSRF token
                chrome.scripting.executeScript({
                    target: { tabId: newTab.id },
                    func: () => {
                        let csrfField = document.querySelector('input[id="csrf-token"]');
                        return csrfField ? csrfField.value : null;
                    }
                }).then((results) => {
                    if (!results || !results[0] || !results[0].result) {
                        console.error("CSRF token extraction failed.");
                        sendResponse({ status: "Error: CSRF token missing." });
                        return;
                    }

                    const csrfToken = results[0].result;
                    console.log("Extracted CSRF token:", csrfToken);

                    // Close the temporary tab
                    chrome.tabs.remove(newTab.id);

                    // Continue with the post request
                    sendPostRequest("https://crowdpac.com/apiv2/opinion/none", content, csrfToken, sendResponse);
                }).catch(error => {
                    console.error("Error extracting CSRF token:", error);
                    sendResponse({ status: "Error extracting CSRF token: " + error.message });
                });
            }
        });
    });
}

function sendPostRequest(apiUrl, content, csrfToken, sendResponse) {
    console.log("Sending post request with CSRF token:", csrfToken);

    const headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept": "application/json, text/plain, */*",
        "X-CSRF-Token": csrfToken,
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