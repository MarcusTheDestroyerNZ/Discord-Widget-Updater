# Discord Steam Widget Updater

This is a small project built for my own use and fun to keep my Discord profile widgets updated with my latest Steam stats.

## Features:

- **Profile Tracker**: Syncs total playtime, total achievements, and career highlights like "Most Played Game".
- **Recent Game Tracker**: Displays current progress for your most recently played game, including achievement progress bars and relative time (e.g., "2 hours ago").
- **NZST/NZDT Optimized**: All timestamps are automatically localized to New Zealand time.
- **Automated Formatting**: Numbers are cleanly formatted with commas for better readability (e.g., 1,234).

## Setup Instructions
If you want to set this up for yourself, follow these steps:

### 1. Clone the repository
Clone this repo
     
### 2. Install dependencies
Only Node.js/npm is required. Open your terminal in the project folder and run:
```npm install```

### 3. Create the Profile Tracker Widget
Go to the [Discord Developer Portal](https://discord.com/developers/home) and create your first application.

1. Create a new App and follow [this tutorial](https://chloecinders.com/blog/discord-widgets) to set up a widget.
2. Ensure your layout matches these images:

<img width="423" height="344" alt="image" src="https://github.com/user-attachments/assets/95812a98-d7be-46bf-9e5c-66dcf0b6e2d8" />
<img width="569" height="576" alt="image" src="https://github.com/user-attachments/assets/f006e40f-6d87-4ff4-9bbb-76946052b5b0" />

3. Ensure your JSON like this:
```
 {
    "data": {
      "dynamic": [
        {
          "type": 3,
          "name": "profile image",
          "value": {
            "url": "<URL to profile image.png>"
          }
        },
        {
          "type": 1,
          "name": "widget title",
          "value": "{username}'s Profile"
        },
        {
          "type": 1,
          "name": "playtime",
          "value": "51,623 hours"
        },
        {
          "type": 1,
          "name": "total achievements",
          "value": "2,164"
        },
        {
          "type": 1,
          "name": "completed games",
          "value": "23"
        },
        {
          "type": 1,
          "name": "most played game",
          "value": "CONTROL"
        },
        {
          "type": 1,
          "name": "most recent game",
          "value": "CONTROL"
        },
        {
          "type": 1,
          "name": "monthly completed games",
          "value": "3"
        },
        {
          "type": 1,
          "name": "last updated timer",
          "value": "Last Update: 19:53"
        }
      ]
    }
  }
```

### 4. Create the Recent Game Tracker Widget
Create a second App for the game tracker. 

1. Set the layout to match these images:

<img width="421" height="289" alt="image" src="https://github.com/user-attachments/assets/621b21aa-c5a8-43a6-a8bf-a3bb3151c4c2" />
<img width="563" height="453" alt="image" src="https://github.com/user-attachments/assets/4f931e02-a8a0-42a0-a2a2-8aa3bbcb3322" />

2. Ensure your JSON like this:
```
 {
    "data": {
      "dynamic": [
        {
          "type": 3,
          "name": "game image",
          "value": {
            "url": "<URL to game image.png>"
          }
        },
        {
          "type": 1,
          "name": "title",
          "value": "Last Played: CONTROL"
        },
        {
          "type": 1,
          "name": "title subtext",
          "value": "19 hours ago"
        },
        {
          "type": 1,
          "name": "progress description",
          "value": "Playtime: 56 hours"
        },
        {
          "type": 2,
          "name": "progress",
          "value": 50
        },
        {
          "type": 2,
          "name": "max progress",
          "value": 100
        },
        {
          "type": 1,
          "name": "last updated timer",
          "value": "Last updated: 19:53"
        }
      ]
    }
  }
```

### 5. Configure Environment Variables
Create a file named ```.env``` in the root directory with the following written inside (Swap each ID/Token with yours):
```
 # Steam Config
 STEAM_ID=your_steam_id_64
 STEAM_WEB_API_KEY=your_steam_api_key
 
 # Discord Config
 DISCORD_USER_ID=your_discord_id
 
 # Widget 1: Profile Tracker
 DISCORD_TOKEN_1=bot_token_1
 DISCORD_APP_ID_1=app_id_1
 DISCORD_IDENTITY_1=0
 
 # Widget 2: Recent Game Tracker
 DISCORD_TOKEN_2=bot_token_2
 DISCORD_APP_ID_2=app_id_2
 DISCORD_IDENTITY_2=0
```

### 6. Run the Sync
To update your profile, run:
```npm run sync```

---
Feel free to reach out if you need help!
     
