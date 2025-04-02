<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Login to vj.tools</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            required
            placeholder="Enter your vj.tools username">
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required
            placeholder="Enter your password">
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="rememberMe">
            Remember me
          </label>
        </div>
        <button 
          type="submit" 
          :disabled="isLoading"
          class="login-button">
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </button>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </form>
      <div class="login-footer">
        <p>Don't have an account? <a href="https://vj.tools/register" target="_blank">Register</a></p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';
import vjToolsService from '../../services/vjTools';

export default {
  name: 'Login',
  emits: ['login-success'],
  setup(props, { emit }) {
    const username = ref('');
    const password = ref('');
    const rememberMe = ref(false);
    const isLoading = ref(false);
    const error = ref('');

    const handleLogin = async () => {
      try {
        isLoading.value = true;
        error.value = '';

        const user = await vjToolsService.login(username.value, password.value);
        
        if (rememberMe.value) {
          localStorage.setItem('vjToolsUsername', username.value);
        } else {
          localStorage.removeItem('vjToolsUsername');
        }

        emit('login-success', user);
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to login. Please try again.';
      } finally {
        isLoading.value = false;
      }
    };

    return {
      username,
      password,
      rememberMe,
      isLoading,
      error,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-color);
  padding: 1rem;
}

.login-box {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-box h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
}

.login-button {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-button:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.login-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #ffebee;
  color: var(--error-color);
  border-radius: 4px;
  text-align: center;
}

.login-footer {
  margin-top: 2rem;
  text-align: center;
  color: #666;
}

.login-footer a {
  color: var(--primary-color);
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}
</style> 