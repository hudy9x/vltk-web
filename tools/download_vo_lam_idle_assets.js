(() => {
  const BASE_URL = 'https://volamidle.pages.dev/';

  async function loadAppJsText() {
    const response = await fetch(`${BASE_URL}app.js`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load app.js: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  function extractAssetPaths(appJsText) {
    const pattern = /["']([A-Za-z0-9_./-]+\.(?:mp3|webp|png|jpg|jpeg))["']/g;
    const paths = new Set();
    let match;
    while ((match = pattern.exec(appJsText))) {
      paths.add(match[1]);
    }
    return [...paths].sort();
  }

  function buildAssetCandidates(path) {
    const normalized = path.replace(/^\/+/, '');
    const candidates = [
      normalized,
      `img/${normalized}`,
      `img/a/${normalized}`,
      `img/pl/${normalized}`,
    ];
    return [...new Set(candidates.map((value) => new URL(value, BASE_URL).toString()))];
  }

  async function downloadAsset(path) {
    const candidates = buildAssetCandidates(path);
    let lastError = null;

    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = path.split('/').pop();
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        return path;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Failed to download ${path}`);
  }

  async function main() {
    const appJsText = await loadAppJsText();
    const assetPaths = extractAssetPaths(appJsText);
    if (!assetPaths.length) {
      throw new Error('No asset paths found in app.js');
    }

    console.log(`Found ${assetPaths.length} asset files.`);
    for (const path of assetPaths) {
      try {
        const downloaded = await downloadAsset(path);
        console.log(`Downloaded: ${downloaded}`);
      } catch (error) {
        console.error(`Error: ${path}`, error);
      }
    }
    console.log('Download complete.');
  }

  main().catch((error) => {
    console.error(error);
  });
})();
