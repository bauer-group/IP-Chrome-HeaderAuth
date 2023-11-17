let authSecret = '00000000-0000-0000-0000-000000000000';

chrome.storage.sync.get('authSecret', (result) => {
    if (result.authSecret) {
        authSecret = result.authSecret;
    }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        let headers = details.requestHeaders || [];
        headers.push({
            name: 'X-BAUERGROUP-Auth',
            value: authSecret
        });

        return { requestHeaders: headers };
    },
    { urls: ["https://*.app.bauer-group.com/*", "wss://*.app.bauer-group.com/*"] },
    ["blocking", "requestHeaders", "extraHeaders"]
);
