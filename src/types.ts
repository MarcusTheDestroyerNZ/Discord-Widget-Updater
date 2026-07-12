export interface SteamData {
  username: string;
  avatarUrl: string;
  // Global Stats (for Profile Tracker)
  totalPlaytimeHours: number;
  totalUnlockedAchievements: number;
  totalAvailableAchievements: number;
  completedGamesCount: number;
  completedGamesThisMonth: number;
  mostPlayedGame: { name: string; hours: number };
  
  // Recent Game Specific Stats (for Recent Game Tracker)
  recentGame: { 
    id: number; 
    name: string; 
    hours: number;
    unlockedAchievements: number; // Just for this game
    totalAchievements: number;    // Just for this game
  };
  prevGame: { id: number; name: string };
}