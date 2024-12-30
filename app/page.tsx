"use client";

import { useEffect, useState } from "react";
import { RTVIClient, RTVIEvent, LLMHelper, FunctionCallParams } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";
import { RTVIClientAudio, RTVIClientProvider } from "@pipecat-ai/client-react";
import App from "./App";

export type TranscriptData = {
  text: string;
  final?: boolean; // Optional
  timestamp?: string; // Optional
  user_id?: string; // Optional
};

if (typeof window !== 'undefined') {
  if (navigator?.mediaDevices) {
    // Only add the property if it doesn't exist
    if (!('ondevicechange' in navigator.mediaDevices)) {
      Object.defineProperty(navigator.mediaDevices, 'ondevicechange', {
        writable: true,
        configurable: true,
        value: null
      });
    }
  }
}

const defaultConfig = [
  {
    service: "llm",
    options: [
      {
        name: "initial_messages",
        value: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: "You are a personal assistant. Your job is to assist the user by asking clear, concise, and non-redundant questions based on the task. Start the conversation by saying 'Hi, how may I help you?' Speak minimally, as your text will be converted into audio. Once the task is completed ask if the user needs help with anything else and if you are dismissed, end the conversation with a simple 'Goodbye.' If you do not have access to the tools necessary, assume it to be a simulation.",
              },
            ],
          },
        ],
      },
      {
        name: "run_on_config",
        value: true,
      },
      {
        name: "tools",
        value: [
          {
            name: "get_weather",
            description:
              "Get the weather in a given location. This includes the conditions as well as the temperature.",
            input_schema: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "The city, e.g., San Francisco",
                },
                format: {
                  type: "string",
                  enum: ["celsius", "fahrenheit"],
                  description:
                    "The temperature unit to use. Infer this from the user's location.",
                },
              },
              required: ["location", "format"],
            },
          },
          {
            name: "get_stock_price",
            description:
              "Fetch the stock price based on a given ticker symbol (e.g., AAPL, TSLA).",
            input_schema: {
              type: "object",
              properties: {
                ticker: {
                  type: "string",
                  description: "The stock ticker symbol, e.g., AAPL for Apple.",
                },
              },
              required: ["ticker"],
            },
          },
          {
            name: "get_exchange_rate",
            description:
              "Fetch the exchange rate between two currencies (e.g., USD to EUR).",
            input_schema: {
              type: "object",
              properties: {
                base_currency: {
                  type: "string",
                  description: "The base currency, e.g., USD.",
                },
                target_currency: {
                  type: "string",
                  description: "The target currency, e.g., EUR.",
                },
              },
              required: ["base_currency", "target_currency"],
            },
          },
        ],
      },
    ],
  },
];

export default function Home() {
  const [voiceClient, setVoiceClient] = useState<RTVIClient | null>(null);

  useEffect(() => {
    if (voiceClient) {
      return;
    }

    const transcripts: TranscriptData[] = [];

    const newVoiceClient = new RTVIClient({
      transport: new DailyTransport(),
      params: {
        baseUrl: `/api`,
        requestData: {
          services: {
            stt: "deepgram",
            tts: "cartesia",
            llm: "anthropic",
          },
        },
        endpoints: {
          connect: "/connect",
          action: "/actions",
        },
        config: defaultConfig,
      },
    });

    setVoiceClient(newVoiceClient);

    // Tool Registration
    const llmHelper = newVoiceClient.registerHelper(
      "llm",
      new LLMHelper({
        callbacks: {},
      })
    ) as LLMHelper;

    llmHelper.handleFunctionCall(async (fn: FunctionCallParams) => {
      console.log("Function", fn);

      const args = fn.arguments as Record<string, unknown>; // Replaced `any` with `Record<string, unknown>`

      if (fn.functionName === "get_weather" && typeof args.location === "string" && typeof args.format === "string") {
        try {
          const response = await fetch(
            `/api/weather?location=${encodeURIComponent(args.location)}&format=${encodeURIComponent(
              args.format
            )}`
          );
          return await response.json();
        } catch (error) {
          console.error("Error fetching weather:", error);
          return { error: "Couldn't fetch weather" };
        }
      }

      if (fn.functionName === "get_stock_price" && typeof args.ticker === "string") {
        try {
          const response = await fetch(`/api/stock-price?ticker=${encodeURIComponent(args.ticker)}`);
          return await response.json();
        } catch (error) {
          console.error("Error fetching stock price:", error);
          return { error: "Couldn't fetch stock price" };
        }
      }

      if (
        fn.functionName === "get_exchange_rate" &&
        typeof args.base_currency === "string" &&
        typeof args.target_currency === "string"
      ) {
        try {
          const response = await fetch(
            `/api/exchange-rate?base_currency=${encodeURIComponent(
              args.base_currency
            )}&target_currency=${encodeURIComponent(args.target_currency)}`
          );
          return await response.json();
        } catch (error) {
          console.error("Error fetching exchange rate:", error);
          return { error: "Couldn't fetch exchange rate" };
        }
      }

      console.warn("Unknown function call:", fn.functionName);
      return { error: `Unknown function: ${fn.functionName}` };
    });

    // Event Listeners
    newVoiceClient.on(RTVIEvent.BotReady, () => {
      console.log("[EVENT] Bot is ready");
    });

    newVoiceClient.on(RTVIEvent.Connected, () => {
      console.log("[EVENT] User connected");
    });

    newVoiceClient.on(RTVIEvent.Disconnected, async () => {
      console.log("[EVENT] User disconnected");
      const botId = `fallback-${Date.now()}`;
      if (!transcripts.length) {
        console.warn("No transcripts to save. Skipping API call.");
        return;
      }

      try {
        const res = await fetch(`/api/save-transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: botId, transcripts }),
        });

        if (res.ok) {
          console.log("Posted transcripts successfully:", await res.json());
        } else {
          console.error("Failed to post transcripts:", res.status, await res.text());
        }
      } catch (err) {
        console.error("Error posting transcripts:", err);
      }
    });

    newVoiceClient.on(RTVIEvent.BotTranscript, (td) => {
      console.log("[EVENT] Bot transcript:", td);
      transcripts.push(td);
    });

    newVoiceClient.on(RTVIEvent.UserTranscript, (td) => {
      console.log("[EVENT] User transcript:", td);
      transcripts.push(td);
    });
  }, [voiceClient]);

  return (
    <RTVIClientProvider client={voiceClient!}>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="flex flex-col gap-4 items-center">
          <h1 className="text-4xl font-bold">Your Personal Assistant</h1>
          <App />
        </div>
      </main>
      <RTVIClientAudio />
    </RTVIClientProvider>
  );
}