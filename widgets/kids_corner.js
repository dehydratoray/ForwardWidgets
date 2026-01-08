var WidgetMetadata = {
    id: "forward.global.tour",
    title: "Global Tour",
    version: "1.1.0",
    requiredVersion: "0.0.1",
    description: "Explore the best cinema from around the world.",
    author: "ForwardWidget User",
    site: "https://themoviedb.org",
    modules: [
        {
            id: "korea", title: "Best of Korea", functionName: "fetchGlobal", params: [
                { name: "lang", type: "constant", value: "ko", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "japan", title: "Best of Japan", functionName: "fetchGlobal", params: [
                { name: "lang", type: "constant", value: "ja", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "france", title: "French Cinema", functionName: "fetchGlobal", params: [
                { name: "lang", type: "constant", value: "fr", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "india", title: "Bollywood Hits", functionName: "fetchGlobal", params: [
                { name: "lang", type: "constant", value: "hi", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "spain", title: "Spanish Gems", functionName: "fetchGlobal", params: [
                { name: "lang", type: "constant", value: "es", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        }
    ]
};

// --- Helper Functions ---
function safeStr(v) { return (v === undefined || v === null) ? "" : String(v); }

function genreTitleWith(genre_ids) {
    if (!genre_ids) return "";
    const genreDict = [
        { "id": 10759, "name": "Action & Adventure" },
        { "id": 16, "name": "Animation" },
        { "id": 35, "name": "Comedy" },
        { "id": 80, "name": "Crime" },
        { "id": 99, "name": "Documentary" },
        { "id": 18, "name": "Drama" },
        { "id": 10751, "name": "Family" },
        { "id": 10762, "name": "Kids" },
        { "id": 9648, "name": "Mystery" },
        { "id": 10763, "name": "News" },
        { "id": 10764, "name": "Reality" },
        { "id": 10765, "name": "Sci-Fi & Fantasy" },
        { "id": 10766, "name": "Soap" },
        { "id": 10767, "name": "Talk" },
        { "id": 10768, "name": "War & Politics" },
        { "id": 37, "name": "Western" },
        { "id": 28, "name": "Action" },
        { "id": 12, "name": "Adventure" },
        { "id": 14, "name": "Fantasy" },
        { "id": 36, "name": "History" },
        { "id": 27, "name": "Horror" },
        { "id": 10402, "name": "Music" },
        { "id": 10749, "name": "Romance" },
        { "id": 878, "name": "Science Fiction" },
        { "id": 10770, "name": "TV Movie" },
        { "id": 53, "name": "Thriller" },
        { "id": 10752, "name": "War" }
    ];
    if (genre_ids.length > 2) genre_ids = genre_ids.slice(0, 2);
    return genre_ids.map(id => {
        const genre = genreDict.find(g => g.id == id);
        return genre ? genre.name : null;
    }).filter(g => g !== null).join(", ");
}

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
        genreTitle: genreTitleWith(item.genre_ids)
    }));
}

// --- Main Logic ---

async function fetchGlobal(params) {
    const language = safeStr(params.language || "zh-CN");
    const langCode = safeStr(params.lang);

    try {
        const url = `discover/movie`;
        const query = {
            language: language,
            with_original_language: langCode,
            sort_by: "popularity.desc", // Most popular from that country
            "vote_average.gte": "6.5",  // Ensure decent quality
            "vote_count.gte": "100"
        };

        const res = await Widget.tmdb.get(url, { params: query });

        if (res && res.results) {
            return await formatTmdbItems(res.results, "movie");
        }
    } catch (e) {
        console.error("Global Tour Error", e);
    }
    return [];
}
