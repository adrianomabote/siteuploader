// UX helpers
(function() {
  window.showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const div = document.createElement('div');
    div.className = `toast toast-${type}`;
    div.textContent = message;
    div.style.cssText = `
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      animation: slideIn 0.3s ease;
    `;
    
    toast.appendChild(div);
    
    setTimeout(() => {
      div.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => div.remove(), 300);
    }, 3000);
  };
})();
