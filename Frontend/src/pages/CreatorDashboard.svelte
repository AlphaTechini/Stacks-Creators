<script>
  import MintForm from '../components/nft/MintForm.svelte';
</script>

<section class="dashboard-container">
  <div class="header">
    <h1>Create New NFT</h1>
    <p>Upload your artwork and provide the details to mint it on the Stacks blockchain.</p>
  </div>
  <MintForm />
</section>

<style>
  .dashboard-container {
    max-width: 960px;
    margin: 2.5rem auto;
    display: grid;
    place-items: center;
    gap: 2rem;
  }
  .header {
    text-align: center;
  }
  h1 {
    font-size: 2.25rem;
    font-weight: 700;
  }
  p {
    opacity: 0.8;
    max-width: 500px;
    margin-top: 0.5rem;
  }
</style>