import { config } from "../config.js";

type GraphitiClientOptions = {
  apiKey: string;
  baseUrl: string;
};

type GraphitiContextInput = {
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
};

const defaultHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
});

export class GraphitiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: GraphitiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
  }

  async upsertContext(input: GraphitiContextInput): Promise<void> {
    const response = await fetch(`${this.baseUrl}/context`, {
      method: "POST",
      headers: defaultHeaders(this.apiKey),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Graphiti upsert failed: ${response.status} ${body}`);
    }
  }
}

export const createGraphitiClient = () =>
  new GraphitiClient({
    apiKey: config.graphitiApiKey,
    baseUrl: config.graphitiBaseUrl,
  });
