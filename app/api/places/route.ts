import { NextRequest, NextResponse } from 'next/server';
import { cleanPhoneNumber, PhoneAnalysis } from '@/lib/phone-utils';

interface GoogleDisplayName {
  text: string;
  languageCode?: string;
}

interface RawGooglePlace {
  id?: string;
  displayName?: GoogleDisplayName;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryType?: string;
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

    const apiKey = customApiKey || process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'API Key Google Places belum dikonfigurasi. Silakan isi GOOGLE_PLACES_API_KEY di .env.local atau masukkan API Key di formulir.',
        },
        { status: 400 }
      );
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.websiteUri',
      'places.rating',
      'places.userRatingCount',
      'places.types',
      'places.primaryType',
    ].join(',');

    const googleResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'id',
        }),
      }
    );

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json().catch(() => null);
      const errorMessage =
        errorData?.error?.message ||
        `Google Places API mengembalikan status ${googleResponse.status}: ${googleResponse.statusText}`;

      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: googleResponse.status }
      );
    }

    const data = await googleResponse.json();
    const rawPlaces: RawGooglePlace[] = data.places || [];

    const formattedPlaces: PlaceLead[] = rawPlaces.map((place, index) => {
      const id = place.id || `place-${index}-${Date.now()}`;
      const name = place.displayName?.text || 'Tanpa Nama';
      const address = place.formattedAddress || 'Alamat tidak tersedia';
      const nationalPhone = place.nationalPhoneNumber || '';
      const internationalPhone = place.internationalPhoneNumber || '';
      const phoneToAnalyze = internationalPhone || nationalPhone || '';
      const phoneAnalysis = cleanPhoneNumber(phoneToAnalyze);
      const websiteUri = place.websiteUri || null;
      const hasWebsite = Boolean(websiteUri && websiteUri.trim().length > 0);

      return {
        id,
        name,
        formattedAddress: address,
        nationalPhoneNumber: nationalPhone,
        internationalPhoneNumber: internationalPhone,
        websiteUri,
        hasWebsite,
        rating: typeof place.rating === 'number' ? place.rating : 0,
        userRatingCount:
          typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
        types: Array.isArray(place.types) ? place.types : [],
        primaryType: place.primaryType || '',
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
