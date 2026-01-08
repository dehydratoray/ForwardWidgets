
// --- configuration ---
const STREMIO_BASE_URL = "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7";

const CATALOGS = [
    { id: "tmdb.trending.movie", name: "TMDB Trending Movies", type: "movie", source: "tmdb", path: "trending/movie/day" },
    { id: "tmdb.trending.tv", name: "TMDB Trending Shows", type: "series", source: "tmdb", path: "trending/tv/day" },
    // MDBList Catalogs
    { id: "mdblist.86626", name: "Top Movies - Apple TV+", type: "movie", source: "stremio" },
    { id: "mdblist.86625", name: "Top TV Shows - Apple TV+", type: "series", source: "stremio" },
    { id: "mdblist.4799", name: "Discovery+", type: "series", source: "stremio" },
    { id: "mdblist.86945", name: "Top Movies - Disney+", type: "movie", source: "stremio" },
    { id: "mdblist.86946", name: "Top TV Shows - Disney+", type: "series", source: "stremio" },
    { id: "mdblist.89392", name: "Top Movies - HBO Max", type: "movie", source: "stremio" },
    { id: "mdblist.89310", name: "Top TV Shows - HBO Max", type: "series", source: "stremio" },
    { id: "mdblist.88326", name: "Hulu Movies", type: "movie", source: "stremio" },
    { id: "mdblist.88327", name: "Hulu Shows", type: "series", source: "stremio" },
    { id: "mdblist.86628", name: "Top Movies - Netflix", type: "movie", source: "stremio" },
    { id: "mdblist.86620", name: "Top TV Shows - Netflix", type: "series", source: "stremio" },
    { id: "mdblist.89366", name: "Top Movies - Paramount+", type: "movie", source: "stremio" },
    { id: "mdblist.89374", name: "Top TV Shows - Paramount+", type: "series", source: "stremio" },
    { id: "mdblist.83487", name: "Peacock Movies", type: "movie", source: "stremio" },
    { id: "mdblist.83484", name: "Peacock Shows", type: "series", source: "stremio" },
    { id: "mdblist.86755", name: "Amazon Prime Movies", type: "movie", source: "stremio" },
    { id: "mdblist.86753", name: "Amazon Prime Shows", type: "series", source: "stremio" },
    { id: "mdblist.87667", name: "Trakt Trending Movies", type: "movie", source: "stremio" },
    { id: "mdblist.88434", name: "Trakt Trending Shows", type: "series", source: "stremio" },
    // Genres
    { id: "mdblist.91211", name: "Action Movies", type: "movie", source: "stremio" },
    { id: "mdblist.91213", name: "Action Shows", type: "series", source: "stremio" },
    { id: "mdblist.116037", name: "Animated Movies", type: "movie", source: "stremio" },
    { id: "mdblist.91223", name: "Comedy Movies", type: "movie", source: "stremio" },
    { id: "mdblist.91215", name: "Horror Movies", type: "movie", source: "stremio" },
    { id: "mdblist.91221", name: "Sci-Fi Shows", type: "series", source: "stremio" },
    // Universes
    { id: "mdblist.3022", name: "Marvel Universe", type: "movie", source: "stremio" },
    { id: "mdblist.3021", name: "DC Universe", type: "movie", source: "stremio" },
    { id: "mdblist.125115", name: "Star Wars Universe", type: "series", source: "stremio" },
    { id: "mdblist.105063", name: "Harry Potter", type: "series", source: "stremio" },
    // Eras
    { id: "mdblist.91304", name: "Popular 2020s Movies", type: "movie", source: "stremio" }
];

// Generate Modules
const MODULES = CATALOGS.map(cat => {
    return {
        id: `mod_${cat.id.replace(/\./g, '_')}`,
        title: cat.name,
        functionName: "fetchList",
        sectionMode: false,
        params: [
            { name: "language", title: "Language", type: "language", value: "zh-CN" },
            { name: "catalogId", title: "Internal ID", type: "constant", value: cat.id, hidden: true }
        ]
    };
});

// Add Custom Merge Modules (Split by type to avoid mixing)

// 1. Merged Movies
MODULES.unshift({
    id: "custom_merge_movie",
    title: "Merged Movies (Custom)",
    functionName: "fetchMergedList",
    sectionMode: false,
    params: [
        {
            name: "keywords",
            title: "Keywords",
            type: "input",
            description: "e.g. 'Apple, Disney'. Merges matching MOVIE lists.",
            value: ""
        },
        {
            name: "language",
            title: "Language",
            type: "language",
            value: "zh-CN"
        },
        {
            name: "mergeType",
            title: "Type",
            type: "constant",
            value: "movie",
            hidden: true
        }
    ]
});

// 2. Merged Series
MODULES.unshift({
    id: "custom_merge_series",
    title: "Merged TV Shows (Custom)",
    functionName: "fetchMergedList",
    sectionMode: false,
    params: [
        {
            name: "keywords",
            title: "Keywords",
            type: "input",
            description: "e.g. 'Apple, Disney'. Merges matching TV lists.",
            value: ""
        },
        {
            name: "language",
            title: "Language",
            type: "language",
            value: "zh-CN"
        },
        {
            name: "mergeType",
            title: "Type",
            type: "constant",
            value: "series",
            hidden: true
        }
    ]
});

var WidgetMetadata = {
    id: "forward.aio.stremio",
    title: "AIO Catalogs (Stremio)",
    version: "2.3.0",
    requiredVersion: "0.0.1",
    description: "Browse curated lists + Custom Merge.",
    author: "ForwardWidget User",
    site: "https://mdblist.com",
    modules: MODULES
};

// --- Helper Functions ---
function safeStr(v) { return (v === undefined || v === null) ? "" : String(v); }
function toISODate(v) { const s = safeStr(v).trim(); return s || ""; }

// --- Fetching Logic ---

async function fetchTmdbDetail(externalId, type, language) {
    if (!externalId) return null;
    try {
        if (externalId.startsWith("tt")) {
            const findPath = `find/${externalId}`;
            const res = await Widget.tmdb.get(findPath, {
                params: { language: language, external_source: "imdb_id" }
            });
            if (res) {
                const results = (type === "movie") ? res.movie_results : res.tv_results;
                if (results && results.length > 0) return results[0];
                const other = (type === "movie") ? res.tv_results : res.movie_results;
                if (other && other.length > 0) return other[0];
            }
            return null;
        }
        if (/^\d+$/.test(externalId)) {
            const path = `${type}/${externalId}`;
            const res = await Widget.tmdb.get(path, { params: { language: language } });
            return res;
        }
    } catch (e) { return null; }
    return null;
}

// Reuse logic from stremio.js basically
async function formatStremioItems(metas, reqType, language) {
    const enrichedItems = await Promise.all(metas.map(async (item) => {
        const stremioId = item.id;
        const mediaType = item.type || reqType;
        const isMovie = (mediaType === "movie");
        const tmdbType = isMovie ? "movie" : "tv";
        let tmdbData = await fetchTmdbDetail(stremioId, tmdbType, language);

        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(item.name);
        const overview = tmdbData ? tmdbData.overview : safeStr(item.description);
        const posterPath = tmdbData ? (tmdbData.poster_path || "") : (item.poster || "");
        const backdropPath = tmdbData ? (tmdbData.backdrop_path || "") : (item.background || "");
        const rating = tmdbData ? tmdbData.vote_average : (item.imdbRating ? Number(item.imdbRating) : 0);
        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : item.releaseInfo);

        let uniqueId = stremioId;
        let itemType = "imdb";
        if (tmdbData && tmdbData.id) { uniqueId = tmdbData.id; itemType = "tmdb"; }
        else if (stremioId.startsWith("tt")) { itemType = "imdb"; }
        else { itemType = "url"; }

        return {
            id: uniqueId,
            type: itemType,
            title: title,
            description: overview,
            releaseDate: releaseDate,
            backdropPath: backdropPath,
            posterPath: posterPath,
            rating: rating,
            mediaType: tmdbType,
            genreTitle: ""
        };
    }));
    return enrichedItems;
}

async function formatTmdbItems(listItems, reqType, language) {
    return listItems.map(item => ({
        id: item.id,
        type: "tmdb",
        title: item.title || item.name,
        description: item.overview,
        releaseDate: item.release_date || item.first_air_date,
        backdropPath: item.backdrop_path,
        posterPath: item.poster_path,
        rating: item.vote_average,
        mediaType: item.media_type || reqType,
        genreTitle: ""
    }));
}

async function fetchIndividualCatalog(cat, language) {
    try {
        if (cat.source === "tmdb") {
            const res = await Widget.tmdb.get(cat.path, { params: { language: language } });
            if (res && res.results) {
                return await formatTmdbItems(res.results, cat.type === "movie" ? "movie" : "tv", language);
            }
        } else if (cat.source === "stremio") {
            const url = `${STREMIO_BASE_URL}/catalog/${cat.type}/${cat.id}.json`;
            const res = await Widget.http.get(url);
            let data = res.data;
            if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { } }
            if (data && Array.isArray(data.metas)) {
                return await formatStremioItems(data.metas, cat.type, language);
            }
        }
    } catch (e) {
        console.error(`Failed to fetch ${cat.name}`, e);
    }
    return [];
}

// --- Main Functions ---

async function fetchList(params) {
    const language = safeStr(params.language || "zh-CN");
    const catalogId = safeStr(params.catalogId);
    const cat = CATALOGS.find(c => c.id === catalogId);
    if (!cat) throw new Error("Catalog not found.");
    return await fetchIndividualCatalog(cat, language);
}

async function fetchMergedList(params) {
    const language = safeStr(params.language || "zh-CN");
    const keywords = safeStr(params.keywords).toLowerCase().split(",").map(s => s.trim()).filter(s => s);
    const mergeType = safeStr(params.mergeType); // 'movie' or 'series'

    if (keywords.length === 0) throw new Error("Please enter keywords (e.g. Apple).");

    // Filter by Keyword AND Type
    const matchingCatalogs = CATALOGS.filter(cat => {
        const name = cat.name.toLowerCase();
        const typeMatch = (mergeType) ? (cat.type === mergeType) : true;
        const keywordMatch = keywords.some(k => name.includes(k));
        return typeMatch && keywordMatch;
    });

    if (matchingCatalogs.length === 0) throw new Error(`No ${mergeType || ""} catalogs matched.`);

    console.log(`Merging ${matchingCatalogs.length} ${mergeType} catalogs.`);

    // Fetch all in parallel
    const results = await Promise.all(matchingCatalogs.map(cat => fetchIndividualCatalog(cat, language)));

    // Flatten and Dedup
    let allItems = results.flat();
    const seen = new Set();
    const uniqueItems = [];
    for (const item of allItems) {
        if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueItems.push(item);
        }
    }

    return uniqueItems;
}
