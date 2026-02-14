import axios from 'axios';

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
};

export type DiscordMessage = {
  content?: string;
  embeds?: DiscordEmbed[];
};

export class DiscordClient {
  private readonly webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendMessage(message: DiscordMessage) {
    if (!this.webhookUrl) {
      console.warn('Discord webhook URL not configured. Skipping sending message.');
      return;
    }

    try {
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      console.error('Failed to send message to Discord:', error);
    }
  }
}
