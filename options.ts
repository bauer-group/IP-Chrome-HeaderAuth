
document.addEventListener('DOMContentLoaded', () => {
    const authSecretInput = document.getElementById('authSecret') as HTMLInputElement;
    const saveButton = document.getElementById('save');

    // Function to load and set the stored authSecret
    const loadStoredAuthSecret = () => {
        chrome.storage.sync.get('authSecret', (result) => {
            if (result.authSecret) {
                authSecretInput.value = result.authSecret;
            }
        });
    };

    // Load the stored authSecret when the page loads
    loadStoredAuthSecret();
    
    // Save changes made
    saveButton?.addEventListener('click', () => {
        const authSecretInput = document.getElementById('authSecret') as HTMLInputElement;
        const authSecret = authSecretInput?.value;

        if (authSecret !== undefined) {
            chrome.storage.sync.set({ authSecret: authSecret }, () => {
                console.log('Updated Authentication Secret: ' + authSecret);
            });
        }
    });
});
