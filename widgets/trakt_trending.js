var WidgetMetadata = {
    id: "forward.trakt.trending",
    title: "Trakt Trending",
    version: "1.4.0",
    requiredVersion: "0.0.1",
    description: "Browse trending movies/shows from Trakt (enriched with TMDB).",
    author: "ForwardWidget User",
    site: "https://trakt.tv/",
    modules: [
        {
            id: "trendingMovies",
            title: "Trending Movies",
            functionName: "trendingMovies",
            params: [
                {
                    name: "clientId",
                    title: "Trakt Client ID",
                    type: "input",
                    description: "Your Trakt app Client ID (public).",
                    value: ""
                },
                {
                    name: "language",
                    title: "Language",
                    type: "language",
                    value: "zh-CN"
                },
                {
                    name: "page",
                    title: "Page",
                    type: "page"
                }
            ]
        },
        {
            id: "trendingShows",
            title: "Trending Shows",
            functionName: "trendingShows",
            params: [
                {
                    name: "clientId",
                    title: "Trakt Client ID",
                    type: "input",
                    description: "Your Trakt app Client ID (public).",
                    value: ""
                },
                {
                    name: "language",
                    title: "Language",
                    type: "language",
                    value: "zh-CN"
                },
                {
                    name: "page",
                    title: "Page",
                    type: "page"
                }
            ]
        }
    ]
};

// --- Helper Functions ---

function safeStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
}

function toISODate(v) {
    const s = safeStr(v).trim();
    return s || "";
}

function buildTraktHeaders(clientId) {
    return {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientId
    };
}

// --- Data Fetching & Formatting ---

async function fetchTmdbDetail(tmdbId, type, language) {
    if (!tmdbId) return null;
    try {
        const path = `${type}/${tmdbId}`;
        const res = await Widget.tmdb.get(path, { params: { language: language } });
        return res;
    } catch (e) {
        console.log(`TMDB fetch failed for ${type}/${tmdbId}: ${e.message}`);
        return null;
    }
}

async function formatTraktData(list, type, language) {
    const isMovie = (type === "movies");

    const validList = list.filter(item => {
        const obj = isMovie ? item.movie : item.show;
        return obj && obj.title && obj.ids;
    });

    const enrichedItems = await Promise.all(validList.map(async (item) => {
        const obj = isMovie ? item.movie : item.show;
        const tmdbId = obj.ids.tmdb;

        let tmdbData = null;
        if (tmdbId) {
            tmdbData = await fetchTmdbDetail(tmdbId, isMovie ? "movie" : "tv", language);
        }

        // Merge Data
        const isTv = !isMovie;

        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(obj.title);
        const originalTitle = tmdbData ? (tmdbData.original_title || tmdbData.original_name) : safeStr(obj.title);
        const overview = tmdbData ? tmdbData.overview : safeStr(obj.overview);

        const posterPath = tmdbData ? (tmdbData.poster_path || "") : "";
        const backdropPath = tmdbData ? (tmdbData.backdrop_path || "") : "";

        const rating = tmdbData ? tmdbData.vote_average : (obj.rating ? Number(obj.rating) : 0);
        const voteCount = tmdbData ? tmdbData.vote_count : (obj.votes || 0);

        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : (obj.released || obj.first_aired));

        // ID Logic:
        // Works: tmdb.js returns raw ID (e.g. 12345) and type "tmdb".
        // Broken: prefixing "movie.12345".
        let uniqueId = "";
        let itemType = "tmdb";

        if (tmdbId) {
            uniqueId = tmdbId; // Raw ID
            itemType = "tmdb";
        } else if (obj.ids.imdb) {
            uniqueId = obj.ids.imdb;
            itemType = "imdb";
        } else {
            uniqueId = String(obj.ids.trakt) || Math.random().toString(36);
            itemType = "url";
        }

        const tmdbInfo = {
            id: tmdbId ? String(tmdbId) : "",
            originalTitle: originalTitle,
            description: overview,
            releaseDate: releaseDate,
            backdropPath: backdropPath,
            posterPath: posterPath,
            rating: rating,
            mediaType: isTv ? "tv" : "movie",
            genreTitle: "",
            popularity: tmdbData ? tmdbData.popularity : (item.watchers || 0),
            voteCount: voteCount
        };

        if (tmdbData && tmdbData.genres) {
            tmdbInfo.genreTitle = tmdbData.genres.map(g => g.name).join(", ");
        } else if (Array.isArray(obj.genres)) {
            tmdbInfo.genreTitle = obj.genres.join(", ");
        }

        return {
            id: uniqueId,
            type: itemType,
            title: title,
            originalTitle: originalTitle,
            description: overview,
            releaseDate: releaseDate,
            backdropPath: backdropPath,
            posterPath: posterPath,
            rating: rating,
            mediaType: tmdbInfo.mediaType,
            genreTitle: tmdbInfo.genreTitle,
            tmdbInfo: tmdbInfo,
            year: obj.year ? String(obj.year) : "",
            // Extra metadata that might help Stremio/plugins
            imdbId: obj.ids.imdb || "",
            countries: tmdbData && tmdbData.production_countries ? tmdbData.production_countries.map(c => c.name) : [],
            directors: [],
            actors: [],
            popularity: tmdbInfo.popularity,
            voteCount: tmdbInfo.voteCount,
            isNew: false,
            playable: false,
            episodeCount: "",
        };
    }));

    return enrichedItems;
}

// --- Main Logic ---

async function fetchTraktTrending(type, params) {
    const clientId = safeStr(params.clientId).trim();
    const language = safeStr(params.language || "zh-CN");
    const page = parseInt(params.page || 1, 10);

    if (!clientId) {
        throw new Error("Trakt Client ID is required.");
    }

    const limit = 20;
    const url = `https://api.trakt.tv/${type}/trending?extended=full&limit=${limit}&page=${page}`;

    console.log(`Fetching from Trakt (${type}) Page ${page}...`);

    try {
        const response = await Widget.http.get(url, {
            headers: {
                ...buildTraktHeaders(clientId),
                "User-Agent": "ForwardWidget/1.0"
            }
        });

        const data = response && response.data;
        const list = (typeof data === "string") ? JSON.parse(data) : data;

        if (!Array.isArray(list)) {
            console.error("Invalid Trakt response format");
            return [];
        }

        return await formatTraktData(list, type, language);

    } catch (error) {
        console.error(`Error in Trakt widget:`, error);
        throw error;
    }
}

// --- Module Functions ---

async function trendingMovies(params) {
    return await fetchTraktTrending("movies", params);
}

async function trendingShows(params) {
    return await fetchTraktTrending("shows", params);
}
