console.log("Crowdpac content script running.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_csrf_token") {
        console.log("Received request to extract CSRF token.");
        
        let csrfField = document.querySelector('input[id="csrf-token"]');
        if (!csrfField) {
            console.error("CSRF token field not found.");
            sendResponse({ status: "Error: CSRF token missing." });
            return;
        }

        console.log("CSRF token retrieved:", csrfField.value);
        sendResponse({ status: "success", csrfToken: csrfField.value });
    }
});