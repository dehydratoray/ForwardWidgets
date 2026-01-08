
WidgetMetadata = {
  id: "forward.introdb",
  title: "IntroDB",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "自动获取剧集片头时间（Skip Intro）",
  author: "Forward",
  site: "https://introdb.app",
  modules: [
    {
      id: "skipIntro", // 约定 ID，用于播放器识别
      title: "获取跳过片头时间",
      functionName: "getIntroTimestamps",
      type: "stream", // 使用 stream 类型以自动接收视频元数据
      params: []
    }
  ]
};

/**
 * 获取视频的片头时间点
 * @param {Object} params - 由播放器自动传入的参数
 * @param {string} params.imdbId - IMDb ID (e.g., tt0944947)
 * @param {number} params.season - 季号
 * @param {number} params.episode - 集号
 */
async function getIntroTimestamps(params) {
  const { imdbId, season, episode } = params;

  // 必须有 IMDb ID 才能从 IntroDB 获取数据
  if (!imdbId) {
    console.log("[IntroDB] 缺少 IMDb ID，跳过查询");
    return null;
  }

  const url = `http://api.introdb.app/intro`;
  
  try {
    console.log(`[IntroDB] 正在查询 S${season}E${episode} (IMDb: ${imdbId})`);
    
    const response = await Widget.http.get(url, {
      params: {
        imdb_id: imdbId,
        season: season,
        episode: episode
      }
    });

    if (response && response.data) {
      const data = response.data;
      
      // 返回标准格式的时间戳（毫秒）
      return {
        start: data.start_ms,
        end: data.end_ms,
        confidence: data.confidence,
        source: "IntroDB"
      };
    }
  } catch (error) {
    // 404 是常见情况（该集暂无数据），静默失败
    if (error.response && error.response.status === 404) {
      console.log("[IntroDB] 该集暂无片头数据");
    } else {
      console.error("[IntroDB] 请求失败:", error.message);
    }
  }

  return null;
}
