
// --- Catalog Configuration ---
const CATALOGS = [
    { id: "tmdb.trending.movie", name: "TMDB Trending Movies", type: "movie", source: "tmdb", path: "trending/movie/day" },
    { id: "tmdb.trending.tv", name: "TMDB Trending Shows", type: "series", source: "tmdb", path: "trending/tv/day" },

    // MDBList Catalogs
    { id: "86626", name: "Top Movies - Apple TV+", type: "movie", source: "mdblist" },
    { id: "86625", name: "Top TV Shows - Apple TV+", type: "series", source: "mdblist" },
    { id: "4799", name: "Discovery+", type: "series", source: "mdblist" },
    { id: "86945", name: "Top Movies - Disney+", type: "movie", source: "mdblist" },
    { id: "86946", name: "Top TV Shows - Disney+", type: "series", source: "mdblist" },
    { id: "89392", name: "Top Movies - HBO Max", type: "movie", source: "mdblist" },
    { id: "89310", name: "Top TV Shows - HBO Max", type: "series", source: "mdblist" },
    { id: "88326", name: "Hulu Movies", type: "movie", source: "mdblist" },
    { id: "88327", name: "Hulu Shows", type: "series", source: "mdblist" },
    { id: "86628", name: "Top Movies - Netflix", type: "movie", source: "mdblist" },
    { id: "86620", name: "Top TV Shows - Netflix", type: "series", source: "mdblist" },
    { id: "89366", name: "Top Movies - Paramount+", type: "movie", source: "mdblist" },
    { id: "89374", name: "Top TV Shows - Paramount+", type: "series", source: "mdblist" },
    { id: "83487", name: "Peacock Movies", type: "movie", source: "mdblist" },
    { id: "83484", name: "Peacock Shows", type: "series", source: "mdblist" },
    { id: "86755", name: "Amazon Prime Movies", type: "movie", source: "mdblist" },
    { id: "86753", name: "Amazon Prime Shows", type: "series", source: "mdblist" },
    { id: "87667", name: "Trakt Trending Movies", type: "movie", source: "mdblist" },
    { id: "88434", name: "Trakt Trending Shows", type: "series", source: "mdblist" },

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
    { id: "125115", name: "Star Wars Universe", type: "series", source: "mdblist" },
    { id: "105063", name: "Harry Potter", type: "series", source: "mdblist" },

    // Eras
    { id: "91304", name: "Popular 2020s Movies", type: "movie", source: "mdblist" }
];

// Generate Modules
const MODULES = CATALOGS.map(cat => {
    return {
        id: `mod_${cat.id}`,
        title: cat.name,
        functionName: "fetchList",
        sectionMode: false,
        params: [
            {
                name: "apiKey",
                title: "MDBList API Key",
                type: "input",
                // For TMDB lists, make it optional/hidden logic, but UI needs consistent params
                description: cat.source === "mdblist" ? "Required" : "Optional for TMDB",
                value: ""
            },
            {
                name: "language",
                title: "Language",
                type: "language",
                value: "zh-CN"
            },
            {
                name: "catalogId",
                title: "Internal ID",
                type: "constant",
                value: cat.id,
                hidden: true
            }
        ]
    };
});

var WidgetMetadata = {
    id: "forward.aio.modules",
    title: "AIO Catalogs",
    version: "2.0.0",
    requiredVersion: "0.0.1",
    description: "Individual widgets for each catalog (Apple, Disney, Netflix...).",
    author: "ForwardWidget User",
    site: "https://mdblist.com",
    modules: MODULES
};


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
    if (!tmdbId) return null;
    try {
        const path = `${type}/${tmdbId}`;
        const res = await Widget.tmdb.get(path, { params: { language: language } });
        return res;
    } catch (e) { return null; }
}

async function formatItems(listItems, reqType, language, isTmdbSource) {
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
            mediaType: item.media_type || reqType,
            genreTitle: ""
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

// --- Main Function using Catalog ID ---

async function fetchList(params) {
    const apiKey = safeStr(params.apiKey).trim();
    const language = safeStr(params.language || "zh-CN");
    const catalogId = safeStr(params.catalogId);

    // Find the catalog definition
    const cat = CATALOGS.find(c => c.id === catalogId);
    if (!cat) throw new Error("Catalog not found.");

    if (cat.source === "mdblist" && !apiKey) {
        throw new Error("MDBList API Key required.");
    }

    try {
        if (cat.source === "tmdb") {
            const res = await Widget.tmdb.get(cat.path, { params: { language: language } });
            if (res && res.results) {
                return await formatItems(res.results, cat.type === "movie" ? "movie" : "tv", language, true);
            }
        } else if (cat.source === "mdblist") {
            const limit = 20;
            const url = `https://api.mdblist.com/lists/${cat.id}/items?apikey=${apiKey}&limit=${limit}`;
            const res = await Widget.http.get(url);
            let data = res.data;
            if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { } }

            if (Array.isArray(data)) {
                return await formatItems(data, cat.type, language, false);
            }
        }
    } catch (e) {
        console.error(`Failed to fetch ${cat.name}:`, e);
        throw e;
    }
    return [];
}
