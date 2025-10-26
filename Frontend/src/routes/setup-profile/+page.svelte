<script>
  import { wallet } from '$lib/stores/wallet.js';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { fetchAPI } from '$lib/api.js';

  let profile = {
    username: '',
    content: {
      bio: '',
      socials: {
        twitter: '',
        instagram: '',
        website: '',
      },
    },
  };

  let isLoading = true;
  let errorMessage = '';
  let successMessage = '';

  // Reactively check connection status after the store has loaded.
  $: if (browser && !$wallet.isLoading && !$wallet.isConnected) {
    goto('/');
  }

  onMount(async () => {
    if ($wallet.stxAddress) {
      try {
        const existingProfile = await fetchAPI('/api/creator/fetch', 'POST', null, {
          walletAddress: $wallet.stxAddress,
        });
        if (existingProfile) {
          profile.username = existingProfile.username || '';
          profile.content = {
            bio: existingProfile.content?.bio || '',
            socials: {
              twitter: existingProfile.content?.socials?.twitter || '',
              instagram: existingProfile.content?.socials?.instagram || '',
              website: existingProfile.content?.socials?.website || '',
            },
          };
        }
      } catch (error) {
        console.warn('No existing profile found or failed to fetch:', error.message);
      } finally {
        isLoading = false;
      }
    }
  });

  async function handleSaveProfile() {
    if (!profile.username) {
      errorMessage = 'Username is required.';
      return;
    }

    isLoading = true;
    errorMessage = '';
    successMessage = '';

    try {
      const response = await fetchAPI('/api/creator/sync', 'POST', $wallet.token, {
        username: profile.username,
        content: profile.content,
      });

      successMessage = 'Profile saved successfully!';
      setTimeout(() => (successMessage = ''), 3000);
    } catch (error) {
      console.error('Save profile error:', error);
      errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="container">
  <div class="form-container">
    <h1>Creator Profile</h1>
    <p>This information will be publicly visible on your creator page.</p>

    <form on:submit|preventDefault={handleSaveProfile}>
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" bind:value={profile.username} placeholder="your-cool-name" required />
      </div>

      <div class="form-group">
        <label for="bio">Bio</label>
        <textarea id="bio" bind:value={profile.content.bio} placeholder="Tell your fans a little about yourself." rows="3"></textarea>
      </div>

      <h2>Social Links</h2>

      <div class="form-group">
        <label for="twitter">Twitter</label>
        <input type="text" id="twitter" bind:value={profile.content.socials.twitter} placeholder="https://twitter.com/..." />
      </div>

      <div class="form-group">
        <label for="instagram">Instagram</label>
        <input type="text" id="instagram" bind:value={profile.content.socials.instagram} placeholder="https://instagram.com/..." />
      </div>

      <div class="form-group">
        <label for="website">Website</label>
        <input type="url" id="website" bind:value={profile.content.socials.website} placeholder="https://yoursite.com" />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Profile'}
      </button>

      {#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
      {#if successMessage}<p class="success-message">{successMessage}</p>{/if}
    </form>
  </div>
</div>

<style>
  .container { display: flex; justify-content: center; padding: 2rem; }
  .form-container { background: var(--card-background); padding: 2rem; border-radius: 18px; width: 100%; max-width: 600px; border: 1px solid var(--card-border); }
  h1 { color: var(--text-color); text-align: center; margin-bottom: 0.5rem; font-weight: 700; }
  p { text-align: center; margin-bottom: 2rem; opacity: 0.7; }
  .form-group { margin-bottom: 1.5rem; }
  label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
  input, textarea { width: 100%; padding: 0.75rem; background: var(--input-background); border: 1px solid var(--input-border); border-radius: 12px; color: var(--text-color); font-size: 1rem; }
  input:focus, textarea:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 2px var(--primary-color); }
  button { width: 100%; padding: 0.75rem; background-color: var(--primary-color); color: white; font-size: 1rem; font-weight: bold; cursor: pointer; transition: background-color 0.2s; }
  button:hover { background-color: var(--primary-color-hover); }
  .error-message { color: #fc8181; text-align: center; margin-top: 1rem; }
  .success-message { color: #68d391; text-align: center; margin-top: 1rem; }
</style>
