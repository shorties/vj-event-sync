<template>
  <div class="test-component">
    <h2>Test Component</h2>
    <p>This is a test component to verify that the Vue application is working correctly.</p>
    <button @click="count++">Click me: {{ count }}</button>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'TestComponent',
  setup() {
    const count = ref(0);
    
    return {
      count
    };
  }
};
</script>

<style scoped>
.test-component {
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 8px;
  margin: 20px;
}

button {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

button:hover {
  background-color: #1976D2;
}
</style> 