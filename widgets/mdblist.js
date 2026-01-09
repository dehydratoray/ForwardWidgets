const BASE_URL = "https://api.mdblist.com";

WidgetMetadata = {
  id: "forward.mdblist",
  title: "MDBList",
  version: "1.0.1",
  requiredVersion: "0.0.1",
  description: "Load custom lists from MDBList.com",
  author: "Forward",
  site: "https://mdblist.com",
  icon: "https://mdblist.com/assets/img/logo_square.png",
  modules: [
    {
      id: "loadList",
      title: "Load List",
      functionName: "loadList",
      params: [
        { 
          name: "url", 
          title: "List URL or ID", 
          type: "input",
          description: "Paste the full URL or the numeric ID",
          placeholders: [
             { title: "Top 100 Movies", value: "https://mdblist.com/lists/linaspurinis/top-100-movies" }
          ]
        },
        {
          name: "api_key",
          title: "API Key",
          type: "input",
          description: "Your MDBList API Key",
          value: ""
        },
        { name: "page", title: "Page", type: "page" }
      ]
    }
  ]
};

// --- Helper: Fetch Images from TMDB ---
// Copied from Trakt widget to ensure images load reliably
async function fetchTmdbImages(items) {
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (item) => {
      if (!item || !item.id) return item;

      try {
        const response = await Widget.tmdb.get(`${item.mediaType}/${item.id}`, {});
        
        if (response) {
          if (response.poster_path) item.posterPath = response.poster_path;
          if (response.backdrop_path) item.backdropPath = response.backdrop_path;
          if (response.overview && !item.description) item.description = response.overview;
        }
      } catch (e) {
        // Ignore errors
      }
      return item;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

// --- Main Logic ---

async function loadList(params) {
  const apiKey = params.api_key;
  if (!apiKey) {
    throw new Error("Please provide your MDBList API Key.");
  }

  let listId = params.url;
  if (!listId) throw new Error("Please provide a List URL or ID.");

  // If input looks like a URL, try to scrape the numeric ID
  if (listId.includes("mdblist.com")) {
    console.log(`[MDBList] Resolving URL: ${listId}`);
    try {
      // 1. Check if the URL already contains the numeric ID (e.g., /lists/12345)
      const numericMatch = listId.match(/lists\/(\d+)/);
      if (numericMatch) {
        listId = numericMatch[1];
        console.log(`[MDBList] Found numeric ID in URL: ${listId}`);
      } else {
        // 2. Fetch page to find ID in meta tags
        const pageHtml = await Widget.http.get(listId);
        
        // Look for: list.jpg?id=2194
        const idMatch = pageHtml.data.match(/list\.jpg\?id=(\d+)/);
        if (idMatch) {
          listId = idMatch[1];
          console.log(`[MDBList] Scraped ID from page: ${listId}`);
        } else {
          // Fallback: Try searching for "list_id": 1234 pattern or similar if they change meta
          console.warn("[MDBList] Could not auto-detect ID from URL. Using raw input.");
        }
      }
    } catch (e) {
      console.warn("[MDBList] Failed to resolve URL. Trying raw input.", e);
    }
  }

  const page = params.page || 1;
  const limit = 40; // Increased limit
  
  // API Endpoint: /lists/{id}/items
  const url = `${BASE_URL}/lists/${listId}/items?apikey=${apiKey}&page=${page}&limit=${limit}`;

  console.log(`[MDBList] Fetching API: ${url}`);
  
  try {
    const response = await Widget.http.get(url);
    
    if (!response || !response.data) {
      throw new Error("Empty response from MDBList.");
    }

    const rawItems = response.data; // Array of items
    
    const items = rawItems.map(item => {
      let type = item.type; // 'movie' or 'show'
      if (type === 'show') type = 'tv';
      
      const tmdbId = item.tmdb_id;
      if (!tmdbId) return null;

      return {
        id: tmdbId, 
        type: "tmdb",
        title: item.title,
        year: item.year,
        mediaType: type,
        rating: item.score,
      };
    }).filter(Boolean);

    // Enhance with TMDB images
    return await fetchTmdbImages(items);

  } catch (e) {
    if (e.message.includes("404")) {
      throw new Error("List not found. If using a URL, try extracting the numeric ID manually (e.g., 2194).");
    }
    throw e;
  }
}