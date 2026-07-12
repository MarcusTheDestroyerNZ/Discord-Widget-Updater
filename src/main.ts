import "dotenv/config";
import { getCleanSteamData } from "./steam-service.js";
import { builders } from "./payload-builders.js";
import { WidgetConfig } from "./types.js";

async function sync() {
  const steamId = process.env.STEAM_ID!;
  
  console.log("🚀 Starting Sync...");
  const data = await getCleanSteamData(steamId);

  const configs: WidgetConfig[] = [
    {
      label: "Profile Tracker",
      token: process.env.DISCORD_TOKEN_1!,
      appId: process.env.DISCORD_APP_ID_1!,
      identityId: process.env.DISCORD_IDENTITY_1 || "0",
      builder: builders.profileTracker
    },
    {
      label: "Recent Game Tracker",
      token: process.env.DISCORD_TOKEN_2!,
      appId: process.env.DISCORD_APP_ID_2!,
      identityId: process.env.DISCORD_IDENTITY_2 || "0",
      builder: builders.recentGameTracker
    }
  ];

  for (const config of configs) {
    const res = await fetch(
      `https://discord.com/api/v9/applications/${config.appId}/users/${process.env.DISCORD_USER_ID}/identities/${config.identityId}/profile`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${config.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config.builder(data))
      }
    );
    console.log()
    console.log(`🚀 Sending update to ${config.label} (Identity: ${config.identityId})...`);

    if (res.ok) {
      console.log(`✅ Updated ${config.label}`);
    } else {
      console.error(`❌ Failed ${config.label}: ${res.status} ${await res.text()}`);
    }
  }
}

sync();