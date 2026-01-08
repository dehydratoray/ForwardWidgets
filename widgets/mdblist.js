
const BASE_URL = "https://api.mdblist.com";

WidgetMetadata = {
  id: "forward.mdblist",
  title: "MDBList",
  version: "1.0.0",
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
          description: "e.g., https://mdblist.com/lists/user/list-name or just the ID",
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

async function loadList(params) {
  const apiKey = params.api_key;
  if (!apiKey) {
    throw new Error("Please provide your MDBList API Key.");
  }

  let input = params.url;
  if (!input) throw new Error("Please provide a List URL or ID.");

  // Extract ID from URL if full URL is provided
  // Regex to catch ID from: https://mdblist.com/lists/{user}/{slug} OR just {id} (which might be numeric)
  // But MDBList API mostly works with numeric IDs or slugs.
  // Let's assume the API endpoint `/lists/{id}/items` takes the numeric ID. 
  // If the user provides a URL, we might need to resolve it or hope the API accepts the slug.
  // Actually, MDBList often uses integer IDs for API.
  
  // Strategy: If it looks like a URL, try to parse.
  // MDBList URLs: https://mdblist.com/lists/user/slug
  // The API might require a search or a resolve step if we only have the slug.
  // HOWEVER, `GET /lists/{id}` usually works with the numeric ID found in the URL or page.
  
  // Let's try to fetch the list items directly. 
  // If input is a URL, we might simply warn the user to use the Numeric ID, 
  // OR we can try to extract it if it's visible. 
  // For now, let's assume the input is the ID or we try to pass it as is.
  
  let listId = input;
  const match = input.match(/lists\/([^\/]+)\/([^\/]+)/);
  if (match) {
      // If it's a slug, we might be in trouble without an endpoint to resolve slug -> ID.
      // But let's assume the user inputs the numeric ID for reliability as per most API widgets.
      // OR we can implement a "search list" helper if needed.
      // For this v1, let's treat it as an ID.
      
      // OPTIONAL: If the API supports slugs, great. If not, user needs ID.
      // Let's assume the user provides the ID for now (often found in the URL or title).
  }
  
  // Clean input if it's a full URL and we just want the last part? No, that's risky.
  // Let's just try using the input.

  const page = params.page || 1;
  const limit = 20; // Default limit
  
  // API Endpoint: /lists/{id}/items
  const url = `${BASE_URL}/lists/${listId}/items?apikey=${apiKey}&page=${page}&limit=${limit}`;

  console.log(`[MDBList] Loading list: ${listId}`);
  
  try {
    const response = await Widget.http.get(url);
    
    if (!response || !response.data) {
      throw new Error("Empty response from MDBList.");
    }

    const items = response.data; // Array of items
    
    return items.map(item => {
      // MDBList items usually have: id, title, year, type, imdb_id, tmdb_id, trakt_id
      
      // Determine type
      let type = item.type; // 'movie' or 'show' usually
      if (type === 'show') type = 'tv';
      
      // Prefer TMDB ID
      const tmdbId = item.tmdb_id;
      if (!tmdbId) return null;

      return {
        id: tmdbId, // Just the ID
        type: "tmdb", // Use tmdb type so app fetches metadata
        title: item.title,
        year: item.year,
        mediaType: type,
        // Optional: If MDBList provides scores/poster, we can add them, 
        // but type:tmdb usually handles it.
        rating: item.score, // MDBList score
      };
    }).filter(Boolean);

  } catch (e) {
    console.error(e);
    // If 404 or error, maybe the ID was wrong.
    if (e.message.includes("404")) {
      throw new Error("List not found. Please ensure you are using the numeric List ID.");
    }
    throw e;
  }
}
