
chrome.storage.sync.get('authSecret', (result) => {
    const authSecret = result.authSecret || '00000000-0000-0000-0000-000000000000';
    
    chrome.runtime.sendMessage({
        type: 'updateAuthSecret',
        authSecret: authSecret
    });
});
