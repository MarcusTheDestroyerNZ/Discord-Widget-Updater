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
    lastPlayedTimestamp: number; // New
    isCurrentlyPlaying: boolean; // New
  };
}