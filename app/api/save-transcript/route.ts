import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Parse the request body
    const { session_id, transcripts } = await req.json();

    // Validate input data
    if (!session_id || !transcripts || !Array.isArray(transcripts)) {
      return NextResponse.json(
        {
          error: "Invalid request. 'session_id' and 'transcripts' (array) are required.",
        },
        { status: 400 }
      );
    }

    // Forward the request to the external server
    const externalServerUrl = process.env.NEXT_PUBLIC_BACKEND_URL; // Ensure this is set in your .env file
    if (!externalServerUrl) {
      return NextResponse.json(
        { error: "External server URL is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(`${externalServerUrl}/save-transcript`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id, transcripts }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from external server:", errorText);
      return NextResponse.json(
        { error: "Failed to forward the request to the external server." },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      message: "Request forwarded successfully.",
      externalResponse: result,
    });
  } catch (error) {
    console.error("Error processing save-transcript request:", error);

    // Return error response
    return NextResponse.json(
      { error: "An internal error occurred while processing the request." },
      { status: 500 }
    );
  }
}