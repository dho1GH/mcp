import { config } from "../config.js";

type ZepClientOptions = {
  apiKey: string;
  baseUrl: string;
};

type ZepGraphUpsertInput = {
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
};

const defaultHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
});

export class ZepClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: ZepClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
  }

  async upsertGraphContext(input: ZepGraphUpsertInput): Promise<void> {
    const response = await fetch(`${this.baseUrl}/graph/context`, {
      method: "POST",
      headers: defaultHeaders(this.apiKey),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Zep upsert failed: ${response.status} ${body}`);
    }
  }
}

export const createZepClient = () =>
  new ZepClient({
    apiKey: config.zepApiKey,
    baseUrl: config.zepBaseUrl,
  });
