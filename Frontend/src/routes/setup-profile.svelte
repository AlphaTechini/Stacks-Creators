<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { syncCreatorProfile } from '$lib/api.js';

  let profile = {
    username: '',
    bio: '',
    avatar: '', // This will hold the URL of the uploaded avatar
    socials: {
      twitter: '',
      instagram: '',
      website: '',
      github: '', // Added based on backend model
    },
  };

  let isLoading = false;
  let errorMessage = '';
  let successMessage = '';

  onMount(() => {
    const token = localStorage.getItem('stacks_token');
    if (!token) {
      // If no token is found, the user is not authenticated. Redirect to onboarding.
      goto('/');
    }
  });

  /**
   * Handles the avatar file selection.
   * In a real app, this would upload the file to a service like Cloudinary
   * and return a URL. For now, we'll just simulate it.
   */
  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // --- Placeholder for Cloudinary Upload ---
    // 1. Get a signed upload URL from your backend.
    // 2. Upload the file directly to Cloudinary.
    // 3. On success, Cloudinary returns a secure URL.
    // For now, we'll just use a placeholder URL.
    console.log('Simulating avatar upload for:', file.name);
    profile.avatar = `https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_thumb,g_face,r_max/${file.name}`;
    // --- End Placeholder ---
  }

  async function handleSaveProfile() {
    if (!profile.username) {
      errorMessage = 'Username is required.';
      return;
    }

    isLoading = true;
    errorMessage = '';
    successMessage = '';

    try {
      const payload = {
        username: profile.username,
        content: profile,
      };

      // Use the centralized API function which handles the token and URL correctly.
      const savedProfile = await syncCreatorProfile(payload);
      console.log('Profile saved:', savedProfile);

      // Show success and redirect
      successMessage = 'Profile created successfully!';
      alert(successMessage); // Using alert as a placeholder for a toast notification
      setTimeout(() => goto('/dashboard'), 1000); // Redirect after a short delay
    } catch (error) {
      console.error('Save profile error:', error);
      errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="container">
  <div class="form-container">
    <h1>Setup Your Creator Profile</h1>
    <p>This information will be publicly visible on your creator page.</p>

    <form on:submit|preventDefault={handleSaveProfile}>
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" bind:value={profile.username} placeholder="your-cool-name" required />
      </div>

      <div class="form-group">
        <label for="bio">Bio</label>
        <textarea id="bio" bind:value={profile.bio} placeholder="Tell your fans a little about yourself." rows="3"></textarea>
      </div>

      <div class="form-group">
        <label for="avatar">Avatar</label>
        <input type="file" id="avatar" accept="image/png, image/jpeg" on:change={handleAvatarUpload} />
        {#if profile.avatar}
          <img src={profile.avatar} alt="Avatar preview" class="avatar-preview" />
        {/if}
      </div>

      <h2>Social Links</h2>

      <div class="form-group">
        <label for="twitter">Twitter</label>
        <input type="text" id="twitter" bind:value={profile.socials.twitter} placeholder="https://twitter.com/..." />
      </div>

      <div class="form-group">
        <label for="instagram">Instagram</label>
        <input type="text" id="instagram" bind:value={profile.socials.instagram} placeholder="https://instagram.com/..." />
      </div>

      <div class="form-group">
        <label for="website">Website</label>
        <input type="url" id="website" bind:value={profile.socials.website} placeholder="https://yoursite.com" />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Profile'}
      </button>

      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </form>
  </div>
</main>

<style>
  .container {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }

  .form-container {
    background: var(--card-background);
    padding: 2rem;
    border-radius: 18px;
    width: 100%;
    max-width: 600px;
    border: 1px solid var(--card-border);
  }

  h1 {
    color: var(--text-color);
    text-align: center;
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  p {
    text-align: center;
    margin-bottom: 2rem;
    opacity: 0.7;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  input,
  textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--input-background);
    border: 1px solid var(--input-border);
    border-radius: 12px;
    color: var(--text-color);
    font-size: 1rem;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color);
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--primary-color);
    color: white;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover {
    background-color: var(--primary-color-hover);
  }

  .error-message {
    color: #fc8181;
    text-align: center;
    margin-top: 1rem;
  }

  .avatar-preview {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    margin-top: 1rem;
    border: 3px solid var(--primary-color);
  }
</style>
