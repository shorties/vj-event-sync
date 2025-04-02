<template>
  <div class="logos-container">
    <div class="logos-header">
      <h2>Logo Management</h2>
      <div class="header-actions">
        <button class="action-button" @click="createNewLogo">
          <span class="icon">+</span> New Logo
        </button>
        <button class="action-button" @click="importLogo">
          <span class="icon">↑</span> Import
        </button>
      </div>
    </div>
    
    <div class="logos-content">
      <div class="logos-sidebar">
        <div class="search-box">
          <input type="text" placeholder="Search logos..." v-model="searchQuery" />
        </div>
        
        <div class="logo-categories">
          <h3>Categories</h3>
          <ul>
            <li 
              v-for="category in categories" 
              :key="category.id"
              :class="{ active: selectedCategory === category.id }"
              @click="selectedCategory = category.id"
            >
              {{ category.name }}
              <span class="count">{{ category.count }}</span>
            </li>
          </ul>
        </div>
        
        <div class="logo-tags">
          <h3>Tags</h3>
          <div class="tag-list">
            <span 
              v-for="tag in tags" 
              :key="tag.id"
              class="tag"
              :class="{ active: selectedTags.includes(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="logos-main">
        <div v-if="logos.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="#2196F3"/>
            </svg>
          </div>
          <h3>No Logos Found</h3>
          <p>Create your first logo or import an existing one to get started.</p>
          <button class="primary-button" @click="createNewLogo">Create New Logo</button>
        </div>
        
        <div v-else class="logo-grid">
          <div 
            v-for="logo in filteredLogos" 
            :key="logo.id" 
            class="logo-card"
            @click="selectLogo(logo)"
          >
            <div class="logo-preview">
              <img :src="logo.previewUrl" :alt="logo.name" />
            </div>
            <div class="logo-info">
              <h4>{{ logo.name }}</h4>
              <p>{{ logo.description }}</p>
              <div class="logo-tags">
                <span v-for="tag in logo.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Logo Editor Modal -->
    <div v-if="showEditor" class="modal-overlay" @click="closeEditor">
      <div class="modal-content logo-editor" @click.stop>
        <div class="editor-header">
          <h3>{{ editingLogo ? 'Edit Logo' : 'Create New Logo' }}</h3>
          <button class="close-button" @click="closeEditor">×</button>
        </div>
        <div class="editor-body">
          <div class="form-group">
            <label for="logo-name">Logo Name</label>
            <input id="logo-name" type="text" v-model="logoForm.name" placeholder="Enter logo name" />
          </div>
          <div class="form-group">
            <label for="logo-description">Description</label>
            <textarea id="logo-description" v-model="logoForm.description" placeholder="Enter logo description"></textarea>
          </div>
          <div class="form-group">
            <label for="logo-category">Category</label>
            <select id="logo-category" v-model="logoForm.category">
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Tags</label>
            <div class="tag-selector">
              <span 
                v-for="tag in tags" 
                :key="tag.id"
                class="tag"
                :class="{ active: logoForm.tags.includes(tag.id) }"
                @click="toggleFormTag(tag.id)"
              >
                {{ tag.name }}
              </span>
            </div>
          </div>
          <div class="form-group">
            <label>Logo Preview</label>
            <div class="logo-preview-area">
              <div v-if="!logoForm.previewUrl" class="upload-placeholder" @click="uploadLogo">
                <span class="icon">↑</span>
                <p>Click to upload logo</p>
              </div>
              <img v-else :src="logoForm.previewUrl" alt="Logo preview" />
            </div>
          </div>
        </div>
        <div class="editor-footer">
          <button class="secondary-button" @click="closeEditor">Cancel</button>
          <button class="primary-button" @click="saveLogo">Save Logo</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';

export default {
  name: 'Logos',
  setup() {
    // State
    const searchQuery = ref('');
    const selectedCategory = ref('all');
    const selectedTags = ref([]);
    const showEditor = ref(false);
    const editingLogo = ref(null);
    
    // Form state
    const logoForm = ref({
      name: '',
      description: '',
      category: 'all',
      tags: [],
      previewUrl: null
    });
    
    // Mock data
    const categories = ref([
      { id: 'all', name: 'All Logos', count: 0 },
      { id: 'events', name: 'Events', count: 0 },
      { id: 'brands', name: 'Brands', count: 0 },
      { id: 'custom', name: 'Custom', count: 0 }
    ]);
    
    const tags = ref([
      { id: 'event', name: 'Event' },
      { id: 'brand', name: 'Brand' },
      { id: 'custom', name: 'Custom' },
      { id: 'scheduled', name: 'Scheduled' },
      { id: 'active', name: 'Active' }
    ]);
    
    const logos = ref([]);
    
    // Computed
    const filteredLogos = computed(() => {
      let result = [...logos.value];
      
      // Filter by search query
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(logo => 
          logo.name.toLowerCase().includes(query) || 
          logo.description.toLowerCase().includes(query)
        );
      }
      
      // Filter by category
      if (selectedCategory.value !== 'all') {
        result = result.filter(logo => logo.category === selectedCategory.value);
      }
      
      // Filter by tags
      if (selectedTags.value.length > 0) {
        result = result.filter(logo => 
          selectedTags.value.every(tagId => 
            logo.tags.includes(tagId)
          )
        );
      }
      
      return result;
    });
    
    // Methods
    const createNewLogo = () => {
      editingLogo.value = null;
      logoForm.value = {
        name: '',
        description: '',
        category: 'all',
        tags: [],
        previewUrl: null
      };
      showEditor.value = true;
    };
    
    const importLogo = () => {
      // This would open a file dialog in a real implementation
      console.log('Import logo');
    };
    
    const selectLogo = (logo) => {
      editingLogo.value = logo;
      logoForm.value = {
        name: logo.name,
        description: logo.description,
        category: logo.category,
        tags: [...logo.tags],
        previewUrl: logo.previewUrl
      };
      showEditor.value = true;
    };
    
    const closeEditor = () => {
      showEditor.value = false;
      editingLogo.value = null;
    };
    
    const toggleTag = (tagId) => {
      const index = selectedTags.value.indexOf(tagId);
      if (index === -1) {
        selectedTags.value.push(tagId);
      } else {
        selectedTags.value.splice(index, 1);
      }
    };
    
    const toggleFormTag = (tagId) => {
      const index = logoForm.value.tags.indexOf(tagId);
      if (index === -1) {
        logoForm.value.tags.push(tagId);
      } else {
        logoForm.value.tags.splice(index, 1);
      }
    };
    
    const uploadLogo = () => {
      // This would open a file dialog in a real implementation
      console.log('Upload logo');
      // For demo purposes, set a mock preview URL
      logoForm.value.previewUrl = 'https://via.placeholder.com/150';
    };
    
    const saveLogo = () => {
      if (editingLogo.value) {
        // Update existing logo
        const index = logos.value.findIndex(l => l.id === editingLogo.value.id);
        if (index !== -1) {
          logos.value[index] = {
            ...editingLogo.value,
            name: logoForm.value.name,
            description: logoForm.value.description,
            category: logoForm.value.category,
            tags: [...logoForm.value.tags],
            previewUrl: logoForm.value.previewUrl
          };
        }
      } else {
        // Create new logo
        const newLogo = {
          id: Date.now().toString(),
          name: logoForm.value.name,
          description: logoForm.value.description,
          category: logoForm.value.category,
          tags: [...logoForm.value.tags],
          previewUrl: logoForm.value.previewUrl,
          createdAt: new Date().toISOString()
        };
        logos.value.push(newLogo);
      }
      
      // Update category counts
      updateCategoryCounts();
      
      // Close editor
      closeEditor();
    };
    
    const updateCategoryCounts = () => {
      categories.value.forEach(category => {
        if (category.id === 'all') {
          category.count = logos.value.length;
        } else {
          category.count = logos.value.filter(logo => logo.category === category.id).length;
        }
      });
    };
    
    // Initialize with mock data
    onMounted(() => {
      // Add some mock logos
      logos.value = [
        {
          id: '1',
          name: 'Summer Festival 2023',
          description: 'Main logo for the summer festival event',
          category: 'events',
          tags: ['event', 'scheduled'],
          previewUrl: 'https://via.placeholder.com/150',
          createdAt: '2023-06-01T12:00:00Z'
        },
        {
          id: '2',
          name: 'VJ.Tools Brand',
          description: 'Official VJ.Tools brand logo',
          category: 'brands',
          tags: ['brand'],
          previewUrl: 'https://via.placeholder.com/150',
          createdAt: '2023-05-15T10:30:00Z'
        },
        {
          id: '3',
          name: 'Custom Client Logo',
          description: 'Custom logo for client project',
          category: 'custom',
          tags: ['custom', 'active'],
          previewUrl: 'https://via.placeholder.com/150',
          createdAt: '2023-07-10T14:45:00Z'
        }
      ];
      
      // Update category counts
      updateCategoryCounts();
    });
    
    return {
      searchQuery,
      selectedCategory,
      selectedTags,
      showEditor,
      editingLogo,
      logoForm,
      categories,
      tags,
      logos,
      filteredLogos,
      createNewLogo,
      importLogo,
      selectLogo,
      closeEditor,
      toggleTag,
      toggleFormTag,
      uploadLogo,
      saveLogo
    };
  }
};
</script>

<style scoped>
.logos-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.logos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: var(--primary-color);
  color: white;
}

.logos-content {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.logos-sidebar {
  width: 250px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
}

.logo-categories h3,
.logo-tags h3 {
  font-size: 16px;
  margin-bottom: 10px;
  color: var(--text-color);
}

.logo-categories ul {
  list-style: none;
  padding: 0;
}

.logo-categories li {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-categories li:hover {
  background-color: var(--background-color);
}

.logo-categories li.active {
  background-color: var(--primary-color);
  color: white;
}

.count {
  background-color: var(--background-color);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}

.logo-categories li.active .count {
  background-color: rgba(255, 255, 255, 0.2);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 8px;
  background-color: var(--background-color);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag:hover {
  background-color: var(--primary-color);
  color: white;
}

.tag.active {
  background-color: var(--primary-color);
  color: white;
}

.logos-main {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-light);
  text-align: center;
}

.empty-icon {
  margin-bottom: 20px;
}

.empty-state h3 {
  margin-bottom: 10px;
  color: var(--text-color);
}

.empty-state p {
  margin-bottom: 20px;
  max-width: 400px;
}

.primary-button {
  padding: 10px 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary-button:hover {
  background-color: var(--secondary-color);
}

.secondary-button {
  padding: 10px 20px;
  background-color: var(--background-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-button:hover {
  background-color: var(--border-color);
}

.logo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.logo-card {
  background-color: var(--background-color);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.logo-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.logo-preview {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-info {
  padding: 12px;
}

.logo-info h4 {
  margin-bottom: 5px;
  color: var(--text-color);
}

.logo-info p {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 10px;
}

.logo-editor {
  width: 600px;
  max-width: 90vw;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-light);
}

.editor-body {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  height: 100px;
  resize: vertical;
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.logo-preview-area {
  height: 200px;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.upload-placeholder .icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.editor-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
}
</style> 