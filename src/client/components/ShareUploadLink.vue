<template>
  <div class="share-upload-section">
    <div v-if="!showQR" class="empty-state">
      <font-awesome-icon icon="fa-solid fa-share-nodes" class="empty-state-icon" />
      <h3>Share Upload Link</h3>
      <p>Generate a link to share with DJs to drop in their logos</p>
      <button class="primary-button" @click="generateLink">
        <font-awesome-icon icon="fa-solid fa-qrcode" />
        Generate Share Link
      </button>
    </div>
    <div v-else class="qr-container">
      <div class="qr-preview">
        <img :src="qrCode" alt="QR Code" class="qr-code" />
        <div class="link-info">
          <p class="upload-link">{{ uploadLink }}</p>
          <div class="action-buttons">
            <button class="control-button" @click="copyLink" :class="{ success: copied }">
              <font-awesome-icon :icon="copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'" />
              {{ copied ? 'Copied!' : 'Copy Link' }}
            </button>
            <button class="control-button" @click="showFullscreen">
              <font-awesome-icon icon="fa-solid fa-expand" />
              Show Fullscreen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import QRCode from 'qrcode';

export default {
  name: 'ShareUploadLink',
  setup() {
    const showQR = ref(false);
    const qrCode = ref('');
    const uploadLink = ref('');
    const copied = ref(false);

    const generateLink = async () => {
      // In a real implementation, this would be your server URL
      uploadLink.value = 'https://logodrop.app/upload/abc123';
      qrCode.value = await QRCode.toDataURL(uploadLink.value, {
        color: {
          dark: '#6aff4e',
          light: '#0000'
        },
        width: 256,
        margin: 1
      });
      showQR.value = true;
    };

    const copyLink = async () => {
      await navigator.clipboard.writeText(uploadLink.value);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    };

    const showFullscreen = () => {
      const img = new Image();
      img.src = qrCode.value;
      img.style.background = '#0D151F';
      img.style.padding = '32px';
      const win = window.open('', '_blank');
      win.document.write(img.outerHTML);
      win.document.title = 'Logo Drop Upload QR Code';
      win.document.body.style.margin = '0';
      win.document.body.style.background = '#0D151F';
      win.document.body.style.display = 'flex';
      win.document.body.style.alignItems = 'center';
      win.document.body.style.justifyContent = 'center';
    };

    return {
      showQR,
      qrCode,
      uploadLink,
      copied,
      generateLink,
      copyLink,
      showFullscreen
    };
  }
};
</script>

<style scoped>
.share-upload-section {
  padding: 0; /* Let parent container handle padding */
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: var(--text-color-muted);
  text-align: center;
  padding: 40px;
}

.empty-state-icon {
  font-size: 3.5rem;
  color: var(--primary-color);
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text-color);
  margin: 0;
}

.empty-state p {
  font-size: 0.9rem;
  max-width: 300px;
}

.primary-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--accent-gradient);
  border: none;
  border-radius: var(--border-radius);
  color: var(--text-color);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-speed) ease;
}

.primary-button:hover {
  box-shadow: 0 0 20px var(--primary-glow);
  transform: translateY(-1px);
}

.qr-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.qr-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  background: var(--panel-header-bg);
  padding: 40px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.qr-code {
  width: 256px;
  height: 256px;
  border-radius: var(--border-radius);
}

.link-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.upload-link {
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--text-color);
  background: var(--panel-bg);
  padding: 8px 16px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  width: 100%;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-speed) ease;
}

.control-button:hover {
  background: var(--button-bg);
  color: var(--primary-color);
  border-color: var(--primary-color);
  box-shadow: 0 0 12px var(--primary-glow);
}

.control-button.success {
  background: var(--success-color);
  color: var(--background-color);
  border-color: var(--success-color);
}
</style>
