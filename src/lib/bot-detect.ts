/** Known crawler and preview-bot user agents. Catches the high-volume ones. */
const BOT_UA =
  /bot|crawler|spider|crawl|slurp|bingpreview|headlesschrome|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptimerobot|curl|wget|python-requests|axios|go-http-client|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|embedly|quora link preview|vercel|monitoring/i;

export type BotSignals = {
  userAgent: string | null;
  referrer: string | null;
  sessionId: string | null;
};

export function looksLikeBot({ userAgent, referrer, sessionId }: BotSignals): boolean {
  if (!userAgent) return true;
  if (BOT_UA.test(userAgent)) return true;
  if (!referrer && !sessionId) return true;
  return false;
}

/** Coarse device class from the user agent. */
export function deviceFromUA(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|android.*mobile|phone/i.test(userAgent)) return "mobile";
  return "desktop";
}
