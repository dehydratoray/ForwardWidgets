var WidgetMetadata = {
    id: "forward.aio.dynamic",
    title: "AIO Browser (Dynamic)",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Dynamic browser that auto-syncs with your Stremio configuration.",
    author: "ForwardWidget User",
    site: "https://stremio.com",
    modules: [
        {
            id: "browse",
            title: "Browse All Lists",
            functionName: "browse",
            sectionMode: true, // Key feature: Displays multiple lists
            params: [
                {
                    name: "language",
                    title: "Language",
                    type: "language",
                    value: "zh-CN"
                }
            ]
        }
    ]
};

// --- Configuration ---
// The user's specific manifest URL
const MANIFEST_URL = "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7/manifest.json";

// --- Helper Functions ---

function safeStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
}
function toISODate(v) {
    const s = safeStr(v).trim();
    return s || "";
}

// --- Data Enrichment (TMDB) ---

async function fetchTmdbDetail(externalId, type, language) {
    if (!externalId) return null;
    try {
        // Handle IMDb IDs (tt12345)
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
                const other = (type === "movie") ? res.tv_results : res.movie_results;
                if (other && other.length > 0) return other[0];
            }
            return null;
        }
        // Handle TMDB IDs (12345)
        if (/^\d+$/.test(externalId)) {
            const path = `${type}/${externalId}`;
            const res = await Widget.tmdb.get(path, { params: { language: language } });
            return res;
        }
    } catch (e) {
        return null;
    }
    return null;
}

// Standard Stremio Item Format -> Forward Widget Item
async function formatStremioItems(metas, reqType, language) {
    // Parallel enrichment
    const enrichedItems = await Promise.all(metas.map(async (item) => {
        const stremioId = item.id;
        // Determine type: item.type usually exists. If not, fallback to reqType (catalog type)
        const mediaType = item.type || reqType;

        const isMovie = (mediaType === "movie");
        const tmdbType = isMovie ? "movie" : "tv";

        // Fetch rich metadata from TMDB
        let tmdbData = await fetchTmdbDetail(stremioId, tmdbType, language);

        // Use TMDB data if available, fallback to Stremio item data
        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(item.name);
        const overview = tmdbData ? tmdbData.overview : safeStr(item.description);
        const posterPath = tmdbData ? (tmdbData.poster_path || "") : (item.poster || "");
        const backdropPath = tmdbData ? (tmdbData.backdrop_path || "") : (item.background || "");

        const rating = tmdbData ? tmdbData.vote_average : (item.imdbRating ? Number(item.imdbRating) : 0);
        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : item.releaseInfo);

        // Determine the ID to return: prefer TMDB ID for player compatibility
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
    }));

    return enrichedItems;
}

// --- Catalog Fetching ---

async function fetchCatalog(baseUrl, catalog, language) {
    // Url pattern: {baseUrl}/catalog/{type}/{id}.json
    // Note: baseUrl from manifest usually doesn't end with slash

    const catalogUrl = `${baseUrl}/catalog/${catalog.type}/${catalog.id}.json`;
    // console.log(`Fetching: ${catalog.name} (${catalogUrl})`);

    try {
        const catRes = await Widget.http.get(catalogUrl);
        let catData = catRes.data;
        if (typeof catData === "string") {
            try { catData = JSON.parse(catData); } catch (e) { }
        }

        if (!catData || !Array.isArray(catData.metas) || catData.metas.length === 0) {
            return null; // Empty section, skip
        }

        return {
            title: catalog.name || catalog.id,
            items: await formatStremioItems(catData.metas, catalog.type, language)
        };

    } catch (e) {
        console.error(`Failed to load catalog ${catalog.name}:`, e);
        return null;
    }
}

// --- Main Function ---

async function browse(params) {
    const language = safeStr(params.language || "zh-CN");

    console.log(`Loading Dynamic AIO Manifest...`);

    try {
        const manifestRes = await Widget.http.get(MANIFEST_URL);
        let manifest = manifestRes.data;
        if (typeof manifest === "string") {
            try { manifest = JSON.parse(manifest); } catch (e) { }
        }

        if (!manifest || !manifest.catalogs) {
            throw new Error("Invalid Manifest: No catalogs found.");
        }

        // Filter relevant catalogs (movies and series only usually)
        const validCatalogs = manifest.catalogs.filter(c =>
            (c.type === "movie" || c.type === "series")
            && c.id !== "search" // Exclude search "catalogs"
        );

        // Construct Base URL (Manifest URL minus /manifest.json)
        let baseUrl = MANIFEST_URL.replace("/manifest.json", "");
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

        // Fetch ALL catalogs in parallel
        // Note: This might be heavy if there are 30+ catalogs. 
        // Most Stremio addons are fast, but we depend on rate limits.
        const sections = await Promise.all(
            validCatalogs.map(cat => fetchCatalog(baseUrl, cat, language))
        );

        // Filter out failed/empty sections
        return sections.filter(s => s !== null);

    } catch (error) {
        console.error("AIO Dynamic Error:", error);
        throw error;
    }
}
