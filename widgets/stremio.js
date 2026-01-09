console.log("Loading Stremio Widget...");

WidgetMetadata = {
    id: "forward.stremio.catalog",
    title: "Stremio Catalog",
    version: "1.0.7",
    requiredVersion: "0.0.1",
    description: "Load movies and shows from AIO Metadata Addon (supports merged views)",
    author: "Forward",
    site: "https://stremio.com",
    icon: "https://stremio.com/website/stremio-logo-small.png",
    modules: [
        {
            id: "loadCatalog",
            title: "Load Catalog",
            functionName: "loadCatalog",
            params: [
                {
                    name: "manifestUrl",
                    title: "Addon Manifest URL",
                    type: "input",
                    description: "URL to the addon manifest",
                    value: "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7/manifest.json",
                    placeholders: [
                        { title: "AIO Metadata (Custom)", value: "https://aiometadatafortheweak.nhyira.dev/stremio/7e79368f-22da-4379-8291-45702e84bec7/manifest.json" },
                        { title: "Cinemeta (Official)", value: "https://v3-cinemeta.strem.io/manifest.json" }
                    ]
                },
                {
                    name: "page",
                    title: "Page",
                    type: "page"
                },
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "series" }
                    ],
                    defaultValue: "movie",
                    description: "Media Type (Ignored for Merged lists)"
                },
                {
                    name: "catalogId",
                    title: "Catalog",
                    type: "enumeration",
                    description: "Select a catalog. 'Merged' lists include both Movies & TV.",
                    defaultValue: "mdblist.15194",
                    enumOptions: [
                        // --- Single Catalogs ---
                        { "title": "Top Movies - Paramount Plus (Movies)", "value": "mdblist.89366" },
                        { "title": "Top TV Shows - Paramount Plus (TV)", "value": "mdblist.89374" },
                        { "title": "Peacock Movies (Movies)", "value": "mdblist.83487" },
                        { "title": "Peacock Shows (TV)", "value": "mdblist.83484" },
                        { "title": "Latest Amazon Prime Movies (Movies)", "value": "mdblist.86755" },
                        { "title": "Latest Amazon Prime TV Shows (TV)", "value": "mdblist.86753" },
                        { "title": "Trakt's Trending Movies (Movies)", "value": "mdblist.87667" },
                        { "title": "Trakt's Trending Shows (TV)", "value": "mdblist.88434" },
                        { "title": "Action Movies (Movies)", "value": "mdblist.91211" },
                        { "title": "Action Shows (TV)", "value": "mdblist.91213" },
                        { "title": "Adventure (Movies)", "value": "mdblist.115239" },
                        { "title": "Animated Movies (Movies)", "value": "mdblist.116037" },
                        { "title": "Animated Shows (TV)", "value": "mdblist.116038" },
                        { "title": "Comedy Movies (Movies)", "value": "mdblist.91223" },
                        { "title": "Comedy Shows (TV)", "value": "mdblist.91224" },
                        { "title": "Crime (Movies)", "value": "mdblist.3108" },
                        { "title": "Crime Shows (TV)", "value": "mdblist.3126" },
                        { "title": "Top Documentaries (Movies) (Movies)", "value": "mdblist.84677" },
                        { "title": "Top Documentaries (Shows) (TV)", "value": "mdblist.84403" },
                        { "title": "Drama Movies (Movies)", "value": "mdblist.91296" },
                        { "title": "Drama Shows (TV)", "value": "mdblist.91297" },
                        { "title": "Fantasy (Movies)", "value": "mdblist.124154" },
                        { "title": "History (Movies)", "value": "mdblist.3109" },
                        { "title": "Horror Movies (Movies)", "value": "mdblist.91215" },
                        { "title": "Horror Shows (TV)", "value": "mdblist.91217" },
                        { "title": "Musical (Movies)", "value": "mdblist.58356" },
                        { "title": "Mystery (Movies)", "value": "mdblist.122867" },
                        { "title": "Romance (Movies)", "value": "mdblist.124151" },
                        { "title": "Sci-Fi Movies (Movies)", "value": "mdblist.91220" },
                        { "title": "Sci-Fi Shows (TV)", "value": "mdblist.91221" },
                        { "title": "Thriller Movies (Movies)", "value": "mdblist.91893" },
                        { "title": "Thriller Shows (TV)", "value": "mdblist.91894" },
                        { "title": "War (Movies)", "value": "mdblist.124146" },
                        { "title": "Avatar (Movies)", "value": "mdblist.29466" },
                        { "title": "Back to the Future (Movies)", "value": "mdblist.76999" },
                        { "title": "Universe - Dune (TV)", "value": "mdblist.125119" },
                        { "title": "Fast and Furious (Movies)", "value": "mdblist.59631" },
                        { "title": "Harry Potter (TV)", "value": "mdblist.105063" },
                        { "title": "Hunger Games (Movies)", "value": "mdblist.31326" },
                        { "title": "Universe - Indiana Jones (TV)", "value": "mdblist.125120" },
                        { "title": "James Bond Movies (Movies)", "value": "mdblist.7947" },
                        { "title": "John Wick Universe (TV)", "value": "mdblist.104199" },
                        { "title": "Universe - Jurassic Park (TV)", "value": "mdblist.125146" },
                        { "title": "Lord of the Rings and Hobbit Collection (Movies)", "value": "mdblist.94304" },
                        { "title": "Marvel Universe (Movies)", "value": "mdblist.3022" },
                        { "title": "The Matrix (TV)", "value": "mdblist.98353" },
                        { "title": "Mission Impossible (Movies)", "value": "mdblist.31309" },
                        { "title": "Monsterverse (TV)", "value": "mdblist.100279" },
                        { "title": "Pirates of the Caribbean (TV)", "value": "mdblist.37615" },
                        { "title": "Rambo (Movies)", "value": "mdblist.31324" },
                        { "title": "Rocky / Creed (TV)", "value": "mdblist.16826" },
                        { "title": "Star Trek (TV)", "value": "mdblist.100344" },
                        { "title": "Universe - Star Wars (Complete) (TV)", "value": "mdblist.125115" },
                        { "title": "Transformers ALL (Movies)", "value": "mdblist.8682" },
                        { "title": "Universe - X-Men (TV)", "value": "mdblist.125145" },
                        { "title": "DC Universe (Movies)", "value": "mdblist.3021" },
                        { "title": "Dreamworks (Movies)", "value": "mdblist.104400" },
                        { "title": "Lionsgate (Movies)", "value": "mdblist.3471" },
                        { "title": "Marvel Studios (Movies)", "value": "mdblist.117123" },
                        { "title": "Universal Pictures Productions (Movies)", "value": "mdblist.63219" },
                        { "title": "Walt Disney Studios (Movies)", "value": "mdblist.98506" },
                        { "title": "Warner (Movies)", "value": "mdblist.3481" },
                        { "title": "DreamWorks Animation (Movies)", "value": "mdblist.12833" },
                        { "title": "Illumination Entertainment (Movies)", "value": "mdblist.12840" },
                        { "title": "Pixar (Movies)", "value": "mdblist.12834" },
                        { "title": "Sony Pictures Animation (Movies)", "value": "mdblist.12837" },
                        { "title": "Blue Sky Studios (Movies)", "value": "mdblist.12832" },
                        { "title": "Walt Disney Animation (Movies)", "value": "mdblist.98502" },
                        { "title": "Warner Brothers Animation (Movies)", "value": "mdblist.12838" },
                        { "title": "Popular 1980s Movies (Movies)", "value": "mdblist.91301" },
                        { "title": "Popular 1990s Movies (Movies)", "value": "mdblist.91300" },
                        { "title": "Popular 2000s Movies (Movies)", "value": "mdblist.91302" },
                        { "title": "Popular 2010s Movies (Movies)", "value": "mdblist.91303" },
                        { "title": "Popular 2020s Movies (Movies)", "value": "mdblist.91304" },
                        { "title": "Actor - Adam Sandler (Movies)", "value": "mdblist.2628" },
                        { "title": "Arnold Schwarzenegger (Movies)", "value": "mdblist.59317" },
                        { "title": "Christian Bale (Movies)", "value": "mdblist.57202" },
                        { "title": "Clint Eastwood Westerns (Movies)", "value": "mdblist.9882" },
                        { "title": "Denzel Washington (Movies)", "value": "mdblist.57180" },
                        { "title": "dwayne johnson (Movies)", "value": "mdblist.61518" },
                        { "title": "Harrison Ford List (Movies)", "value": "mdblist.86506" },
                        { "title": "Jackie Chan List Movies (Movies)", "value": "mdblist.7227" },
                        { "title": "Jason Statham (Movies)", "value": "mdblist.41676" },
                        { "title": "Matt Damon (Movies)", "value": "mdblist.57205" },
                        { "title": "Morgan Freeman (Movies)", "value": "mdblist.57185" },
                        { "title": "Nicolas Cage (Movies)", "value": "mdblist.1729" },
                        { "title": "Robert Downey Jr (Movies)", "value": "mdblist.57218" },
                        { "title": "Robin Williams (Movies)", "value": "mdblist.8677" },
                        { "title": "Ryan Reynolds movies (Movies)", "value": "mdblist.37441" },
                        { "title": "Samuel L Jackson (Movies)", "value": "mdblist.57222" },
                        { "title": "Sylvester Stallone (Movies)", "value": "mdblist.64730" },
                        { "title": "Tom Cruise (Movies)", "value": "mdblist.15194" },
                        { "title": "Alfred Hitchcock (Movies)", "value": "mdblist.91031" },
                        { "title": "Brian De Palma (Movies)", "value": "mdblist.91034" },
                        { "title": "Christopher Nolan (Movies)", "value": "mdblist.91024" },
                        { "title": "David Fincher (Movies)", "value": "mdblist.91029" },
                        { "title": "Denis Villeneuve (Movies)", "value": "mdblist.91033" },
                        { "title": "John Carpenter (Movies)", "value": "mdblist.91035" },
                        { "title": "Martin Scorsese (Movies)", "value": "mdblist.91025" },
                        { "title": "Paul Thomas Anderson (Movies)", "value": "mdblist.91032" },
                        { "title": "Stanley Kubrick (Movies)", "value": "mdblist.91028" },
                        { "title": "Steven Spielberg (Movies)", "value": "mdblist.91027" },

                        // --- Merged Catalogs (Beneath Everything) ---
                        { "title": "Merged: Disney+ (Movies & TV)", "value": "mdblist.86945|mdblist.86946" },
                        { "title": "Merged: HBO Max (Movies & TV)", "value": "mdblist.89392|mdblist.89310" },
                        { "title": "Merged: Hulu (Movies & TV)", "value": "mdblist.88326|mdblist.88327" },
                        { "title": "Merged: Netflix (Movies & TV)", "value": "mdblist.86628|mdblist.86620" },
                        { "title": "Merged: Paramount+ (Movies & TV)", "value": "mdblist.89366|mdblist.89374" },
                        { "title": "Merged: Peacock (Movies & TV)", "value": "mdblist.83487|mdblist.83484" },
                        { "title": "Merged: Amazon Prime (Movies & TV)", "value": "mdblist.86755|mdblist.86753" },
                        { "title": "Merged: Apple TV+ (Movies & TV)", "value": "mdblist.86626|mdblist.86625" },
                        { "title": "Merged: Action (Movies & TV)", "value": "mdblist.91211|mdblist.91213" },
                        { "title": "Merged: Animated (Movies & TV)", "value": "mdblist.116037|mdblist.116038" },
                        { "title": "Merged: Comedy (Movies & TV)", "value": "mdblist.91223|mdblist.91224" },
                        { "title": "Merged: Crime (Movies & TV)", "value": "mdblist.3108|mdblist.3126" },
                        { "title": "Merged: Drama (Movies & TV)", "value": "mdblist.91296|mdblist.91297" },
                        { "title": "Merged: Horror (Movies & TV)", "value": "mdblist.91215|mdblist.91217" },
                        { "title": "Merged: Sci-Fi (Movies & TV)", "value": "mdblist.91220|mdblist.91221" },
                        { "title": "Merged: Thriller (Movies & TV)", "value": "mdblist.91893|mdblist.91894" }
                    ]
                }
            ]
        }
    ]
};

// --- Helper: Enrich with TMDB Metadata ---
async function enrichWithTmdb(items) {
    const BATCH_SIZE = 5;
    const results = [];
    let debugLogged = false;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (item) => {
            if (!item || !item.id) return item;

            try {
                let tmdbData = null;

                // Case 1: Convert IMDB ID to TMDB Metadata
                if (item.sourceType === 'imdb') {
                    const findUrl = `find/${item.id}`; // e.g. find/tt1234567
                    const response = await Widget.tmdb.get(findUrl, {
                        params: { external_source: 'imdb_id' }
                    });

                    if (!debugLogged && response) {
                        console.log("[Stremio] Sample TMDB Response Keys:", Object.keys(response));
                        debugLogged = true;
                    }

                    if (response) {
                        // Check movie_results or tv_results
                        const tmdbResults = item.mediaType === 'movie' ? response.movie_results : response.tv_results;
                        if (tmdbResults && tmdbResults.length > 0) {
                            tmdbData = tmdbResults[0];
                        } else {
                            // Only log misses if we really care, to reduce noise
                            // console.log(`[Stremio] No TMDB match found for ${item.id} (${item.mediaType})`);
                        }
                    }
                }
                // Case 2: Already has TMDB ID (if we supported that)
                else if (item.sourceType === 'tmdb') {
                    tmdbData = await Widget.tmdb.get(`${item.mediaType}/${item.id}`, {});
                }

                // Apply TMDB Data if found
                if (tmdbData) {
                    item.id = tmdbData.id; // Switch to TMDB Numeric ID
                    item.type = 'tmdb';    // Switch type to TMDB

                    // Update metadata
                    if (tmdbData.title || tmdbData.name) item.title = tmdbData.title || tmdbData.name;
                    if (tmdbData.poster_path) item.posterPath = tmdbData.poster_path;
                    if (tmdbData.backdrop_path) item.backdropPath = tmdbData.backdrop_path;
                    if (tmdbData.overview) item.description = tmdbData.overview;
                    if (tmdbData.vote_average) item.rating = tmdbData.vote_average;
                    if (tmdbData.release_date || tmdbData.first_air_date) item.releaseDate = tmdbData.release_date || tmdbData.first_air_date;

                    console.log(`[Stremio] Resolved ${item.sourceType} ${item.id} -> TMDB ${tmdbData.id}`);
                } else {
                    console.warn(`[Stremio] Keeping original item for ${item.id} (Enrichment failed)`);
                }

            } catch (e) {
                console.warn(`[Stremio] Failed to enrich item ${item.id}:`, e);
            }
            return item;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}


// --- Helper: Fetch Single Catalog ---
async function fetchCatalog(baseUrl, type, id, skip = 0) {
    let url = `${baseUrl}/catalog/${type}/${id}`;
    if (skip > 0) {
        url += `/skip=${skip}`;
    }
    url += `.json`;

    console.log(`[Stremio] Fetching ${type}: ${url}`);

    try {
        const response = await Widget.http.get(url);
        // Handle wrapper
        const metas = (response.data && response.data.metas) ? response.data.metas : (response.metas || []);

        return metas.map(meta => {
            let itemType = 'movie';
            if (type === 'series' || meta.type === 'series') itemType = 'tv';

            const item = {
                title: meta.name,
                year: parseInt(meta.releaseInfo) || parseInt(meta.year),
                mediaType: itemType,
                posterPath: meta.poster,
                backdropPath: meta.background,
                description: meta.description,
                rating: meta.imdbRating,
                sourceType: 'unknown'
            };

            if (meta.id) {
                if (String(meta.id).startsWith('tt')) {
                    item.id = meta.id;
                    item.type = 'imdb';
                    item.sourceType = 'imdb';
                } else if (!isNaN(meta.id)) {
                    item.id = meta.id;
                    item.type = 'tmdb';
                    item.sourceType = 'tmdb';
                } else {
                    item.id = meta.id;
                    item.type = 'imdb';
                    item.sourceType = 'imdb';
                }
            } else {
                return null;
            }
            return item;
        }).filter(Boolean);
    } catch (e) {
        console.error(`[Stremio] Error fetching ${type} ${id}:`, e);
        return [];
    }
}


async function loadCatalog(params) {
    console.log("Stremio loadCatalog called with:", JSON.stringify(params));
    const { manifestUrl, type, catalogId, page } = params;
    const skip = (page && page > 1) ? (page - 1) * 50 : 0;
    // Assuming default Stremio item count is ~50-100. 50 is a safe bet based on user report.

    if (!manifestUrl) throw new Error("Manifest URL is required");
    const baseUrl = manifestUrl.replace('/manifest.json', '');

    // Check for Merged Catalog (contains Pipe |)
    if (catalogId.includes('|')) {
        const [_movie, _series] = catalogId.split('|'); // Assuming format movieId|seriesId
        // We ignore the 'type' param since we are forcing both
        console.log(`[Stremio] Detected Merged Request: ${_movie} & ${_series} (Skip: ${skip})`);

        const [movies, shows] = await Promise.all([
            fetchCatalog(baseUrl, 'movie', _movie, skip),
            fetchCatalog(baseUrl, 'series', _series, skip)
        ]);

        console.log(`[Stremio] Merged Results: ${movies.length} movies, ${shows.length} shows`);

        // Interleave results
        const combined = [];
        const maxLength = Math.max(movies.length, shows.length);
        for (let i = 0; i < maxLength; i++) {
            if (i < movies.length) combined.push(movies[i]);
            if (i < shows.length) combined.push(shows[i]);
        }

        return await enrichWithTmdb(combined);
    }

    // Standard Single Catalog
    else {
        console.log(`[Stremio] Standard Request: ${type} / ${catalogId} (Skip: ${skip})`);
        const items = await fetchCatalog(baseUrl, type, catalogId, skip);
        return await enrichWithTmdb(items);
    }
}
