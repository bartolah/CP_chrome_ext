chrome.action.onClicked.addListener((tab) => {
    console.log("Extracting page details...");

    // Extract title and URL from the active tab
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            return {
                title: document.title,
                url: window.location.href
            };
        }
    }).then((results) => {
        if (!results || !results[0] || !results[0].result) {
            console.error("Error retrieving page details.");
            return;
        }

        const { title, url } = results[0].result;
        const content = `${title}\n\n${url}`;

        console.log("Opening Crowdpac...");
        
        // Open Crowdpac in a new tab
        chrome.tabs.create({ url: "https://crowdpac.com", active: true }, function (newTab) {
            if (chrome.runtime.lastError) {
                console.error("Error creating new tab:", chrome.runtime.lastError);
                return;
            }

            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === newTab.id && changeInfo.status === "complete") {
                    console.log("Crowdpac page loaded. Injecting post content...");

                    chrome.scripting.executeScript({
                        target: { tabId: newTab.id },
                        func: (content) => {
                            let postField = document.querySelector('.opinion-textarea .wysiwygValue');
                            if (!postField) {
                                console.error("Post input field not found.");
                                return;
                            }

                            postField.innerHTML = content;
                            postField.dispatchEvent(new Event('input', { bubbles: true }));
                            console.log("Post content inserted.");
                        },
                        args: [content]
                    }).catch(error => {
                        console.error("Error injecting post content:", error);
                    });

                    chrome.tabs.onUpdated.removeListener(listener);
                }
            });
        });
    }).catch(error => {
        console.error("Error executing script:", error);
    });
});