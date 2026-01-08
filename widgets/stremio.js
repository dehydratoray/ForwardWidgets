var WidgetMetadata = {
    id: "forward.stremio.browser",
    title: "Stremio Addon Browser",
    version: "1.1.0",
    requiredVersion: "0.0.1",
    description: "Browse content from any Stremio Addon (Catalog).",
    author: "ForwardWidget User",
    site: "https://stremio.com",
    modules: [
        {
            id: "browseAddon",
            title: "Browse Addon",
            functionName: "browseAddon",
            sectionMode: true, // Enable Section Mode
            params: [
                {
                    name: "manifestUrl",
                    title: "Manifest URL",
                    type: "input",
                    description: "Full URL to manifest.json (e.g. https://cyberflix.elfhosted.com/manifest.json)",
                    value: "",
                    placeholders: [
                        { title: "Cyberflix", value: "https://cyberflix.elfhosted.com/manifest.json" }
                    ]
                },
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    value: "movie",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "Series", value: "series" }
                    ]
                },
                // Removed Catalog ID override - in section mode we load all relevant catalogs
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

// --- Helper Functions ---

function safeStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
}

function toISODate(v) {
    const s = safeStr(v).trim();
    return s || "";
}

// --- Data Fetching & Formatting ---

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
                const other = (type === "movie") ? res.tv_results : res.movie_results;
                if (other && other.length > 0) return other[0];
            }
            return null;
        }
        if (/^\d+$/.test(externalId)) {
            const path = `${type}/${externalId}`;
            const res = await Widget.tmdb.get(path, { params: { language: language } });
            return res;
        }
    } catch (e) {
        console.log(`TMDB fetch failed for ${externalId}: ${e.message}`);
        return null;
    }
    return null;
}

async function formatStremioData(listItems, reqType, language) {
    // Parallel enrichment
    const enrichedItems = await Promise.all(listItems.map(async (item) => {
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

        let genreTitle = "";
        if (tmdbData && tmdbData.genres) {
            genreTitle = tmdbData.genres.map(g => g.name).join(", ");
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
            genreTitle: genreTitle
        };
    }));

    return enrichedItems;
}

// --- Main Logic ---

async function fetchCatalog(baseUrl, catalog, type, language) {
    // Url pattern: {baseUrl}/catalog/{type}/{id}.json
    // We load first page only for section view
    const catalogUrl = `${baseUrl}/catalog/${type}/${catalog.id}.json`;
    console.log(`Fetching Section: ${catalog.name} (${catalogUrl})`);

    try {
        const catRes = await Widget.http.get(catalogUrl);
        let catData = catRes.data;
        if (typeof catData === "string") {
            try { catData = JSON.parse(catData); } catch (e) { }
        }

        if (!catData || !Array.isArray(catData.metas)) {
            return [];
        }

        // Format items
        const items = await formatStremioData(catData.metas, type, language);

        // Return Section Object
        return {
            title: catalog.name || catalog.id,
            items: items
        };

    } catch (e) {
        console.error(`Failed to load catalog ${catalog.name}:`, e);
        return null; // Skip this section on error
    }
}

async function browseAddon(params) {
    const manifestUrl = safeStr(params.manifestUrl).trim();
    const type = safeStr(params.type || "movie");
    const language = safeStr(params.language || "zh-CN");

    if (!manifestUrl) throw new Error("Manifest URL is required.");

    console.log(`Fetching Manifest: ${manifestUrl}`);

    try {
        // 1. Fetch Manifest
        const manifestRes = await Widget.http.get(manifestUrl);
        let manifest = manifestRes.data;
        if (typeof manifest === "string") {
            try { manifest = JSON.parse(manifest); } catch (e) { }
        }

        if (!manifest || !manifest.catalogs) {
            throw new Error("Invalid Manifest: No catalogs found.");
        }

        // 2. Resolve Catalogs matching Type
        const sectionCatalogs = manifest.catalogs.filter(c => c.type === type);

        if (sectionCatalogs.length === 0) {
            throw new Error(`No catalogs found for type '${type}'.`);
        }

        // Need Base URL
        let baseUrl = manifestUrl.replace("/manifest.json", "");
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

        // 3. Fetch All Sections Parallel
        const results = await Promise.all(
            sectionCatalogs.map(cat => fetchCatalog(baseUrl, cat, type, language))
        );

        // Filter out failed sections
        const sections = results.filter(s => s && s.items.length > 0);

        return sections;

    } catch (error) {
        console.error("Stremio Addon Error:", error);
        throw error;
    }
}
