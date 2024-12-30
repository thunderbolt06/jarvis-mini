import React, { useState, useCallback } from "react";
import {
  TransportState,
  RTVIError,
  RTVIEvent,
  BotLLMTextData, // Assuming this type is available for BotTranscript
} from "@pipecat-ai/client-js";
import { useRTVIClient, useRTVIClientEvent } from "@pipecat-ai/client-react";

type TranscriptData = {
  text: string;
  final: boolean;
  timestamp: string;
  user_id: string;
};

const App: React.FC = () => {
  const voiceClient = useRTVIClient();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<TransportState>("disconnected");

  // Single array for both bot & user transcripts
  const [transcripts, setTranscripts] = useState<
    { role: "bot" | "user"; data: TranscriptData }[]
  >([]);

  // Track a simple "isSpeaking" flag to animate the button
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Capture bot transcripts (no final check)
  useRTVIClientEvent(
    RTVIEvent.BotTranscript,
    useCallback((data: BotLLMTextData) => {
      const transformedData: TranscriptData = {
        text: data.text,
        final: true, // Assume bot messages are always final
        timestamp: new Date().toISOString(), // Use current timestamp
        user_id: "bot", // Static ID for bot
      };

      setTranscripts((prev) => [...prev, { role: "bot", data: transformedData }]);

      // Animate the button for ~2s whenever the bot speaks
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 2000);
    }, [])
  );

  // Capture user transcripts (with final check)
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback((data: TranscriptData) => {
      if (data.final) {
        setTranscripts((prev) => [...prev, { role: "user", data }]);
      }
    }, [])
  );

  // Track transport state changes
  useRTVIClientEvent(RTVIEvent.TransportStateChanged, (newState: TransportState) => {
    setState(newState);
  });

  async function connect() {
    if (!voiceClient) return;

    try {
      await voiceClient.connect();
    } catch (e) {
      setError((e as RTVIError).message || "Unknown error occurred");
      voiceClient.disconnect();
    }
  }

  async function disconnect() {
    if (!voiceClient) return;

    await voiceClient.disconnect();
    setTranscripts([]);
  }

  // Grab the last 5 entries
  const lastFive = transcripts.slice(-5);

  return (
    <div className="flex flex-col gap-4">
      {/* Error message */}
      {error && <div className="text-red-500 font-bold">{error}</div>}

      {/* Connect/Disconnect button */}
      <button
        onClick={() => (state === "disconnected" ? connect() : disconnect())}
        className={`mx-auto px-5 py-2 rounded-full self-center transition-all 
          ${isSpeaking ? "animate-pulse" : ""}
          ${state !== "disconnected" ? "bg-red-200" : "bg-slate-300"}
        `}
      >
        {state === "disconnected" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-black"
            fill="currentColor"
            viewBox="0 0 512 512"
          >
            <path d="M256 320c53.02 0 96-43 96-96V96c0-53-43-96-96-96s-96 43-96 96v128c0 53 43 96 96 96zm-24 144.9v47.1c0 13.3 10.7 24 24 24s24-10.7 24-24v-47.1c72.9-11.8 128-73.5 128-150.9 0-13.3-10.7-24-24-24s-24 10.7-24 24c0 55.2-44.8 100-100 100s-100-44.8-100-100c0-13.3-10.7-24-24-24s-24 10.7-24 24c0 77.4 55.1 139.1 128 150.9z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-red-600"
            fill="currentColor"
            viewBox="0 0 512 512"
          >
            <path d="M256 320c53.02 0 96-43 96-96V96c0-53-43-96-96-96s-96 43-96 96v128c0 53 43 96 96 96zm-24 144.9v47.1c0 13.3 10.7 24 24 24s24-10.7 24-24v-47.1c72.9-11.8 128-73.5 128-150.9 0-13.3-10.7-24-24-24s-24 10.7-24 24c0 55.2-44.8 100-100 100s-100-44.8-100-100c0-13.3-10.7-24-24-24s-24 10.7-24 24c0 77.4 55.1 139.1 128 150.9z" />
          </svg>
        )}
      </button>

      {/* Transport state */}
      <div className="text-center">
        Transport state: <strong>{state}</strong>
      </div>

      {/* Show only the last 5 entries */}
      <div className="mt-10 flex flex-col gap-2">
        {lastFive.map((item, index) => (
          <div
            key={index}
            className={item.role === "bot" ? "text-blue-600" : "text-green-600"}
          >
            {item.role === "bot"
              ? `Bot said: ${item.data.text}`
              : `User said: ${item.data.text}`}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;