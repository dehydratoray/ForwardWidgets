console.log("Loading Stremio Widget...");

WidgetMetadata = {
    id: "forward.stremio.catalog",
    title: "Stremio Catalog",
    version: "1.0.4",
    requiredVersion: "0.0.1",
    description: "Load movies and shows from any Stremio Addon",
    author: "Forward",
    site: "https://stremio.com",
    icon: "https://stremio.com/website/stremio-logo-small.png",
    modules: [
        {
            id: "loadCatalog",
            title: "Load Catalog",
            functionName: "loadCatalog",
            params: [
                {
                    name: "manifestUrl",
                    title: "Addon Manifest URL",
                    type: "input",
                    description: "URL to the addon manifest",
                    value: "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7/manifest.json",
                    placeholders: [
                        { title: "AIO Metadata (Custom)", value: "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7/manifest.json" },
                        { title: "Cinemeta (Official)", value: "https://v3-cinemeta.strem.io/manifest.json" },
                        { title: "Cyberflix", value: "https://cyberflix.elfhosted.com/manifest.json" }
                    ]
                },
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "series" }
                    ],
                    defaultValue: "movie"
                },
                {
                    name: "catalogId",
                    title: "Catalog ID",
                    type: "input",
                    description: "Catalog ID (check manifest). e.g. mdblist.15194 (Tom Cruise)",
                    placeholders: [
                        { title: "Tom Cruise (AIO)", value: "mdblist.15194" },
                        { title: "Christopher Nolan (AIO)", value: "mdblist.91024" },
                        { title: "Top (Cinemeta)", value: "top" },
                        { title: "Trending (Cinemeta)", value: "trending" }
                    ],
                    defaultValue: "mdblist.15194"
                }
            ]
        }
    ]
};

// --- Helper: Enrich with TMDB Metadata ---
async function enrichWithTmdb(items) {
    const BATCH_SIZE = 5;
    const results = [];
    let debugLogged = false;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (item) => {
            if (!item || !item.id) return item;

            try {
                let tmdbData = null;

                // Case 1: Convert IMDB ID to TMDB Metadata
                if (item.sourceType === 'imdb') {
                    const findUrl = `find/${item.id}`; // e.g. find/tt1234567
                    const response = await Widget.tmdb.get(findUrl, {
                        params: { external_source: 'imdb_id' }
                    });

                    if (!debugLogged && response) {
                        console.log("[Stremio] Sample TMDB Response Keys:", Object.keys(response));
                        debugLogged = true;
                    }

                    if (response) {
                        // Check movie_results or tv_results
                        const tmdbResults = item.mediaType === 'movie' ? response.movie_results : response.tv_results;
                        if (tmdbResults && tmdbResults.length > 0) {
                            tmdbData = tmdbResults[0];
                        } else {
                            // Only log misses if we really care, to reduce noise
                            // console.log(`[Stremio] No TMDB match found for ${item.id} (${item.mediaType})`);
                        }
                    }
                }
                // Case 2: Already has TMDB ID (if we supported that)
                else if (item.sourceType === 'tmdb') {
                    tmdbData = await Widget.tmdb.get(`${item.mediaType}/${item.id}`, {});
                }

                // Apply TMDB Data if found
                if (tmdbData) {
                    item.id = tmdbData.id; // Switch to TMDB Numeric ID
                    item.type = 'tmdb';    // Switch type to TMDB

                    // Update metadata
                    if (tmdbData.title || tmdbData.name) item.title = tmdbData.title || tmdbData.name;
                    if (tmdbData.poster_path) item.posterPath = tmdbData.poster_path;
                    if (tmdbData.backdrop_path) item.backdropPath = tmdbData.backdrop_path;
                    if (tmdbData.overview) item.description = tmdbData.overview;
                    if (tmdbData.vote_average) item.rating = tmdbData.vote_average;
                    if (tmdbData.release_date || tmdbData.first_air_date) item.releaseDate = tmdbData.release_date || tmdbData.first_air_date;

                    console.log(`[Stremio] Resolved ${item.sourceType} ${item.id} -> TMDB ${tmdbData.id}`);
                } else {
                    console.warn(`[Stremio] Keeping original item for ${item.id} (Enrichment failed)`);
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
