// Popup script for the Chrome extension
document.addEventListener('DOMContentLoaded', function() {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusMessage = document.getElementById('statusMessage');
  const testButton = document.getElementById('testButton');
  const messageDiv = document.getElementById('message');
  
  // Test connection on popup open
  testConnection();
  
  // Add event listener for test button
  testButton.addEventListener('click', testConnection);
  
  function testConnection() {
    // Update UI to show testing
    statusIndicator.className = 'status-indicator status-disconnected';
    statusMessage.textContent = 'Testing connection...';
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    hideMessage();
    
    // Send message to background script to test connection
    chrome.runtime.sendMessage({action: "testConnection"}, (response) => {
      if (response && response.success) {
        // Connection successful
        statusIndicator.className = 'status-indicator status-connected';
        statusMessage.textContent = 'Connected to app';
        showMessage(response.message, 'success');
      } else {
        // Connection failed
        statusIndicator.className = 'status-indicator status-disconnected';
        statusMessage.textContent = 'Not connected';
        showMessage(response?.message || 'Connection failed', 'error');
      }
      
      // Re-enable test button
      testButton.disabled = false;
      testButton.textContent = 'Test Connection';
    });
  }
  
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
  }
  
  function hideMessage() {
    messageDiv.style.display = 'none';
  }
});
