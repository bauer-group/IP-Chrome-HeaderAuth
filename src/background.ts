
const allResourceTypes = Object.values(chrome.declarativeNetRequest.ResourceType);

// Function to update the dynamic rules
function updateDynamicRules(authSecret: string) {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1, 2],
        
        addRules: [
            {
                id: 1,
                priority: 1,
                action: {
                    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                    requestHeaders: [{
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        header: 'X-BAUERGROUP-Auth',
                        value: authSecret,
                    }],
                },
                condition: {
                    urlFilter: 'https://*.app.bauer-group.com/*',
                    resourceTypes: allResourceTypes
                }
            },
            {
                id: 2,
                priority: 1,
                action: {
                    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                    requestHeaders: [{
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        header: 'X-BAUERGROUP-Auth',
                        value: authSecret,
                    }],
                },
                condition: {
                    urlFilter: 'wss://*.app.bauer-group.com/*',
                    resourceTypes: allResourceTypes
                }
            }
        ]
    });
}

// Function to fetch and handle the authSecret from storage
function fetchAndApplyAuthSecret() {
    chrome.storage.sync.get('authSecret', (result) => {
        const authSecret = result.authSecret || '00000000-0000-0000-0000-000000000000';
        updateDynamicRules(authSecret);
    });
}

// Call the function to ensure the rules are set up with the current authSecret value
fetchAndApplyAuthSecret();

// Optional: Listen for changes in storage and update rules accordingly
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.authSecret) {
        const newAuthSecret = changes.authSecret.newValue || '00000000-0000-0000-0000-000000000000';
        updateDynamicRules(newAuthSecret);
    }
});
