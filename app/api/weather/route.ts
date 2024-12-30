import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  try {
    const weatherApiKey = process.env.OPENWEATHER_API_KEY; // Ensure this is set in .env.local
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      location
    )}&units=metric&appid=${weatherApiKey}`;

    const response = await fetch(weatherApiUrl);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}