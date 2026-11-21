export interface AchievementSetProgress {
  id: string;
  name: string;
  unlocked: number;
  total: number;
  missing: number;
}

export interface WidgetConfig {
  label: string;
  token: string;
  appId: string;
  identityId: string;
  builder: (data: SteamData) => unknown;
}

export interface SteamData {
  username: string;
  avatarUrl: string;
  totalPlaytimeHours: number;
  totalUnlockedAchievements: number;
  totalAvailableAchievements: number;
  completedGamesCount: number;
  completedGamesThisMonth: number;
  mostPlayedGame: { name: string; hours: number };
  recentGame: { 
    id: number; 
    name: string; 
    hours: number;
    unlockedAchievements: number;
    totalAchievements: number;
    iconUrl: string;
    achievementSets: AchievementSetProgress[];
    lastPlayedTimestamp: number;
    isCurrentlyPlaying: boolean;
  };
}