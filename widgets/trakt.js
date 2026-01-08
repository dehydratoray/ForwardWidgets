
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
  modules: [
    {
      id: "trending_movies",
      title: "Trending Movies",
      functionName: "getTrendingMovies",
      params: [
        {
          name: "client_id",
          title: "Client ID",
          type: "input",
          description: "Your Trakt API Client ID",
          value: ""
        },
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "popular_movies",
      title: "Popular Movies",
      functionName: "getPopularMovies",
      params: [
        {
          name: "client_id",
          title: "Client ID",
          type: "input",
          description: "Your Trakt API Client ID",
          value: ""
        },
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "trending_shows",
      title: "Trending Shows",
      functionName: "getTrendingShows",
      params: [
        {
          name: "client_id",
          title: "Client ID",
          type: "input",
          description: "Your Trakt API Client ID",
          value: ""
        },
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "popular_shows",
      title: "Popular Shows",
      functionName: "getPopularShows",
      params: [
        {
          name: "client_id",
          title: "Client ID",
          type: "input",
          description: "Your Trakt API Client ID",
          value: ""
        },
        { name: "page", title: "Page", type: "page" }
      ]
    },
    {
      id: "load_list",
      title: "Load Custom List",
      functionName: "getCustomList",
      params: [
        {
          name: "url",
          title: "List URL",
          type: "input",
          description: "Trakt List URL (e.g., https://trakt.tv/users/official/lists/trending)",
          value: ""
        },
        {
          name: "client_id",
          title: "Client ID",
          type: "input",
          description: "Your Trakt API Client ID",
          value: ""
        },
        { name: "page", title: "Page", type: "page" }
      ]
    }
  ]
};

// --- Helper Functions ---

async function fetchTrakt(endpoint, params) {
  const clientId = params.client_id;
  
  if (!clientId) {
    throw new Error("Please provide your Trakt Client ID.");
  }

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

  const response = await Widget.http.get(url, options);
  if (!response || !response.data) throw new Error("Failed to fetch data from Trakt.");
  return response.data;
}

function mapTraktItemsToForward(items, type) {
  return items.map(item => {
    const data = item.movie || item.show || item;
    const mediaType = item.movie ? "movie" : (item.show ? "tv" : type);
    const tmdbId = data.ids.tmdb;
    if (!tmdbId) return null;

    return {
      id: tmdbId, 
      type: "tmdb",
      title: data.title,
      description: data.overview,
      year: data.year,
      releaseDate: data.released || data.first_aired,
      rating: data.rating,
      mediaType: mediaType,
    };
  }).filter(Boolean);
}

// Fetch images from TMDB for a list of items
async function fetchTmdbImages(items) {
  const promises = items.map(async (item) => {
    if (!item || !item.id) return item;

    try {
      // Use the item's media type (movie/tv) and ID to query TMDB
      // Widget.tmdb.get uses the app's internal TMDB client
      const response = await Widget.tmdb.get(`${item.mediaType}/${item.id}`, {});
      
      if (response) {
        // TMDB returns relative paths, e.g., "/path.jpg"
        // The app usually handles the base URL for these.
        if (response.poster_path) item.posterPath = response.poster_path;
        if (response.backdrop_path) item.backdropPath = response.backdrop_path;
        
        // Optional: Enhance other metadata if TMDB has better data
        if (response.overview && !item.description) item.description = response.overview;
      }
    } catch (e) {
      // Quietly fail for individual items to keep the list functional
      // console.log(`Failed to load TMDB image for ${item.title}: ${e.message}`);
    }
    return item;
  });

  return await Promise.all(promises);
}

// --- Main Functions ---

async function getTrendingMovies(params) {
  const data = await fetchTrakt("/movies/trending", params); 
  const items = mapTraktItemsToForward(data, "movie");
  return await fetchTmdbImages(items);
}

async function getPopularMovies(params) {
  const data = await fetchTrakt("/movies/popular", params);
  const items = mapTraktItemsToForward(data, "movie");
  return await fetchTmdbImages(items);
}

async function getTrendingShows(params) {
  const data = await fetchTrakt("/shows/trending", params);
  const items = mapTraktItemsToForward(data, "tv");
  return await fetchTmdbImages(items);
}

async function getPopularShows(params) {
  const data = await fetchTrakt("/shows/popular", params);
  const items = mapTraktItemsToForward(data, "tv");
  return await fetchTmdbImages(items);
}

async function getCustomList(params) {
    const urlInput = params.url;
    if (!urlInput) throw new Error("Please provide a Trakt List URL.");
    const match = urlInput.match(/users\/([^\/]+)\/lists\/([^\/]+)/);
    if (!match) throw new Error("Invalid Trakt List URL.");
    const user = match[1];
    const list = match[2];
    const data = await fetchTrakt(`/users/${user}/lists/${list}/items`, params);
    const items = mapTraktItemsToForward(data, "movie");
    return await fetchTmdbImages(items);
}
