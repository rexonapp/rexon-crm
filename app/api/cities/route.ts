export const dynamic = 'force-dynamic'; 
import { NextRequest, NextResponse } from "next/server";

interface CityResponse {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

// In-memory cache for cities data
let citiesCache: { id?: string; city: string; stateCode: string; latitude?: number; longitude?: number }[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET(request: NextRequest) {
  try {
    // Get search query from URL parameters
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('search');

    console.log('Cities API called at:', new Date().toISOString());
    if (searchQuery) {
      console.log(`Search query: "${searchQuery}"`);
    }

    // If there's a search query, fetch directly from API (always fresh results)
    if (searchQuery && searchQuery.trim().length > 0) {
      console.log('Fetching search results from Indian Cities API...');
      
      const response = await fetch(
        `https://indian-cities.vercel.app/api/cities?search=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data: CityResponse[] = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from API');
      }

      console.log(`Received ${data.length} cities matching "${searchQuery}"`);

      // Transform the data to match the expected format
      const searchResults = data.map((city, index) => {
        return {
          id: `${city.name}-${city.state}-${index}`,
          city: city.name,
          stateCode: city.state,
          latitude: city.latitude,
          longitude: city.longitude,
        };
      });

      return NextResponse.json(searchResults);
    }

    // No search query - return cached data or fetch all cities
    const now = Date.now();
    if (citiesCache && citiesCache.length > 0 && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      const cacheAge = Math.floor((now - cacheTimestamp) / (60 * 1000)); // in minutes
      console.log(`Returning ${citiesCache.length} cities from server cache (age: ${cacheAge} minutes)`);
      return NextResponse.json(citiesCache);
    }

    console.log('Cache miss or expired, fetching all cities from Indian Cities API...');

    // Fetch all cities (no search parameter to get all cities)
    const response = await fetch('https://indian-cities.vercel.app/api/cities', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: CityResponse[] = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from API');
    }

    console.log(`Received ${data.length} cities from Indian Cities API`);

    // Transform the data to match the expected format
    const allCities = data.map((city, index) => {
      return {
        id: `${city.name}-${city.state}-${index}`,
        city: city.name,
        stateCode: city.state,
        latitude: city.latitude,
        longitude: city.longitude,
      };
    });

    // Count cities with valid geocodes
    const citiesWithGeocodes = allCities.filter(c => c.latitude && c.longitude).length;
    console.log(`Successfully processed ${allCities.length} total cities (${citiesWithGeocodes} with geocodes)`);

    // Update cache
    citiesCache = allCities;
    cacheTimestamp = Date.now();
    console.log(`Cached ${allCities.length} cities in server memory for ${CACHE_DURATION / (60 * 60 * 1000)} hours`);

    return NextResponse.json(allCities);
  } catch (error: any) {
    console.error("Cities API error:", error.message || error);
    console.error("Full error:", error);

    // If we have cached data (even expired), return it instead of erroring out
    if (citiesCache && citiesCache.length > 0) {
      console.log(`Returning ${citiesCache.length} cities from expired cache due to error`);
      return NextResponse.json(citiesCache);
    }

    return NextResponse.json(
      {
        error: "Failed to load cities",
        message: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}