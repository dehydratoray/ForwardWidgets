
const TRAKT_API_URL = "https://api.trakt.tv";

WidgetMetadata = {
  id: "forward.trakt",
  title: "Trakt",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "Browse Trending and Popular movies/shows from Trakt.tv",
  author: "Forward",
  site: "https://trakt.tv",
  icon: "https://trakt.tv/assets/logos/header@2x-d6926a2c93734beeaf3c58f8776e31a6.png",
  globalParams: [
    {
      name: "client_id",
      title: "Client ID",
      type: "input",
      description: "Your Trakt API Client ID (from https://trakt.tv/oauth/applications)",
      value: "", 
    }
  ],
  modules: [
    {
      id: "trending_movies",
      title: "Trending Movies",
      functionName: "getTrendingMovies",
      params: [
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "popular_movies",
      title: "Popular Movies",
      functionName: "getPopularMovies",
      params: [
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "trending_shows",
      title: "Trending Shows",
      functionName: "getTrendingShows",
      params: [
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "popular_shows",
      title: "Popular Shows",
      functionName: "getPopularShows",
      params: [
        { name: "page", title: "Page", type: "page" }
      ]
    }
  ]
};

// --- Helper Functions ---

async function fetchTrakt(endpoint, params, globalParams) {
  const clientId = globalParams.client_id;
  
  if (!clientId) {
    throw new Error("Please configure your Trakt Client ID in the widget settings.");
  }

  // Handle pagination
  const page = params.page || 1;
  const limit = 20;

  const url = `${TRAKT_API_URL}${endpoint}?page=${page}&limit=${limit}&extended=full`;

  const options = {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": clientId
    }
  };

  console.log(`[Trakt] Fetching: ${url}`);
  const response = await Widget.http.get(url, options);
  
  if (!response || !response.data) {
    throw new Error("Failed to fetch data from Trakt.");
  }

  return response.data;
}

function mapTraktItemsToForward(items, type) {
  return items.map(item => {
    // Trending/Anticipated endpoints wrap the object in a 'movie' or 'show' property.
    // Popular endpoints return the object directly.
    const data = item.movie || item.show || item;
    
    // Determine media type if not explicitly known (fallback)
    const mediaType = item.movie ? "movie" : (item.show ? "tv" : type);
    
    // We prefer the TMDB ID so the app can auto-load metadata/images
    const tmdbId = data.ids.tmdb;

    if (!tmdbId) {
        return null; // Skip items without TMDB ID
    }

    return {
      id: `${mediaType}.${tmdbId}`, // Format accepted by some players or just simple ID if type is strictly 'tmdb'
      // By setting type to 'tmdb', standard Forward clients will try to look up details using the ID.
      // Usually Forward expects just the numeric ID for 'tmdb' type if mediaType is specified,
      // but let's stick to the convention seen in other files or just pass the ID.
      // Looking at tmdb.js: id: item.id (numeric), type: "tmdb", mediaType: "movie"|"tv".
      id: tmdbId, 
      type: "tmdb",
      title: data.title,
      description: data.overview,
      year: data.year,
      releaseDate: data.released || data.first_aired,
      rating: data.rating, // Trakt rating (0-10)
      mediaType: mediaType,
      // Trakt doesn't always provide full image paths in list views without extra calls.
      // By using type: 'tmdb' and a valid tmdbId, the App *should* attempt to fetch images itself 
      // or we might need to rely on the app's cache. 
      // If the app requires us to provide images, we would need to fetch them from TMDB or Fanart.tv 
      // (which requires another key). For now, we rely on the ID linkage.
    };
  }).filter(Boolean);
}

// --- Exported Functions ---

async function getTrendingMovies(params) {
  // Access global params (like client_id) which are merged into params by the app usually,
  // or we need to access them differently. 
  // *Assumption*: The app merges global params into the `params` object passed to the function.
  // If not, we might need a way to access global config. 
  // Based on README: "params object as a parameter containing all configured parameter values."
  const data = await fetchTrakt("/movies/trending", params, params); 
  return mapTraktItemsToForward(data, "movie");
}

async function getPopularMovies(params) {
  const data = await fetchTrakt("/movies/popular", params, params);
  return mapTraktItemsToForward(data, "movie");
}

async function getTrendingShows(params) {
  const data = await fetchTrakt("/shows/trending", params, params);
  return mapTraktItemsToForward(data, "tv");
}

async function getPopularShows(params) {
  const data = await fetchTrakt("/shows/popular", params, params);
  return mapTraktItemsToForward(data, "tv");
}
