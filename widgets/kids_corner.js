var WidgetMetadata = {
    id: "forward.kids.corner",
    title: "Kids Corner",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Safe and fun movies for the family.",
    author: "ForwardWidget User",
    site: "https://themoviedb.org",
    modules: [
        {
            id: "popularKids", title: "Popular Family Movies", functionName: "fetchKids", params: [
                { name: "mode", type: "constant", value: "genre", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "disneyAnim", title: "Disney Animation", functionName: "fetchKids", params: [
                { name: "mode", type: "constant", value: "company", hidden: true },
                { name: "targetId", type: "constant", value: "2", hidden: true }, // Walt Disney Pictures (broad, but usually safe)
                // Better: Walt Disney Animation Studios (6125)
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "dreamworks", title: "DreamWorks Animation", functionName: "fetchKids", params: [
                { name: "mode", type: "constant", value: "company", hidden: true },
                { name: "targetId", type: "constant", value: "521", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "illumination", title: "Illumination (Minions)", functionName: "fetchKids", params: [
                { name: "mode", type: "constant", value: "company", hidden: true },
                { name: "targetId", type: "constant", value: "6704", hidden: true },
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

async function fetchKids(params) {
    const language = safeStr(params.language || "zh-CN");
    const mode = safeStr(params.mode);
    const targetId = safeStr(params.targetId);

    try {
        const url = `discover/movie`;
        const query = {
            language: language,
            sort_by: "popularity.desc",
            with_genres: "16,10751", // Animation AND Family (Strict)
            "vote_average.gte": "6.0" // Decent quality
        };

        if (mode === "company") {
            query.with_companies = targetId;
        }

        const res = await Widget.tmdb.get(url, { params: query });

        if (res && res.results) {
            return await formatTmdbItems(res.results, "movie");
        }
    } catch (e) {
        console.error("Kids Corner Error", e);
    }
    return [];
}
