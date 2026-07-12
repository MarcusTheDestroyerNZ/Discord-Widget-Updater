import "dotenv/config";
import { SteamData } from "./types.js";

const STEAM_API_BASE = "https://api.steampowered.com";

// Helper for Steam API calls
async function steamGet(path: string, params: Record<string, string>) {
  const url = new URL(`${STEAM_API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// Restored: Concurrency helper to prevent API timeouts/blocks
async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const task = (async () => { results.push(await mapper(item)); })();
    executing.add(task);
    task.finally(() => executing.delete(task));
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
  return results;
}

export async function getCleanSteamData(steamId: string): Promise<SteamData> {
  const apiKey = process.env.STEAM_WEB_API_KEY!;

  const [profileRes, gamesRes] = await Promise.all([
    steamGet("/ISteamUser/GetPlayerSummaries/v2/", { key: apiKey, steamids: steamId }),
    steamGet("/IPlayerService/GetOwnedGames/v1/", { key: apiKey, steamid: steamId, include_appinfo: "true", include_played_free_games: "true" })
  ]);

  const player = profileRes.response.players[0];
  const allGames = gamesRes.response.games || [];

  // Sorting logic for widgets
  const sortedByRecent = [...allGames].sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0));
  const sortedByTime = [...allGames].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
  
  const recentGameRaw = sortedByRecent[0];
  const topPlayedRaw = sortedByTime[0];
  const isCurrentlyPlaying = player.gameid === String(recentGameRaw?.appid);

  const totalMinutes = allGames.reduce((acc: number, g: any) => acc + (g.playtime_forever || 0), 0);

  // --- RESTORED DEEP SCAN LOGIC ---
  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);

  const playedGames = allGames.filter((g: any) => g.playtime_forever > 0);
  
  const gameStats = await mapWithConcurrency(playedGames, 4, async (game) => {
    try {
      // Get both User achievements and the Game's official schema
      const [achRes, schemaRes] = await Promise.all([
        steamGet("/ISteamUserStats/GetPlayerAchievements/v1/", { key: apiKey, steamid: steamId, appid: game.appid }),
        steamGet("/ISteamUserStats/GetSchemaForGame/v2/", { key: apiKey, appid: game.appid })
      ]);

      const userAchievements = achRes?.playerstats?.achievements || [];
      const schemaAchievements = schemaRes?.game?.availableGameStats?.achievements || [];

      if (schemaAchievements.length === 0) return null;

      const unlocked = userAchievements.filter((a: any) => a.achieved === 1);
      const isCompleted = unlocked.length === schemaAchievements.length;
      
      let isCompletedThisMonth = false;
      if (isCompleted && unlocked.length > 0) {
        const lastUnlock = Math.max(...unlocked.map((a: any) => a.unlocktime || 0));
        isCompletedThisMonth = (lastUnlock * 1000 >= currentMonthStart.getTime());
      }

      return {
        appid: game.appid,
        unlocked: unlocked.length,
        total: schemaAchievements.length,
        isCompleted,
        isCompletedThisMonth
      };
    } catch { return null; }
  });

  const validStats = gameStats.filter((s): s is NonNullable<typeof s> => s !== null);

  // Find stats for the most recent game specifically
  const recentStats = validStats.find(s => s.appid === recentGameRaw?.appid) || { unlocked: 0, total: 0 };

  return {
    username: player.personaname,
    avatarUrl: player.avatarfull,
    totalPlaytimeHours: Math.round(totalMinutes / 60),
    totalUnlockedAchievements: validStats.reduce((acc, s) => acc + s.unlocked, 0),
    totalAvailableAchievements: validStats.reduce((acc, s) => acc + s.total, 0),
    completedGamesCount: validStats.filter(s => s.isCompleted).length,
    completedGamesThisMonth: validStats.filter(s => s.isCompletedThisMonth).length,
    mostPlayedGame: {
      name: topPlayedRaw?.name || "None",
      hours: Math.round((topPlayedRaw?.playtime_forever || 0) / 60)
    },
    recentGame: {
      id: recentGameRaw?.appid || 0,
      name: recentGameRaw?.name || "None",
      hours: Math.round((recentGameRaw?.playtime_forever || 0) / 60),
      unlockedAchievements: recentStats.unlocked,
      totalAchievements: recentStats.total,
      iconUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${recentGameRaw?.appid || 0}/library_600x900_2x.jpg`,
      lastPlayedTimestamp: recentGameRaw?.rtime_last_played || 0,
      isCurrentlyPlaying: isCurrentlyPlaying
    }
  };
}