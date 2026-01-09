console.log("Loading Stremio Merged Widget...");

WidgetMetadata = {
    id: "forward.stremio.merged",
    title: "Stremio Mixed (Movies & TV)",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Load merged Movies and TV Shows from Stremio Catalog",
    author: "Forward",
    site: "https://stremio.com",
    icon: "https://stremio.com/website/stremio-logo-small.png",
    modules: [
        {
            id: "loadMergedCatalog",
            title: "Load Merged Catalog",
            functionName: "loadMergedCatalog",
            params: [
                {
                    name: "manifestUrl",
                    title: "Addon Manifest URL",
                    type: "input",
                    description: "URL to the addon manifest",
                    value: "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7/manifest.json"
                },
                {
                    name: "provider",
                    title: "Provider",
                    type: "enumeration",
                    description: "Select provider to merge Movies & TV from",
                    defaultValue: "mdblist.86628|mdblist.86620", // Netflix
                    enumOptions: [
                        { title: "Netflix (Movies & TV)", value: "mdblist.86628|mdblist.86620" },
                        { title: "Apple TV+ (Movies & TV)", value: "mdblist.86626|mdblist.86625" },
                        { title: "Disney+ (Movies & TV)", value: "mdblist.86945|mdblist.86946" },
                        { title: "Hulu (Movies & TV)", value: "mdblist.88326|mdblist.88327" },
                        { title: "Paramount+ (Movies & TV)", value: "mdblist.89366|mdblist.89374" },
                        { title: "Peacock (Movies & TV)", value: "mdblist.83487|mdblist.83484" },
                        { title: "Amazon Prime (Movies & TV)", value: "mdblist.86755|mdblist.86753" }
                    ]
                }
            ]
        }
    ]
};

// --- Helper: Enrich with TMDB Metadata (Duplicated from stremio.js) ---
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
                    const findUrl = `find/${item.id}`;
                    const response = await Widget.tmdb.get(findUrl, {
                        params: { external_source: 'imdb_id' }
                    });

                    if (!debugLogged && response) {
                        console.log("[Stremio Merged] Sample TMDB Response Keys:", Object.keys(response));
                        debugLogged = true;
                    }

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
                // console.warn(`[Stremio Merged] Failed to enrich item ${item.id}:`, e);
            }
            return item;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}

// Fetch a single catalog
async function fetchCatalog(baseUrl, type, id) {
    const url = `${baseUrl}/catalog/${type}/${id}.json`;
    console.log(`[Stremio Merged] Fetching ${type}: ${url}`);

    try {
        const response = await Widget.http.get(url);
        // Handle wrapper
        const metas = (response.data && response.data.metas) ? response.data.metas : (response.metas || []);

        return metas.map(meta => {
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
                    item.type = 'imdb';
                    item.sourceType = 'imdb';
                }
            } else {
                return null;
            }
            return item;
        }).filter(Boolean);
    } catch (e) {
        console.error(`[Stremio Merged] Error fetching ${type} ${id}:`, e);
        return [];
    }
}

async function loadMergedCatalog(params) {
    const { manifestUrl, provider } = params;

    if (!manifestUrl || !provider) throw new Error("Manifest URL and Provider are required");

    const [movieId, tvId] = provider.split('|');
    const baseUrl = manifestUrl.replace('/manifest.json', '');

    console.log(`[Stremio Merged] Merging ${movieId} (Movie) and ${tvId} (TV)`);

    const [movies, shows] = await Promise.all([
        fetchCatalog(baseUrl, 'movie', movieId),
        fetchCatalog(baseUrl, 'series', tvId)
    ]);

    console.log(`[Stremio Merged] Got ${movies.length} movies and ${shows.length} shows`);

    // Interleave the results (simple merge)
    const combined = [];
    const maxLength = Math.max(movies.length, shows.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < movies.length) combined.push(movies[i]);
        if (i < shows.length) combined.push(shows[i]);
    }

    // Enrich all
    return await enrichWithTmdb(combined);
}
