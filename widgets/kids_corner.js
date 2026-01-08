var WidgetMetadata = {
    id: "forward.hidden.gems",
    title: "Hidden Gems",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Discover highly-rated but less popular movies.",
    author: "ForwardWidget User",
    site: "https://themoviedb.org",
    modules: [
        {
            id: "indieDarlings", title: "Indie Darlings", functionName: "fetchGems", params: [
                { name: "mode", type: "constant", value: "indie", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "cultClassics", title: "Cult Classics", functionName: "fetchGems", params: [
                { name: "mode", type: "constant", value: "cult", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "criticallyAcclaimed", title: "Critically Acclaimed", functionName: "fetchGems", params: [
                { name: "mode", type: "constant", value: "acclaimed", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        }
    ]
};

// --- Helper Functions ---
function safeStr(v) { return (v === undefined || v === null) ? "" : String(v); }

async function formatTmdbItems(listItems, reqType) {
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

// --- Main Logic ---

async function fetchGems(params) {
    const language = safeStr(params.language || "zh-CN");
    const mode = safeStr(params.mode);

    try {
        const url = `discover/movie`;
        const query = {
            language: language,
            sort_by: "vote_average.desc", // Sort by quality
            "vote_average.gte": "7.0",
            "vote_count.gte": "200", // Minimum credibility
            page: 1
        };

        if (mode === "indie") {
            // Highly rated, low popularity
            query["vote_average.gte"] = "7.5";
            query["vote_count.lte"] = "3000"; // Cap popularity
        } else if (mode === "cult") {
            // Older, highly rated, medium popularity
            query["primary_release_date.lte"] = "2010-01-01";
            query["vote_average.gte"] = "7.2";
            query["vote_count.lte"] = "5000";
        } else if (mode === "acclaimed") {
            // Just pure high score, ignore popularity cap
            query["vote_average.gte"] = "8.0";
            query["vote_count.gte"] = "500";
        }

        const res = await Widget.tmdb.get(url, { params: query });

        if (res && res.results) {
            return await formatTmdbItems(res.results, "movie");
        }
    } catch (e) {
        console.error("Hidden Gems Error", e);
    }
    return [];
}
