import { SteamData } from "./types.js";

function formatHours(hours: number): string {
    if (hours >= 100) return `${hours.toFixed(0)}h`;
    return `${hours.toFixed(1)}h`;
}

export const builders = {
  profileTracker: (data: SteamData) => ({
    username: data.username,
    data: {
      dynamic: [
        { type: 3, name: "UserProfileImage", value: { url: data.avatarUrl } },
        { type: 1, name: "WidgetTitle", value: `${data.username}'s Profile` },
        { type: 1, name: "StatOneLabel", value: "Total Playtime" },
        { type: 1, name: "StatOneValue", value: `${data.totalPlaytimeHours.toFixed(1)} hours` },
        { type: 1, name: "StatTwoLabel", value: "Achievements Unlocked" },
        { type: 1, name: "StatTwoValue", value: `${data.totalUnlockedAchievements}` },
        { type: 1, name: "StatThreeLabel", value: "100% Completed Games" },
        { type: 1, name: "StatThreeValue", value: `${data.completedGamesCount}` },
        { type: 1, name: "StatFourLabel", value: "Most Played Game" },
        { type: 1, name: "StatFourValue", value: `${data.mostPlayedGame.name} (${formatHours(data.mostPlayedGame.hours)})` },
        { type: 1, name: "StatFiveLabel", value: "Most Recent Game" },
        { type: 1, name: "StatFiveValue", value: `${data.recentGame.name} (${formatHours(data.recentGame.hours)})` },
        { type: 1, name: "StatSixLabel", value: "Games 100% This Month" },
        { type: 1, name: "StatSixValue", value: `${data.completedGamesThisMonth}` },
      ]
    }
  }),

  recentGameTracker: (data: SteamData) => ({
    data: {
      dynamic: [
        { type: 3, name: "game image", value: { url: `https://cdn.akamai.steamstatic.com/steam/apps/${data.recentGame.id}/header.jpg` } },
        { type: 1, name: "title", value: `Recently Played: ${data.recentGame.name.toUpperCase()}` },
        { type: 1, name: "progress name", value: "Achievements" },
        { type: 1, name: "progress description", value: `Playtime: ${data.recentGame.hours.toFixed(1)} hours` },
        { type: 2, name: "progress", value: data.recentGame.unlockedAchievements },
        { type: 2, name: "max progress", value: data.recentGame.totalAchievements }
      ]
    }
  })
};