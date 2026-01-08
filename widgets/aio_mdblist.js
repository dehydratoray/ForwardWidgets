
// --- configuration ---
const STREMIO_BASE_URL = "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7";

const CATALOGS = [
    { id: "tmdb.trending.movie", name: "Movies", type: "movie", source: "tmdb", path: "trending/movie/day" },
    { id: "tmdb.trending.tv", name: "Shows", type: "series", source: "tmdb", path: "trending/tv/day" },

    // MDBList Catalogs
    { id: "mdblist.86626", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.86625", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.4799", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.86945", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.86946", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.89392", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.89310", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.88326", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.88327", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.86628", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.86620", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.89366", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.89374", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.83487", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.83484", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.86755", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.86753", name: "Shows", type: "series", source: "stremio" },

    { id: "mdblist.87667", name: "Movies", type: "movie", source: "stremio" },
    { id: "mdblist.88434", name: "Shows", type: "series", source: "stremio" },

    // Genres
    { id: "mdblist.91211", name: "Action", type: "movie", source: "stremio" },
    { id: "mdblist.91213", name: "Action", type: "series", source: "stremio" },
    { id: "mdblist.116037", name: "Animated", type: "movie", source: "stremio" },
    { id: "mdblist.91223", name: "Comedy", type: "movie", source: "stremio" },
    { id: "mdblist.91215", name: "Horror", type: "movie", source: "stremio" },
    { id: "mdblist.91221", name: "Sci-Fi", type: "series", source: "stremio" },

    // Universes
    { id: "mdblist.3022", name: "Marvel", type: "movie", source: "stremio" },
    { id: "mdblist.3021", name: "DC", type: "movie", source: "stremio" },
    // Etc..
    { id: "mdblist.91304", name: "2020s", type: "movie", source: "stremio" }
];

// Define Groups manually to ensure logic is perfect
const GROUPS = [
    { title: "TMDB Trending", ids: ["tmdb.trending.movie", "tmdb.trending.tv"] },
    { title: "Apple TV+", ids: ["mdblist.86626", "mdblist.86625"] },
    { title: "Disney+", ids: ["mdblist.86945", "mdblist.86946"] },
    { title: "HBO Max", ids: ["mdblist.89392", "mdblist.89310"] },
    { title: "Netflix", ids: ["mdblist.86628", "mdblist.86620"] },
    { title: "Amazon Prime", ids: ["mdblist.86755", "mdblist.86753"] },
    { title: "Hulu", ids: ["mdblist.88326", "mdblist.88327"] },
    { title: "Paramount+", ids: ["mdblist.89366", "mdblist.89374"] },
    { title: "Peacock", ids: ["mdblist.83487", "mdblist.83484"] },
    { title: "Trakt Trending", ids: ["mdblist.87667", "mdblist.88434"] },
    { title: "Discovery+", ids: ["mdblist.4799"] },
    { title: "Action", ids: ["mdblist.91211", "mdblist.91213"] },
    { title: "Comedy", ids: ["mdblist.91223"] },
    { title: "Animation", ids: ["mdblist.116037"] },
    { title: "Horror", ids: ["mdblist.91215"] },
    { title: "Sci-Fi", ids: ["mdblist.91221"] },
    { title: "Universes", ids: ["mdblist.3022", "mdblist.3021"] },
    { title: "Decades", ids: ["mdblist.91304"] }
];

// Generate Modules from Groups
const MODULES = GROUPS.map(g => {
    return {
        id: `group_${g.title.replace(/[^a-zA-Z0-9]/g, '_')}`,
        title: g.title,
        functionName: "fetchGroup",
        sectionMode: true,
        params: [
            {
                name: "language",
                title: "Language",
                type: "language",
                value: "zh-CN"
            },
            {
                name: "catalogIds",
                title: "IDs",
                type: "constant",
                value: g.ids.join(","), // Pass comma-separated IDs
                hidden: true
            }
        ]
    };
});

var WidgetMetadata = {
    id: "forward.aio.merged",
    title: "AIO Merged Catalogs",
    version: "3.1.0",
    requiredVersion: "0.0.1",
    description: "Merged widgets (Movies + Series) from Stremio.",
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

// Simple concurrency limiter
async function pMap(array, mapper, concurrency) {
    const results = [];
    const chunks = [];
    for (let i = 0; i < array.length; i += concurrency) {
        chunks.push(array.slice(i, i + concurrency));
    }
    for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(mapper));
        results.push(...chunkResults);
    }
    return results;
}

// --- API Helpers ---

async function fetchTmdbDetail(externalId, type, language) {
    if (!externalId) return null;
    try {
        if (externalId.startsWith("tt")) {
            const findPath = `find/${externalId}`;
            const res = await Widget.tmdb.get(findPath, {
                params: {
                    language: language,
                    external_source: "imdb_id"
                }
            });
            if (res) {
                const results = (type === "movie") ? res.movie_results : res.tv_results;
                if (results && results.length > 0) return results[0];
            }
        }
        if (/^\d+$/.test(externalId)) {
            const path = `${type}/${externalId}`;
            const res = await Widget.tmdb.get(path, { params: { language: language } });
            return res;
        }
    } catch (e) { return null; }
    return null;
}

async function formatStremioItems(metas, reqType, language) {
    // Limit processing to 100 items max to prevent insane loads
    const limitedMetas = metas.slice(0, 50);

    // Process 5 items at a time to prevent rate limiting
    const enrichedItems = await pMap(limitedMetas, async (item) => {
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

        if (tmdbData && tmdbData.id) {
            uniqueId = tmdbData.id;
            itemType = "tmdb";
        } else if (stremioId.startsWith("tt")) {
            itemType = "imdb";
        } else {
            itemType = "url";
        }

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
    }, 5); // Concurrency 5

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

async function fetchSingleCatalog(catId, language) {
    const cat = CATALOGS.find(c => c.id === catId);
    if (!cat) return null;

    try {
        if (cat.source === "tmdb") {
            const res = await Widget.tmdb.get(cat.path, { params: { language: language } });
            if (res && res.results) {
                const items = await formatTmdbItems(res.results, cat.type === "movie" ? "movie" : "tv", language);
                return { title: cat.name, items };
            }
        } else if (cat.source === "stremio") {
            const url = `${STREMIO_BASE_URL}/catalog/${cat.type}/${cat.id}.json`;
            const res = await Widget.http.get(url);
            let data = res.data;
            if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { } }

            if (data && Array.isArray(data.metas)) {
                console.log(`Loaded ${data.metas.length} items from ${cat.name}, enriching...`);
                // Only take top 20 for speed in widget view? Should be configurable or reasonable default.
                // 50 is reasonable for a "browse" view.
                const items = await formatStremioItems(data.metas, cat.type, language);
                return { title: cat.name, items };
            }
        }
    } catch (e) {
        console.error(`Failed to fetch ${cat.name}:`, e);
    }
    return null;
}

// --- Main Handler ---

async function fetchGroup(params) {
    const language = safeStr(params.language || "zh-CN");
    const ids = safeStr(params.catalogIds).split(",").filter(x => x);

    // Fetch all catalogs in the group in parallel
    const results = await Promise.all(ids.map(id => fetchSingleCatalog(id, language)));

    // Filter out failed fetches
    const sections = results.filter(s => s && s.items.length > 0);
    return sections;
}
