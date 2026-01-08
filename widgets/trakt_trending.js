var WidgetMetadata = {
    id: "forward.trakt.trending",
    title: "Trakt Trending",
    version: "1.1.0",
    requiredVersion: "0.0.1",
    description: "Browse trending movies/shows from Trakt (with optional TMDB metadata).",
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
                    name: "tmdbApiKey",
                    title: "TMDB API Key (Optional)",
                    type: "input",
                    description: "For posters/backdrops. Leave empty for text-only.",
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
                },
                {
                    name: "tmdbApiKey",
                    title: "TMDB API Key (Optional)",
                    type: "input",
                    description: "For posters/backdrops. Leave empty for text-only.",
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

async function fetchTmdbDetails(tmdbId, type, apiKey) {
    if (!tmdbId || !apiKey) return null;

    // type: 'movie' or 'tv'
    // endpoint: https://api.themoviedb.org/3/movie/{movie_id}?api_key=<<api_key>>&language=en-US
    // We can also request images? append_to_response=images

    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&language=zh-CN`;
    // Note: Using zh-CN as per the user's previous example snippets having Chinese text, 
    // but Trakt trending is global. Let's stick to user's implied preference or default? 
    // The previous user examples ("热门电影") were Chinese. I'll default to zh-CN but this is configurable ideally.
    // For now I'll use no language param to get default (usually en-US) OR match the user's likely locale.
    // Let's stick to en-US for broad compatibility unless requested otherwise, 
    // BUT the user provided a Chinese example in step 15/20. 
    // I will use `language=zh-CN` to match the example vibe, or maybe just `language=en-US` if they want English?
    // User's metadata prompt in step 0 was English.
    // User's metadata prompt in step 20 was Chinese.
    // I will TRY to detect but since I can't, I'll use a neutral approach or just pass what we get.
    // I'll leave language out (defaults to en-US) to be safe for a "Trakt" widget which is English-centric usually.
    // Actually, let's use `en-US` as safe default for Trakt.

    try {
        const res = await Widget.http.get(url);
        return res && res.data ? (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) : null;
    } catch (e) {
        console.log(`TMDB fetch failed for ${type}.${tmdbId}: ${e.message}`);
        return null;
    }
}

async function formatTraktData(list, type, tmdbApiKey) {
    const isMovie = (type === "movies");

    // 1. Filter valid items
    const validList = list.filter(item => {
        const obj = isMovie ? item.movie : item.show;
        return obj && obj.title && obj.ids;
    });

    // 2. Prepare for TMDB enrichment if key provided
    // We'll map them to a temporary structure first
    const mappedItems = validList.map(item => {
        const obj = isMovie ? item.movie : item.show;
        return {
            traktObj: obj,
            watchers: item.watchers,
            tmdbId: obj.ids.tmdb
        };
    });

    // 3. Fetch from TMDB in parallel if API key exists
    let tmdbResults = {};
    if (tmdbApiKey) {
        console.log("Fetching additional metadata from TMDB...");
        const promises = mappedItems.map(it => {
            if (!it.tmdbId) return Promise.resolve(null);
            return fetchTmdbDetails(it.tmdbId, isMovie ? "movie" : "tv", tmdbApiKey)
                .then(data => ({ id: it.tmdbId, data }));
        });

        const results = await Promise.all(promises);
        results.forEach(r => {
            if (r) tmdbResults[r.id] = r.data;
        });
    }

    // 4. Construct Final Objects
    return mappedItems.map(it => {
        const obj = it.traktObj;
        const ids = obj.ids || {};
        const tmdbId = ids.tmdb;
        const tmdbData = tmdbResults[tmdbId]; // Might be undefined

        const isTv = !isMovie;

        // Prefer TMDB data if available, else Trakt fallback
        const title = tmdbData ? tmdbData.title || tmdbData.name : safeStr(obj.title);
        const originalTitle = tmdbData ? tmdbData.original_title || tmdbData.original_name : safeStr(obj.title);
        const overview = tmdbData ? tmdbData.overview : safeStr(obj.overview);

        // Images
        const posterPath = tmdbData ? (tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : "") : "";
        const backdropPath = tmdbData ? (tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : "") : "";

        const rating = tmdbData ? tmdbData.vote_average : (obj.rating ? Number(obj.rating) : 0);
        const voteCount = tmdbData ? tmdbData.vote_count : (obj.votes || 0);

        // Unique ID for ForwardWidget
        let uniqueId = "";
        let itemType = "tmdb";
        if (tmdbId) {
            uniqueId = (isTv ? "tv." : "movie.") + tmdbId;
            itemType = "tmdb";
        } else if (ids.imdb) {
            uniqueId = ids.imdb;
            itemType = "imdb";
        } else {
            uniqueId = String(ids.trakt) || Math.random().toString(36);
            itemType = "url";
        }

        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : (obj.released || obj.first_aired));

        // Construct tmdbInfo object matching the user's reference
        const tmdbInfo = {
            id: tmdbId ? String(tmdbId) : "",
            originalTitle: originalTitle,
            description: overview,
            releaseDate: releaseDate,
            backdropPath: backdropPath,
            posterPath: posterPath,
            rating: rating,
            mediaType: isTv ? "tv" : "movie",
            genreTitle: "", // We could map IDs -> Names if we fetched genre list, but for now skip or use Trakt's if available
            popularity: tmdbData ? tmdbData.popularity : (it.watchers || 0),
            voteCount: voteCount
        };

        // Fill genres from Trakt if TMDB didn't provide easy string, or use TMDB genres array
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
            mediaType: isTv ? "tv" : "movie",
            genreTitle: tmdbInfo.genreTitle,
            tmdbInfo: tmdbInfo,
            year: obj.year ? String(obj.year) : "",
            countries: tmdbData && tmdbData.production_countries ? tmdbData.production_countries.map(c => c.name) : [],
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

// --- Main Logic ---

async function fetchTraktTrending(type, params) {
    const clientId = safeStr(params.clientId).trim();
    const tmdbApiKey = safeStr(params.tmdbApiKey).trim();

    if (!clientId) {
        throw new Error("Trakt Client ID is required.");
    }

    const url = `https://api.trakt.tv/${type}/trending?extended=full&limit=20`;

    console.log(`Fetching from Trakt (${type})...`);

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
            console.error("Invalid Trakt response");
            return [];
        }

        return await formatTraktData(list, type, tmdbApiKey);

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
