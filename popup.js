document.addEventListener("DOMContentLoaded", function () {
    const statusMessage = document.getElementById("statusMessage");

    function updateStatus(message) {
        statusMessage.textContent = message;
        console.log(message);
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];
        const pageUrl = activeTab.url;
        const pageTitle = activeTab.title;

        document.getElementById("postContent").value = `${pageTitle}\n\n${pageUrl}`;
    });

    document.getElementById("submitPost").addEventListener("click", function () {
        updateStatus("Sending post...");

        chrome.runtime.sendMessage({
            action: "create_post",
            content: document.getElementById("postContent").value
        }, function (response) {
            if (chrome.runtime.lastError) {
                updateStatus("Error: " + chrome.runtime.lastError.message);
            } else if (response) {
                updateStatus(response.status);
                console.log("Full Response:", response);
            } else {
                updateStatus("No response from background script.");
            }
        });
    });
});