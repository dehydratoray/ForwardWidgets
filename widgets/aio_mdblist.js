var WidgetMetadata = {
    id: "forward.aio.superlist",
    title: "AIO Super Catalog",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Browse top catalogs from Apple, Disney, HBO, Netflix, and more (Requires MDBList Key).",
    author: "ForwardWidget User",
    site: "https://mdblist.com",
    modules: [
        {
            id: "superCatalog",
            title: "Super Catalog",
            functionName: "superCatalog",
            sectionMode: true,
            params: [
                {
                    name: "apiKey",
                    title: "MDBList API Key",
                    type: "input",
                    description: "Required for MDBList catalogs.",
                    value: ""
                },
                {
                    name: "language",
                    title: "Language",
                    type: "language",
                    value: "zh-CN"
                }
            ]
        }
    ]
};

// --- Embedded Config (Extracted from user config) ---
// Only including valid 'enabled' catalogs from the provided JSON
const CATALOGS = [
    { id: "tmdb.trending", name: "TMDB Trending Movies", type: "movie", source: "tmdb", path: "trending/movie/day" },
    { id: "tmdb.trending", name: "TMDB Trending Shows", type: "series", source: "tmdb", path: "trending/tv/day" },

    // MDBList Catalogs
    { id: "86626", name: "Top Movies - Apple TV Plus", type: "movie", source: "mdblist" },
    { id: "86625", name: "Top TV Shows - Apple TV Plus", type: "series", source: "mdblist" },
    { id: "4799", name: "DiscoveryPlus", type: "series", source: "mdblist" },
    { id: "86945", name: "Top Movies - Disney Plus", type: "movie", source: "mdblist" },
    { id: "86946", name: "Top TV Shows - Disney Plus", type: "series", source: "mdblist" },
    { id: "89392", name: "Top Movies - HBO Max", type: "movie", source: "mdblist" },
    { id: "89310", name: "Top TV Shows - HBO Max", type: "series", source: "mdblist" },
    { id: "88326", name: "Hulu Movies", type: "movie", source: "mdblist" },
    { id: "88327", name: "Hulu Shows", type: "series", source: "mdblist" },
    { id: "86628", name: "Top Movies - Netflix", type: "movie", source: "mdblist" },
    { id: "86620", name: "Top TV Shows - Netflix", type: "series", source: "mdblist" },
    { id: "89366", name: "Top Movies - Paramount Plus", type: "movie", source: "mdblist" },
    { id: "89374", name: "Top TV Shows - Paramount Plus", type: "series", source: "mdblist" },
    { id: "83487", name: "Peacock Movies", type: "movie", source: "mdblist" },
    { id: "83484", name: "Peacock Shows", type: "series", source: "mdblist" },
    { id: "86755", name: "Latest Amazon Prime Movies", type: "movie", source: "mdblist" },
    { id: "86753", name: "Latest Amazon Prime TV Shows", type: "series", source: "mdblist" },
    { id: "87667", name: "Trakt's Trending Movies", type: "movie", source: "mdblist" },
    { id: "88434", name: "Trakt's Trending Shows", type: "series", source: "mdblist" },

    // Genres
    { id: "91211", name: "Action Movies", type: "movie", source: "mdblist" },
    { id: "91213", name: "Action Shows", type: "series", source: "mdblist" },
    { id: "116037", name: "Animated Movies", type: "movie", source: "mdblist" },
    { id: "91223", name: "Comedy Movies", type: "movie", source: "mdblist" },
    { id: "91215", name: "Horror Movies", type: "movie", source: "mdblist" },
    { id: "91221", name: "Sci-Fi Shows", type: "series", source: "mdblist" },

    // Universes
    { id: "3022", name: "Marvel Universe", type: "movie", source: "mdblist" },
    { id: "3021", name: "DC Universe", type: "movie", source: "mdblist" },
    { id: "125115", name: "Star Wars Universe", type: "series", source: "mdblist" }, // Mapped as series in config, but mixed usually
    { id: "105063", name: "Harry Potter", type: "series", source: "mdblist" }, // Config says series?

    // Eras
    { id: "91304", name: "Popular 2020s Movies", type: "movie", source: "mdblist" }
];

// --- Helper Functions ---

function safeStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
}
function toISODate(v) {
    const s = safeStr(v).trim();
    return s || "";
}

// --- Fetching Logic ---

async function fetchTmdbDetail(tmdbId, type, language) {
    // Reuse from other widgets
    if (!tmdbId) return null;
    try {
        const path = `${type}/${tmdbId}`;
        const res = await Widget.tmdb.get(path, { params: { language: language } });
        return res;
    } catch (e) { return null; }
}

async function formatItems(listItems, reqType, language, isTmdbSource) {
    // If isTmdbSource, items are already TMDB objects, just formatting needed.
    // If MDBList, items have { tmdb_id, mediatype ... } and need enrichment.

    if (isTmdbSource) {
        return listItems.map(item => ({
            id: item.id,
            type: "tmdb",
            title: item.title || item.name,
            description: item.overview,
            releaseDate: item.release_date || item.first_air_date,
            backdropPath: item.backdrop_path,
            posterPath: item.poster_path,
            rating: item.vote_average,
            mediaType: item.media_type || reqType, // TMDB 'trending' has media_type
            genreTitle: "" // Simplified for now
        }));
    }

    // MDBList Logic
    const validList = listItems.filter(item => item.tmdb_id);
    const enrichedItems = await Promise.all(validList.map(async (item) => {
        const tmdbId = item.tmdb_id;
        const mediaType = item.mediatype;
        const isMovie = (mediaType === "movie");
        const typeStr = isMovie ? "movie" : "tv";

        let tmdbData = await fetchTmdbDetail(tmdbId, typeStr, language);

        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(item.title);
        const overview = tmdbData ? tmdbData.overview : "";
        const posterPath = tmdbData ? (tmdbData.poster_path || "") : "";
        const backdropPath = tmdbData ? (tmdbData.backdrop_path || "") : "";
        const rating = tmdbData ? tmdbData.vote_average : (item.score_average ? Number(item.score_average) / 10 : 0);
        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : item.release_date);

        return {
            id: tmdbId,
            type: "tmdb",
            title: title,
            description: overview,
            releaseDate: releaseDate,
            backdropPath: backdropPath,
            posterPath: posterPath,
            rating: rating,
            mediaType: typeStr,
            genreTitle: ""
        };
    }));

    return enrichedItems;
}

async function fetchCatalog(cat, apiKey, language) {
    try {
        let items = [];

        if (cat.source === "tmdb") {
            const res = await Widget.tmdb.get(cat.path, { params: { language: language } });
            if (res && res.results) {
                items = await formatItems(res.results, cat.type === "movie" ? "movie" : "tv", language, true);
            }
        } else if (cat.source === "mdblist") {
            if (!apiKey) return null; // Skip if no key
            const limit = 20; // 1 row
            const url = `https://api.mdblist.com/lists/${cat.id}/items?apikey=${apiKey}&limit=${limit}`;
            const res = await Widget.http.get(url);
            let data = res.data;
            if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { } }

            if (Array.isArray(data)) {
                items = await formatItems(data, cat.type, language, false);
            }
        }

        if (items.length > 0) {
            return {
                title: cat.name,
                items: items
            };
        }
    } catch (e) {
        console.log(`Failed to fetch ${cat.name}:`, e);
    }
    return null;
}

// --- Main Function ---

async function superCatalog(params) {
    const apiKey = safeStr(params.apiKey).trim();
    const language = safeStr(params.language || "zh-CN");

    // We fetch all defined catalogs in parallel
    // Note: Only fetch MDBList if apiKey is present
    const validCatalogs = CATALOGS.filter(c => c.source === "tmdb" || (c.source === "mdblist" && apiKey));

    if (validCatalogs.length === 0) {
        throw new Error("No catalogs enabled. Please provide MDBList API Key.");
    }

    // To avoid spamming APIs too hard, we might want to batch?
    // But for 20-30 items, parallel might be okay given standard limits?
    // Let's try parallel but maybe limit concurrency if needed.
    // For now, full parallel.

    const results = await Promise.all(
        validCatalogs.map(cat => fetchCatalog(cat, apiKey, language))
    );

    return results.filter(s => s !== null);
}
