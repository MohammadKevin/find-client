import { NextRequest, NextResponse } from 'next/server';
import { cleanPhoneNumber, PhoneAnalysis } from '@/lib/phone-utils';

interface SerpApiPlace {
  position?: number;
  title?: string;
  name?: string;
  place_id?: string;
  data_id?: string;
  data_cid?: string;
  address?: string;
  phone?: string;
  website?: string;
  link?: string;
  rating?: number;
  reviews?: number;
  user_ratings_total?: number;
  type?: string;
  types?: string[];
  thumbnail?: string;
}

export interface PlaceLead {
  id: string;
  name: string;
  formattedAddress: string;
  nationalPhoneNumber: string;
  internationalPhoneNumber: string;
  websiteUri: string | null;
  hasWebsite: boolean;
  rating: number;
  userRatingCount: number;
  types: string[];
  primaryType: string;
  phoneAnalysis: PhoneAnalysis;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const customApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!query) {
      return NextResponse.json(
        { error: 'Parameter query wajib diisi untuk melakukan pencarian.' },
        { status: 400 }
      );
    }

    const apiKey = customApiKey || process.env.SERPAPI_API_KEY || process.env.SERP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'API Key SerpApi belum dikonfigurasi. Silakan isi SERPAPI_API_KEY di .env.local atau masukkan di menu API Gateway.',
        },
        { status: 400 }
      );
    }

    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.set('engine', 'google_maps');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('hl', 'id');
    searchUrl.searchParams.set('gl', 'id');
    searchUrl.searchParams.set('api_key', apiKey);

    const serpResponse = await fetch(searchUrl.toString(), {
      method: 'GET',
    });

    if (!serpResponse.ok) {
      const errorData = await serpResponse.json().catch(() => null);
      const errorMessage =
        errorData?.error ||
        `SerpApi mengembalikan status ${serpResponse.status}: ${serpResponse.statusText}`;

      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: serpResponse.status }
      );
    }

    const data = await serpResponse.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    const rawPlaces: SerpApiPlace[] = Array.isArray(data.local_results)
      ? data.local_results
      : Array.isArray(data.place_results)
      ? data.place_results
      : data.place_results
      ? [data.place_results]
      : [];

    const formattedPlaces: PlaceLead[] = rawPlaces.map((place, index) => {
      const id =
        place.place_id ||
        place.data_id ||
        place.data_cid ||
        `place-${index}-${Date.now()}`;
      const name = place.title || place.name || 'Tanpa Nama';
      const address = place.address || 'Alamat tidak tersedia';
      const phone = place.phone || '';
      const phoneAnalysis = cleanPhoneNumber(phone);
      const websiteUri = place.website || place.link || null;
      const hasWebsite = Boolean(websiteUri && websiteUri.trim().length > 0);
      const rating = typeof place.rating === 'number' ? place.rating : 0;
      const userRatingCount =
        typeof place.reviews === 'number'
          ? place.reviews
          : typeof place.user_ratings_total === 'number'
          ? place.user_ratings_total
          : 0;

      const types = Array.isArray(place.types)
        ? place.types
        : place.type
        ? [place.type]
        : [];

      return {
        id,
        name,
        formattedAddress: address,
        nationalPhoneNumber: phone,
        internationalPhoneNumber: phone,
        websiteUri,
        hasWebsite,
        rating,
        userRatingCount,
        types,
        primaryType: place.type || (types.length > 0 ? types[0] : ''),
        phoneAnalysis,
      };
    });

    return NextResponse.json({
      query,
      total: formattedPlaces.length,
      places: formattedPlaces,
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan pada server internal.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
