const https = require('https');

// Mock Widget Object with Redirect Support and TMDB Mock
global.Widget = {
    http: {
        get: (url) => {
            const getUrl = (inputUrl) => {
                return new Promise((resolve, reject) => {
                    console.log(`[Mock HTTP] GET ${inputUrl}`);
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
                                // IMPORTANT: Wrap the JSON in a `data` property to simulate Widget.http.get behavior
                                const jsonBody = JSON.parse(data);
                                resolve({ data: jsonBody });
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
    },
    tmdb: {
        get: async (url, options) => {
            console.log(`[Mock TMDB] GET ${url}`, options);
            // Mock Response for FIND (IMDB ID)
            if (url.startsWith('find/tt')) {
                return {
                    movie_results: [
                        {
                            id: 546554, // Fake TMDB ID
                            title: "Knives Out (Mocked from TMDB)",
                            poster_path: "/mock_poster_path.jpg",
                            backdrop_path: "/mock_backdrop_path.jpg",
                            overview: "Mocked overview from TMDB",
                            vote_average: 8.5,
                            release_date: "2019-11-27"
                        }
                    ],
                    tv_results: []
                };
            }
            // Mock Response for DETAILS
            if (url.match(/^\w+\/\d+$/)) {
                return {
                    id: 12345,
                    title: "Mocked Details",
                    poster_path: "/details_poster.jpg"
                };
            }
            return null;
        }
    }
};

// Import the loadCatalog function (simulated by reading file and eval, or just copy-pasting for test)
// For simplicity in this environment, I'll copy the function body into the test runner wrapper.

async function enrichWithTmdb(items) {
    const BATCH_SIZE = 5;
    const results = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (item) => {
            if (!item || !item.id) return item;

            try {
                let tmdbData = null;

                if (item.sourceType === 'imdb') {
                    const findUrl = `find/${item.id}`; // e.g. find/tt1234567
                    const response = await Widget.tmdb.get(findUrl, {
                        params: { external_source: 'imdb_id' }
                    });

                    if (response) {
                        const results = item.mediaType === 'movie' ? response.movie_results : response.tv_results;
                        if (results && results.length > 0) {
                            tmdbData = results[0];
                        }
                    }
                }
                else if (item.sourceType === 'tmdb') {
                    tmdbData = await Widget.tmdb.get(`${item.mediaType}/${item.id}`, {});
                }

                if (tmdbData) {
                    item.id = tmdbData.id;
                    item.type = 'tmdb';

                    item.title = tmdbData.title || tmdbData.name || item.title;
                    if (tmdbData.poster_path) item.posterPath = tmdbData.poster_path;
                    if (tmdbData.backdrop_path) item.backdropPath = tmdbData.backdrop_path;
                    if (tmdbData.overview) item.description = tmdbData.overview;
                    if (tmdbData.vote_average) item.rating = tmdbData.vote_average;
                    if (tmdbData.release_date || tmdbData.first_air_date) item.releaseDate = tmdbData.release_date || tmdbData.first_air_date;
                }

            } catch (e) {
                console.warn(`[Stremio] Failed to enrich item ${item.id}:`, e);
            }
            return item;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}

async function loadCatalog(params) {
    console.log("Stremio loadCatalog called with:", JSON.stringify(params));
    const { manifestUrl, type, catalogId } = params;

    if (!manifestUrl) throw new Error("Manifest URL is required");

    // Remove /manifest.json to get base URL
    const baseUrl = manifestUrl.replace('/manifest.json', '');
    const url = `${baseUrl}/catalog/${type}/${catalogId}.json`;

    console.log(`[Stremio] Fetching catalog: ${url}`);

    try {
        const response = await Widget.http.get(url);

        // Fix: Widget.http.get returns { data: ... }
        if (!response || !response.data || !response.data.metas) {
            console.error("[Stremio] Invalid response", response);
            throw new Error("Invalid response from Stremio addon.");
        }

        const metas = response.data.metas;
        console.log(`[Stremio] Found ${metas.length} items`);

        const rawItems = metas.map(meta => {
            let itemType = 'movie';
            if (type === 'series' || meta.type === 'series') itemType = 'tv';

            const item = {
                title: meta.name,
                year: parseInt(meta.releaseInfo) || parseInt(meta.year),
                mediaType: itemType,
                posterPath: meta.poster,
                backdropPath: meta.background,
                description: meta.description,
                rating: meta.imdbRating,
                // Helper prop to track source
                sourceType: 'unknown'
            };

            if (meta.id) {
                if (String(meta.id).startsWith('tt')) {
                    item.id = meta.id;
                    item.type = 'imdb';
                    item.sourceType = 'imdb';
                } else if (!isNaN(meta.id)) {
                    item.id = meta.id;
                    item.type = 'tmdb';
                    item.sourceType = 'tmdb';
                } else {
                    item.id = meta.id;
                    item.type = 'imdb'; // Fallback
                    item.sourceType = 'imdb';
                }
            } else {
                return null;
            }
            return item;
        }).filter(Boolean);

        // Enrich with TMDB data
        return await enrichWithTmdb(rawItems);

    } catch (e) {
        console.error(`[Stremio] Error:`, e);
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
