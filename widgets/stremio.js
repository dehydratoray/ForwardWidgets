/**
 * Stremio Addon Client
 * Allows fetching streams from your AioStream addon.
 */
var WidgetMetadata = {
  id: "forward.stremio",
  title: "Stremio Client",
  version: "1.0.2",
  requiredVersion: "0.0.1",
  description: "Fetch streams from Stremio Addons",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  icon: "https://stremio.com/website/stremio-logo-small.png",
  modules: [
    {
      // Using 'getResource' as suggested by demo comments
      id: "getResource",
      title: "Load Streams",
      functionName: "loadResource",
      type: "stream",
      params: []
    }
  ],
};

async function loadResource(params) {
  console.log("Stremio Widget: Started loadResource");
  
  var addonUrl = "https://aio.lootah.app/stremio/2fdb409b-6f1d-422d-8726-f8b803d86340/eyJpIjoicjZtcXNxTEhFYnNNVWRHNUZsM3ZjQT09IiwiZSI6Ikh0Z0dJREpmVmNhSytNM2R5TDhkaHpRQ1JzOUd4Qis0OWtadksvckxzUlU9IiwidCI6ImEifQ";
  
  var imdbId = params.imdbId;
  var type = params.type;
  var season = params.season;
  var episode = params.episode;
  var tmdbId = params.tmdbId;

  // 1. Prepare ID
  var stremioType = type === 'tv' ? 'series' : 'movie';
  var stremioId = imdbId;
  
  // Fallback to TMDB if IMDB is missing
  if (!stremioId && tmdbId) {
      stremioId = "tmdb:" + tmdbId;
  }

  if (!stremioId) {
      console.log("Stremio Widget: No ID found");
      return [];
  }

  if (stremioType === 'series') {
    var s = season || 1;
    var e = episode || 1;
    stremioId = stremioId + ":" + s + ":" + e;
  }

  // 2. Construct URL
  var baseUrl = addonUrl.replace(///manifest\.json$/, '').replace(///$/, '');
  var url = baseUrl + "/stream/" + stremioType + "/" + stremioId + ".json";

  console.log("Stremio Widget: Fetching " + url);

  try {
    var response = await Widget.http.get(url, {
      headers: {
        "User-Agent": "ForwardWidgets/1.0.0"
      }
    });

    if (!response || !response.data || !response.data.streams) {
      console.log("Stremio Widget: No streams in response");
      return [];
    }

    // 3. Map to Forward format
    var results = response.data.streams.map(function(stream) {
      var streamUrl = stream.url;
      if (!streamUrl && stream.infoHash) {
        streamUrl = "magnet:?xt=urn:btih:" + stream.infoHash;
      }
      
      var name = stream.name || "Stream";
      var description = stream.title ? stream.title.replace(/\n/g, " | ") : "Unknown Quality";

      return {
        name: name,
        description: description,
        url: streamUrl
      };
    });
    
    console.log("Stremio Widget: Found " + results.length + " streams");
    return results;

  } catch (error) {
    console.error("Stremio Widget Error: " + error.message);
    return [];
  }
}