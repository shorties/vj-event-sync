<template>
  <div class="ndi-container">
    <h2>NDI Support</h2>
    <div class="ndi-content">
      <div class="ndi-info">
        <p>This module provides Network Device Interface (NDI) integration for video streaming and capture.</p>
        <p>Features include:</p>
        <ul>
          <li>NDI source discovery and connection</li>
          <li>NDI output creation and management</li>
          <li>Video streaming to NDI-enabled applications</li>
          <li>Low-latency video capture from NDI sources</li>
        </ul>
      </div>
      <div class="ndi-placeholder">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 10h9v2H5zm0-3h9v2H5z" fill="#2196F3"/>
          </svg>
        </div>
        <p>NDI Support Module</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NDI',
  setup() {
    // Module initialization logic would go here
    return {};
  }
};
</script>

<style scoped>
.ndi-container {
  padding: 20px;
}

.ndi-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 1rem;
}

.ndi-info {
  background-color: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ndi-info p {
  margin-bottom: 1rem;
}

.ndi-info ul {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

.ndi-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.placeholder-icon {
  margin-bottom: 1rem;
}

.ndi-placeholder p {
  font-size: 1.2rem;
  color: #666;
}
</style> 