WidgetMetadata = {
    id: "forward.stremio.catalog",
    title: "Stremio Catalog",
    version: "1.0.1",
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
                    description: "URL to the addon manifest (e.g. https://v3-cinemeta.strem.io/manifest.json)",
                    placeholders: [
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
                    description: "The ID of the catalog (check manifest). Common ones: top, trending, popular",
                    placeholders: [
                        { title: "Top", value: "top" },
                        { title: "Trending", value: "trending" }
                    ],
                    defaultValue: "top"
                }
            ]
        }
    ]
};

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
