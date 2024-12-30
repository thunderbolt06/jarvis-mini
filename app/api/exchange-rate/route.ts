import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const base_currency = searchParams.get("base_currency");
  const target_currency = searchParams.get("target_currency");

  if (!base_currency || !target_currency) {
    return NextResponse.json(
      { error: "Both base_currency and target_currency are required" },
      { status: 400 }
    );
  }

  try {
    // const apiKey = process.env.EXCHANGERATE_API_KEY; // Ensure this is set in .env.local
    const exchangeRateUrl = `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(
      base_currency
    )}`;

    const response = await fetch(exchangeRateUrl);
    if (!response.ok) {
      throw new Error(`Error from exchange rate API: ${response.statusText}`);
    }

    const data = await response.json();
    const rate = data.rates[target_currency];

    if (!rate) {
      return NextResponse.json(
        { error: `Exchange rate for ${base_currency} to ${target_currency} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ base_currency, target_currency, rate }, { status: 200 });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return NextResponse.json({ error: "Failed to fetch exchange rate" }, { status: 500 });
  }
}