var WidgetMetadata = {
    id: "forward.trakt.trending",
    title: "Trakt Trending",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Browse trending movies/shows from Trakt.",
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
    // Trakt returns YYYY-MM-DD
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

// --- Data Formatting ---

function formatTraktData(list, type) {
    // list is array of { watchers: n, movie/show: {...} }
    const isMovie = (type === "movies");

    // Validate and filter
    const validList = list.filter(item => {
        const obj = isMovie ? item.movie : item.show;
        return obj && obj.title && obj.ids;
    });

    return validList.map(item => {
        const obj = isMovie ? item.movie : item.show;
        const ids = obj.ids || {};
        const tmdbId = ids.tmdb;
        const isTv = !isMovie;

        const title = safeStr(obj.title);
        const year = obj.year ? String(obj.year) : "";

        // Construct TMDB Info object
        const tmdbInfo = {
            id: tmdbId ? String(tmdbId) : "",
            originalTitle: title, // Trakt doesn't always send original title in valid format, use title fallback
            description: safeStr(obj.overview),
            releaseDate: toISODate(obj.released || obj.first_aired),
            backdropPath: "", // Trakt doesn't provide these
            posterPath: "",
            rating: obj.rating ? Number(obj.rating) : 0,
            mediaType: isTv ? "tv" : "movie",
            genreTitle: Array.isArray(obj.genres) ? obj.genres.join(", ") : "",
            popularity: item.watchers || 0, // Use watchers as popularity proxy
            voteCount: obj.votes || 0,
        };

        return {
            id: tmdbId ? String(tmdbId) : (String(ids.trakt) || Math.random().toString(36)),
            type: "tmdb",
            title: title,
            originalTitle: title,
            description: tmdbInfo.description,
            releaseDate: tmdbInfo.releaseDate,
            backdropPath: "",
            posterPath: "",
            rating: tmdbInfo.rating,
            mediaType: tmdbInfo.mediaType,
            genreTitle: tmdbInfo.genreTitle,
            tmdbInfo: tmdbInfo,
            year: year,
            countries: [], // Trakt data might not have this easily available in simple response
            directors: [],
            actors: [],
            popularity: tmdbInfo.popularity,
            voteCount: tmdbInfo.voteCount,
            isNew: false,
            playable: false,
            episodeCount: "",
        };
    });
}

// --- Fetch Logic ---

async function fetchTraktTrending(type, params) {
    const clientId = safeStr(params.clientId).trim();
    // Fallback to a default or require user input. 
    // If user didn't input anything, we can't really fetch efficiently from Trakt without an ID.
    // For demo purposes if empty, we might throw or return empty.
    if (!clientId) {
        throw new Error("Trakt Client ID is required.");
    }

    // API: https://api.trakt.tv/movies/trending
    // API: https://api.trakt.tv/shows/trending
    // extended=full provides more info like overview, genres
    const url = `https://api.trakt.tv/${type}/trending?extended=full&limit=20`;

    console.log(`Fetching Trakt ${type} trending...`);

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

        return formatTraktData(list, type);

    } catch (error) {
        console.error(`Failed to fetch Trakt ${type}:`, error);
        return [];
    }
}

// --- Module Functions ---

async function trendingMovies(params) {
    return await fetchTraktTrending("movies", params);
}

async function trendingShows(params) {
    return await fetchTraktTrending("shows", params);
}
