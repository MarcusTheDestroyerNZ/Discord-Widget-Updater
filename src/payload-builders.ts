import { SteamData } from "./types.js";

function getRelativeTimeString(data: SteamData): string {
  if (data.recentGame.isCurrentlyPlaying) {
    return "Still playing now";
  }

  const secondsAgo = Math.floor(Date.now() / 1000) - data.recentGame.lastPlayedTimestamp;
  
  if (secondsAgo < 60) return "Less than a minute ago";
  
  const minutes = Math.floor(secondsAgo / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

function getNZTimestamp(): string {
  return new Date().toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString("en-NZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const ACHIEVEMENT_SET_DESCRIPTION_LIMIT = 44;

function truncateSetName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  if (maxLength <= 1) return "…";
  return `${name.slice(0, maxLength - 1)}…`;
}

function formatAchievementSetProgress(data: SteamData): string {
  const overall = data.recentGame.totalAchievements === 0
    ? 100
    : (data.recentGame.unlockedAchievements / data.recentGame.totalAchievements * 100);

  const sets = data.recentGame.achievementSets.filter((set) => set.unlocked > 0);
  if (sets.length === 0) return `${overall.toFixed(0)}% · No unlocked set achievements`;

  const formattedSets: string[] = [];

  for (const set of sets) {
    let name = set.name;
    if (/^base game$/i.test(name)) name = "Base";
    if (name.includes(":")) name = name.split(":", 2)[1].trim();
    name = truncateSetName(name, 12);

    const formatted = `${name} ${set.unlocked}/${set.total}`;
    const nextText = formattedSets.length === 0
      ? formatted
      : `${formattedSets.join(" · ")} · ${formatted}`;

    if (nextText.length <= ACHIEVEMENT_SET_DESCRIPTION_LIMIT) {
      formattedSets.push(formatted);
    } else {
      const remaining = sets.length - formattedSets.length - 1;
      if (remaining > 0) {
        formattedSets.push(`+${remaining + 1} sets`);
      }
      break;
    }
  }

  return formattedSets.join(" · ").slice(0, ACHIEVEMENT_SET_DESCRIPTION_LIMIT);
}

export const builders = {
  profileTracker: (data: SteamData) => ({
    username: data.username,
    data: {
      dynamic: [
        { type: 3, name: "profile image", value: { url: data.avatarUrl } },
        { type: 1, name: "widget title", value: `${data.username}'s Profile` },
        { type: 1, name: "playtime", value: `${formatNumber(data.totalPlaytimeHours)} hours` },
        { type: 1, name: "total achievements", value: `${formatNumber(data.totalUnlockedAchievements)}` },
        { type: 1, name: "completed games", value: `${formatNumber(data.completedGamesCount)}` },
        { type: 1, name: "most played game", value: `${data.mostPlayedGame.name} (${formatNumber(data.mostPlayedGame.hours)}h)` },
        { type: 1, name: "most recent game", value: `${data.recentGame.name} (${formatNumber(data.recentGame.hours)}h)` },
        { type: 1, name: "monthly completed games", value: `${formatNumber(data.completedGamesThisMonth)}` },
        { type: 1, name: "last updated timer", value: `Updated at: ${getNZTimestamp()}` },
      ]
    }
  }),

  recentGameTracker: (data: SteamData) => {
    const activeAchievementSets = data.recentGame.achievementSets.filter((set) => set.unlocked > 0);
    const activeUnlockedAchievements = activeAchievementSets.reduce((sum, set) => sum + set.unlocked, 0);
    const activeTotalAchievements = activeAchievementSets.reduce((sum, set) => sum + set.total, 0);

    return {
      data: {
        dynamic: [
          { type: 3, name: "game image", value: { url: data.recentGame.iconUrl} },
          { type: 1, name: "title", value: `LAST PLAYED: ${data.recentGame.name}` },
          { type: 1, name: "title subtext", value: `${getRelativeTimeString(data)}` },
          { type: 1, name: "progress description", value: formatAchievementSetProgress(data) },
          { type: 2, name: "progress", value: activeUnlockedAchievements },
          { type: 2, name: "max progress", value: activeTotalAchievements },
          { type: 1, name: "last updated timer", value: `Updated at: ${getNZTimestamp()}` }
        ]
      }
    };
  }
};