console.log("Loading Stremio Widget...");

WidgetMetadata = {
    id: "forward.stremio.catalog",
    title: "Stremio Catalog",
    version: "1.0.2",
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
                    description: "Catalog ID (e.g. top, trending)",
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
    console.log("Stremio loadCatalog called with:", JSON.stringify(params));
    const { manifestUrl, type, catalogId } = params;

    if (!manifestUrl) throw new Error("Manifest URL is required");

    // Remove /manifest.json to get base URL
    const baseUrl = manifestUrl.replace('/manifest.json', '');

    // Construct Catalog URL: {base}/catalog/{type}/{id}.json
    const url = `${baseUrl}/catalog/${type}/${catalogId}.json`;

    console.log(`[Stremio] Fetching catalog: ${url}`);

    try {
        const response = await Widget.http.get(url);

        if (!response || !response.metas) {
            console.error("[Stremio] Invalid response", response);
            throw new Error("Invalid response from Stremio addon.");
        }

        const metas = response.metas;
        console.log(`[Stremio] Found ${metas.length} items`);

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
                rating: meta.imdbRating
            };

            if (meta.id) {
                // If it is an IMDB ID (starts with tt)
                if (String(meta.id).startsWith('tt')) {
                    item.id = meta.id;
                    item.type = 'imdb';
                }
                // If it is numeric, assume TMDB
                else if (!isNaN(meta.id)) {
                    item.id = meta.id;
                    item.type = 'tmdb';
                }
                // Default fallback
                else {
                    item.id = meta.id;
                    item.type = 'imdb';
                }
            } else {
                // Skip items without ID
                return null;
            }

            return item;
        }).filter(Boolean);

    } catch (e) {
        console.error(`[Stremio] Error:`, e);
        throw new Error(`Failed to load Stremio catalog: ${e.message}`);
    }
}
