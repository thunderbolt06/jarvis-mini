import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  }

  try {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    const alphaVantageUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      ticker
    )}&apikey=${apiKey}`;

    const response = await fetch(alphaVantageUrl);
    if (!response.ok) {
      throw new Error(`Error from Alpha Vantage: ${response.statusText}`);
    }

    const data = await response.json();
    if (data["Global Quote"]) {
      const price = data["Global Quote"]["05. price"];
      return NextResponse.json({ ticker, price });
    } else {
      return NextResponse.json({ error: "Invalid response from Alpha Vantage API" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error fetching stock price:", error);
    return NextResponse.json({ error: "Failed to fetch stock price" }, { status: 500 });
  }
}