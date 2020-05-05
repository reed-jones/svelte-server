<style>
  :global(body) {
    margin: 0;
    width: 100vw;
    font-size: 16px;
    font-family: 'Inter', sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    width: 100vw;
    text-align: center;
    color: #444;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  h1 {
    font-size: 6rem;
    margin: 0;
  }

  span {
    font-size: 3rem;
  }

  .row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .docs-link {
    text-decoration: none;
    background: #4c597b;
    color: white;
    border-radius: 0.4rem;
    padding: 0.5rem 1rem;
  }
</style>

<main>
  <header class="bg-red-500">
    <div class="row">
      <h1>
        SVELTE
        <wbr />
        <span>Server</span>
      </h1>
      <p>(Unofficial)</p>
    </div>
    <a href="/docs/#" class="docs-link">Read The Docs</a>
  </header>
</main>
