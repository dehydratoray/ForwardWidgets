const https = require('https');

// Mock Widget Object with Redirect Support
global.Widget = {
    http: {
        get: (url) => {
            const getUrl = (inputUrl) => {
                return new Promise((resolve, reject) => {
                    https.get(inputUrl, (res) => {
                        // Handle Redirects
                        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                            return getUrl(res.headers.location).then(resolve).catch(reject);
                        }

                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                if (res.statusCode >= 400) {
                                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                                    return;
                                }
                                resolve(JSON.parse(data));
                            } catch (e) {
                                console.error("Failed to parse JSON:", data.substring(0, 100));
                                reject(e);
                            }
                        });
                    }).on('error', reject);
                });
            };
            return getUrl(url);
        }
    }
};

// Import the loadCatalog function (simulated by reading file and eval, or just copy-pasting for test)
// For simplicity in this environment, I'll copy the function body into the test runner wrapper.

async function loadCatalog(params) {
    const { manifestUrl, type, catalogId } = params;

    if (!manifestUrl) throw new Error("Manifest URL is required");

    // Remove /manifest.json to get base URL
    const baseUrl = manifestUrl.replace('/manifest.json', '');

    // Construct Catalog URL: {base}/catalog/{type}/{id}.json
    // Note: Some addons use slightly different structures, but this is the standard v3
    const url = `${baseUrl}/catalog/${type}/${catalogId}.json`;

    console.log(`[Stremio] Fetching catalog: ${url}`);

    try {
        const response = await Widget.http.get(url);

        if (!response || !response.metas) {
            console.error("[Stremio] Invalid response", response);
            throw new Error("Invalid response from Stremio addon. Check the URL and Catalog ID.");
        }

        const metas = response.metas;
        console.log(`[Stremio] Found ${metas.length} items`);

        return metas.map(meta => {
            // Map Stremio Meta to Widget Item
            // Stremio uses 'imdb_id' usually.

            let itemType = 'movie';
            if (type === 'series' || meta.type === 'series') itemType = 'tv';

            const item = {
                title: meta.name,
                year: parseInt(meta.releaseInfo) || parseInt(meta.year),
                mediaType: itemType,
                posterPath: meta.poster,
                backdropPath: meta.background,
                description: meta.description,
                rating: meta.imdbRating
            };

            // ID Handling
            // ForwardWidgets seem to prefer TMDB IDs (based on mdblist.js). 
            // Stremio often provides IMDB ID string (tt1234567).
            // We pass the ID as is, but we might need to specify the source 'type' if the system supports it.

            if (meta.id) {
                item.id = meta.id;
                if (meta.id.startsWith('tt')) {
                    item.type = 'imdb';
                } else if (!isNaN(meta.id)) {
                    item.type = 'tmdb'; // Assumption: numeric is TMDB
                } else {
                    item.type = 'imdb'; // Fallback
                }
            }

            return item;
        });

    } catch (e) {
        console.error(`[Stremio] Error fetching catalog`, e);
        throw new Error(`Failed to load Stremio catalog: ${e.message}`);
    }
}

// Run Test
(async () => {
    try {
        console.log("Testing Cinemeta (Official)...");
        const items = await loadCatalog({
            manifestUrl: "https://v3-cinemeta.strem.io/manifest.json",
            type: "movie",
            catalogId: "top"
        });
        console.log("Success! First 3 items:");
        console.log(items.slice(0, 3));
    } catch (e) {
        console.error("Test Failed:", e);
    }
})();
