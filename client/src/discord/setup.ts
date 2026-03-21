import { DiscordSDK } from '@discord/embedded-app-sdk';

let discordSdk: DiscordSDK | null = null;

export interface DiscordAuth {
  accessToken: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    global_name: string | null;
  };
  guildId: string | null;
  channelId: string | null;
}

export function getDiscordSdk(): DiscordSDK | null {
  return discordSdk;
}

export async function initDiscord(): Promise<DiscordAuth> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

  if (!clientId) {
    throw new Error('VITE_DISCORD_CLIENT_ID is not set');
  }

  discordSdk = new DiscordSDK(clientId);

  // Wait for SDK ready
  await discordSdk.ready();

  // Authorize
  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  // Exchange code for token via our server
  const tokenResponse = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const { access_token } = await tokenResponse.json();

  // Authenticate with Discord
  const auth = await discordSdk.commands.authenticate({ access_token });

  return {
    accessToken: access_token,
    user: auth.user as DiscordAuth['user'],
    guildId: discordSdk.guildId,
    channelId: discordSdk.channelId,
  };
}

export function getAvatarUrl(userId: string, avatar: string | null): string {
  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
}
