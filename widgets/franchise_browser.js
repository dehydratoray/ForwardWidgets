var WidgetMetadata = {
    id: "forward.franchise",
    title: "Franchise Browser",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Browse major cinematic universes and franchises.",
    author: "ForwardWidget User",
    site: "https://themoviedb.org",
    modules: [
        {
            id: "marvel", title: "Marvel Cinematic Universe", functionName: "fetchCollection", params: [
                { name: "id", type: "constant", value: "86311", hidden: true }, // Avengers Collection (As proxy for MCU usually lists)
                // Or we do Company Search for Marvel Studios? 
                // Better: Use a List or just "Avengers" collection for now.
                // Actually, for broad "Universes", Keywords or Companies are better.
                // Let's use Company ID for Marvel Studios: 420
                { name: "mode", type: "constant", value: "company", hidden: true },
                { name: "targetId", type: "constant", value: "420", hidden: true },
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "dc", title: "DC Universe", functionName: "fetchCollection", params: [
                { name: "mode", type: "constant", value: "company", hidden: true },
                { name: "targetId", type: "constant", value: "128064", hidden: true }, // DC Films
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "starwars", title: "Star Wars", functionName: "fetchCollection", params: [
                { name: "mode", type: "constant", value: "collection", hidden: true },
                { name: "targetId", type: "constant", value: "10", hidden: true }, // Star Wars Collection
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "harrypotter", title: "Harry Potter", functionName: "fetchCollection", params: [
                { name: "mode", type: "constant", value: "collection", hidden: true },
                { name: "targetId", type: "constant", value: "1241", hidden: true }, // HP Collection
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "lotr", title: "Lord of the Rings", functionName: "fetchCollection", params: [
                { name: "mode", type: "constant", value: "collection", hidden: true },
                { name: "targetId", type: "constant", value: "119", hidden: true }, // LOTR Collection
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "jamesbond", title: "James Bond", functionName: "fetchCollection", params: [
                { name: "mode", type: "constant", value: "collection", hidden: true },
                { name: "targetId", type: "constant", value: "645", hidden: true }, // 007 Collection
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        },
        {
            id: "fastfurious", title: "Fast & Furious", functionName: "fetchCollection", params: [
                { name: "mode", type: "constant", value: "collection", hidden: true },
                { name: "targetId", type: "constant", value: "9485", hidden: true }, // Fast & Furious Collection
                { name: "language", title: "Language", type: "language", value: "zh-CN" }
            ]
        }
    ]
};

// --- Helper Functions ---
function safeStr(v) { return (v === undefined || v === null) ? "" : String(v); }
function toISODate(v) { const s = safeStr(v).trim(); return s || ""; }

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
        mediaType: item.media_type || reqType, // Collections are usually same type
        genreTitle: ""
    }));
}

// --- Main Logic ---

async function fetchCollection(params) {
    const language = safeStr(params.language || "zh-CN");
    const mode = safeStr(params.mode);
    const targetId = safeStr(params.targetId);

    if (mode === "collection") {
        // Fetch Collection Details (only movies usually)
        const url = `collection/${targetId}`;
        const res = await Widget.tmdb.get(url, { params: { language: language } });
        if (res && res.parts) {
            // Sort by release date
            res.parts.sort((a, b) => {
                return (a.release_date || "9999") > (b.release_date || "9999") ? 1 : -1;
            });
            return await formatTmdbItems(res.parts, "movie");
        }
    }
    else if (mode === "company") {
        // Discover by Company
        const url = `discover/movie`;
        const res = await Widget.tmdb.get(url, {
            params: {
                language: language,
                with_companies: targetId,
                sort_by: "popularity.desc"
            }
        });
        if (res && res.results) {
            return await formatTmdbItems(res.results, "movie");
        }
    }

    return [];
}
