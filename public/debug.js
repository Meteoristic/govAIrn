// Error tracking script for deployment debugging
window.addEventListener('error', function(event) {
  console.error('Caught error:', event.error);
  
  // Create a visible error message on the page
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.padding = '20px';
  errorDiv.style.background = 'rgba(255,0,0,0.8)';
  errorDiv.style.color = 'white';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.textContent = `ERROR: ${event.error.message}\n\nSTACK: ${event.error.stack || 'No stack trace available'}`;
  
  document.body.appendChild(errorDiv);
});

console.log('Debug script loaded successfully'); 