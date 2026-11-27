import "dotenv/config";
import { SteamData } from "./types.js";

const STEAM_API_BASE = "https://api.steampowered.com";

// Helper for Steam API calls
async function steamGet(path: string, params: Record<string, string>): Promise<any | null> {
  const url = new URL(`${STEAM_API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json() as any;
}

async function steamCommunityGet(path: string): Promise<string | null> {
  try {
    const res = await fetch(`https://steamcommunity.com${path}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getRecentGameImageUrl(appId: number): Promise<string> {
  const libraryImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;

  try {
    const response = await fetch(libraryImageUrl, { method: "HEAD" });
    if (response.ok && response.headers.get("content-type")?.startsWith("image/")) {
      return libraryImageUrl;
    }
  } catch (error) {
    console.warn(`Unable to check Steam library artwork for app ${appId}.`, error);
  }

  try {
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    if (!response.ok) throw new Error(`Steam Store returned ${response.status}`);

    const details: unknown = await response.json();
    if (isRecord(details)) {
      const appDetails = details[String(appId)];
      if (isRecord(appDetails) && isRecord(appDetails.data)) {
        const headerImageUrl = appDetails.data.header_image;
        if (typeof headerImageUrl === "string" && headerImageUrl.length > 0) {
          return headerImageUrl;
        }
      }
    }
    throw new Error(`Steam Store did not provide header artwork for app ${appId}`);
  } catch (error) {
    console.warn(`Unable to load Steam Store artwork for app ${appId}.`, error);
  }

  return libraryImageUrl;
}

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

async function getSteamCommunityAchievementSets(steamId: string, appId: number, userAchievements: any[]) {
  const html = await steamCommunityGet(`/profiles/${steamId}/stats/${appId}/?tab=achievements&l=english`);
  if (!html) return null;

  const normalizedHtml = html.replace(/\\"/g, '"');
  const marker = `"appid":${appId},"language":"english","groups":`;
  const markerIndex = normalizedHtml.indexOf(marker);
  if (markerIndex < 0) return null;

  const arrayStart = normalizedHtml.indexOf('[', markerIndex);
  if (arrayStart < 0) return null;

  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < normalizedHtml.length; i++) {
    if (normalizedHtml[i] === '[') depth++;
    if (normalizedHtml[i] === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i + 1;
        break;
      }
    }
  }
  if (arrayEnd < 0) return null;

  const groupsJson = normalizedHtml.slice(arrayStart, arrayEnd);
  const names = new Map<string, string>();
  const namePattern = /"id":(\d+),"name":"([^"]*)"/g;
  let nameMatch: RegExpExecArray | null;
  while ((nameMatch = namePattern.exec(groupsJson)) !== null) {
    names.set(nameMatch[1], nameMatch[2] || (nameMatch[1] === "0" ? "Base Game" : `Set ${nameMatch[1]}`));
  }

  const totals = new Map<string, number>();
  const unlockedNames = new Set(
    userAchievements
      .filter((achievement: any) => achievement.achieved === 1)
      .map((achievement: any) => String(achievement.name ?? achievement.apiname))
  );
  const unlockedBySet = new Map<string, number>();

  const achievementPattern = /"api_name":"([^"]+)"[\s\S]{0,800}?"groupid":(\d+)/g;
  let achievementMatch: RegExpExecArray | null;
  while ((achievementMatch = achievementPattern.exec(groupsJson)) !== null) {
    const achievementStart = groupsJson.lastIndexOf('{', achievementMatch.index);
    const achievementEnd = groupsJson.indexOf('}', achievementMatch.index);
    const achievementJson = groupsJson.slice(achievementStart, achievementEnd + 1);
    if (/"archived":true/.test(achievementJson)) continue;

    const apiName = achievementMatch[1];
    const setId = achievementMatch[2];
    totals.set(setId, (totals.get(setId) || 0) + 1);
    if (unlockedNames.has(apiName)) {
      unlockedBySet.set(setId, (unlockedBySet.get(setId) || 0) + 1);
    }
  }

  if (totals.size === 0) return null;

  return [...totals.entries()].map(([setId, total]) => {
    const unlocked = unlockedBySet.get(setId) || 0;
    return {
      id: setId,
      name: names.get(setId) || (setId === "0" ? "Base Game" : `Set ${setId}`),
      unlocked,
      total,
      missing: total - unlocked
    };
  });
}

function getAchievementSetProgress(schemaResponse: any, userAchievements: any[]) {
  const availableStats = schemaResponse?.game?.availableGameStats || {};
  const schemaAchievements: any[] = availableStats.achievements || [];
  const activeAchievements = schemaAchievements.filter((achievement: any) =>
    achievement.archived !== true && achievement.archived !== 1 && achievement.optionalStatus !== "Archived"
  );

  const unlockedNames = new Set(
    userAchievements
      .filter((achievement: any) => achievement.achieved === 1)
      .map((achievement: any) => String(achievement.name ?? achievement.apiname))
  );

  const setKeys = ["achievementsets", "achievement_sets", "achievementSets", "sets", "groups"];
  const setContainerKey = setKeys.find((key) => Array.isArray(availableStats[key]));
  const setContainers: any[] = setContainerKey ? availableStats[setContainerKey] : [];
  const setById = new Map<string, { id: string; name: string }>();
  const achievementSetByName = new Map<string, { id: string; name: string }>();

  for (const set of setContainers) {
    const id = String(set.id ?? set.setid ?? set.setId ?? set.groupid ?? set.groupId ?? set.name ?? "base");
    const name = String(set.name ?? set.setname ?? set.setName ?? set.displayName ?? (id === "base" ? "Base Game" : `Set ${id}`));
    const setInfo = { id, name };
    setById.set(id, setInfo);

    const members = set.achievements || set.achievementNames || set.apiNames || set.achievement_ids || [];
    for (const member of members) {
      const memberName = typeof member === "string"
        ? member
        : String(member.name ?? member.apiName ?? member.api_name ?? member.apiname ?? member.internal_key ?? "");
      if (memberName) achievementSetByName.set(memberName, setInfo);
    }
  }

  const progressBySet = new Map<string, { id: string; name: string; unlocked: number; total: number; missing: number }>();

  for (const achievement of activeAchievements) {
    const achievementName = String(achievement.name ?? achievement.apiName ?? achievement.api_name ?? "");
    const explicitSetId = achievement.setid ?? achievement.setId ?? achievement.set_id
      ?? achievement.achievementSetId ?? achievement.achievement_set_id
      ?? achievement.groupid ?? achievement.groupId ?? achievement.group;

    let setInfo = achievementSetByName.get(achievementName);

    if (!setInfo && explicitSetId != null) {
      const id = String(explicitSetId);
      setInfo = setById.get(id) ?? { id, name: `Set ${id}` };
    }

    if (!setInfo) {
      setInfo = setById.get("base") ?? { id: "base", name: setContainers.length > 0 ? "Base Game" : "Achievements" };
    }

    const progress = progressBySet.get(setInfo.id) ?? { ...setInfo, unlocked: 0, total: 0, missing: 0 };
    progress.total++;
    if (unlockedNames.has(achievementName)) progress.unlocked++;
    progressBySet.set(setInfo.id, progress);
  }

  return [...progressBySet.values()].map((set) => ({
    ...set,
    missing: set.total - set.unlocked
  }));
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

  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);

  const playedGames = allGames.filter((g: any) => g.playtime_forever > 0);
  
  const gameStats = await mapWithConcurrency(playedGames, 4, async (game: any) => {
    try {
      // Get both User achievements and the Game's official schema
      const [achResRaw, schemaResRaw] = await Promise.all([
        steamGet("/ISteamUserStats/GetPlayerAchievements/v1/", { key: apiKey, steamid: steamId, appid: String(game.appid) }),
        steamGet("/ISteamUserStats/GetSchemaForGame/v2/", { key: apiKey, appid: String(game.appid) })
      ]);
      const achRes = achResRaw as any;
      const schemaRes = schemaResRaw as any;

      const userAchievements = achRes?.playerstats?.achievements || [];
      const allSchemaAchievements = schemaRes?.game?.availableGameStats?.achievements || [];
      const schemaAchievements = allSchemaAchievements.filter((achievement: any) =>
        achievement.archived !== true && achievement.archived !== 1 && achievement.optionalStatus !== "Archived"
      );

      if (schemaAchievements.length === 0) return null;

      const unlocked = userAchievements.filter((achievement: any) =>
        achievement.achieved === 1 && schemaAchievements.some((schemaAchievement: any) =>
          String(schemaAchievement.name) === String(achievement.name ?? achievement.apiname)
        )
      );
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
        achievementSets: getAchievementSetProgress(schemaRes, userAchievements),
        userAchievements,
        isCompleted,
        isCompletedThisMonth
      };
    } catch { return null; }
  });

  const validStats = gameStats.filter((s): s is NonNullable<typeof s> => s !== null);

  // Find stats for the most recent game specifically
  const recentStats = validStats.find(s => s.appid === recentGameRaw?.appid) || {
    unlocked: 0,
    total: 0,
    achievementSets: [],
    userAchievements: []
  };

  const communityAchievementSets = await getSteamCommunityAchievementSets(
    steamId,
    recentGameRaw?.appid || 0,
    (recentStats as any).userAchievements || []
  );
  const recentAchievementSets = communityAchievementSets || recentStats.achievementSets;

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
      iconUrl: await getRecentGameImageUrl(recentGameRaw?.appid || 0),
      achievementSets: recentAchievementSets,
      lastPlayedTimestamp: recentGameRaw?.rtime_last_played || 0,
      isCurrentlyPlaying: isCurrentlyPlaying
    }
  };
}