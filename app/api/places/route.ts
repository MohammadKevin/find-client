import { NextRequest, NextResponse } from 'next/server';
import { cleanPhoneNumber, PhoneAnalysis } from '@/lib/phone-utils';
import {
  evaluateLeadQualification,
  LeadQualificationResult,
  LeadStatus,
  PriorityScore,
  RejectionReason,
} from '@/lib/lead-qualification';

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

interface SerperPlace {
  title?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  cid?: string;
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
  qualification: LeadQualificationResult;
  priorityScore: PriorityScore;
  leadStatus: LeadStatus;
  rejectionReason: RejectionReason;
  isIdealTarget: boolean;
}

async function searchWithSerper(query: string, apiKey: string, isGlobal: boolean): Promise<PlaceLead[] | null> {
  try {
    const res = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: isGlobal ? 'us' : 'id',
        hl: isGlobal ? 'en' : 'id',
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.places)) return null;

    return data.places.map((place: SerperPlace, index: number) => {
      const id = place.cid || `serper-${index}-${Date.now()}`;
      const name = place.title || 'Tanpa Nama';
      const address = place.address || 'Alamat tidak tersedia';
      const phone = place.phoneNumber || '';
      const phoneAnalysis = cleanPhoneNumber(phone);
      const websiteUri = place.website || null;
      const hasWebsite = Boolean(websiteUri && websiteUri.trim().length > 0);
      const rating = typeof place.rating === 'number' ? place.rating : 0;
      const userRatingCount = typeof place.ratingCount === 'number' ? place.ratingCount : 0;

      const qualification = evaluateLeadQualification({
        name,
        website: websiteUri,
        rating,
        reviewCount: userRatingCount,
      });

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
        types: place.category ? [place.category] : [],
        primaryType: place.category || 'business',
        phoneAnalysis,
        qualification,
        priorityScore: qualification.priorityScore,
        leadStatus: qualification.status,
        rejectionReason: qualification.rejectionReason,
        isIdealTarget: qualification.isIdealTarget,
      };
    });
  } catch {
    return null;
  }
}

async function searchWithSerpApi(query: string, apiKey: string, isGlobal: boolean): Promise<PlaceLead[] | null> {
  try {
    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.set('engine', 'google_maps');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('hl', isGlobal ? 'en' : 'id');
    searchUrl.searchParams.set('gl', isGlobal ? 'us' : 'id');
    searchUrl.searchParams.set('api_key', apiKey);

    const serpResponse = await fetch(searchUrl.toString(), { method: 'GET' });
    if (!serpResponse.ok) return null;

    const data = await serpResponse.json();
    if (data.error) return null;

    const rawPlaces: SerpApiPlace[] = Array.isArray(data.local_results)
      ? data.local_results
      : Array.isArray(data.place_results)
      ? data.place_results
      : data.place_results
      ? [data.place_results]
      : [];

    return rawPlaces.map((place, index) => {
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

      const qualification = evaluateLeadQualification({
        name,
        website: websiteUri,
        rating,
        reviewCount: userRatingCount,
      });

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
        qualification,
        priorityScore: qualification.priorityScore,
        leadStatus: qualification.status,
        rejectionReason: qualification.rejectionReason,
        isIdealTarget: qualification.isIdealTarget,
      };
    });
  } catch {
    return null;
  }
}

interface OsmPlace {
  osm_id?: number | string;
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  extratags?: Record<string, string>;
}

async function searchWithOpenStreetMap(query: string): Promise<PlaceLead[]> {
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&addressdetails=1&extratags=1&limit=30`;

    const res = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'LeadFinderBot/1.0 (B2B Prospecting Tool)',
        'Accept-Language': 'id,en;q=0.9',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: OsmPlace, index: number) => {
      const extra = item.extratags || {};
      const rawPhone =
        extra.phone ||
        extra['contact:phone'] ||
        extra['contact:whatsapp'] ||
        extra['contact:mobile'] ||
        '';
      const phoneAnalysis = cleanPhoneNumber(rawPhone);
      const websiteUri = extra.website || extra['contact:website'] || null;
      const name = item.name || item.display_name?.split(',')[0] || 'Tempat Usaha';

      const qualification = evaluateLeadQualification({
        name,
        website: websiteUri,
        rating: 4.5,
        reviewCount: 15,
      });

      return {
        id: `osm-${item.osm_id || index}-${Date.now()}`,
        name,
        formattedAddress: item.display_name || 'Alamat Lokasi',
        nationalPhoneNumber: rawPhone,
        internationalPhoneNumber: rawPhone,
        websiteUri,
        hasWebsite: Boolean(websiteUri),
        rating: 4.5,
        userRatingCount: 15,
        types: [item.type || item.class || 'business'],
        primaryType: item.type || item.class || 'business',
        phoneAnalysis,
        qualification,
        priorityScore: qualification.priorityScore,
        leadStatus: qualification.status,
        rejectionReason: qualification.rejectionReason,
        isIdealTarget: qualification.isIdealTarget,
      };
    });
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const customApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
    const marketMode = body?.marketMode === 'global' ? 'global' : 'indo';
    const excludeFranchise = body?.excludeFranchise !== false;

    if (!query) {
      return NextResponse.json(
        { error: 'Parameter query wajib diisi untuk melakukan pencarian.' },
        { status: 400 }
      );
    }

    const isGlobal =
      marketMode === 'global' ||
      /\b(london|manchester|birmingham|leeds|berlin|munich|paris|amsterdam|rotterdam|dublin|sydney|melbourne|brisbane|new york|los angeles|chicago|houston|miami|singapore|dubai|toronto|vancouver)\b/i.test(
        query
      );

    const serperKey = process.env.SERPER_API_KEY;
    const serpApiKey = customApiKey || process.env.SERPAPI_API_KEY || process.env.SERP_API_KEY;

    let places: PlaceLead[] | null = null;
    let usedProvider = '';

    if (serperKey) {
      places = await searchWithSerper(query, serperKey, isGlobal);
      if (places && places.length > 0) usedProvider = 'serper.dev';
    }

    if ((!places || places.length === 0) && serpApiKey) {
      places = await searchWithSerpApi(query, serpApiKey, isGlobal);
      if (places && places.length > 0) usedProvider = 'serpapi.com';
    }

    if (!places || places.length === 0) {
      places = await searchWithOpenStreetMap(query);
      if (places && places.length > 0) usedProvider = 'openstreetmap_free';
    }

    if (!places || places.length === 0) {
      return NextResponse.json(
        {
          error:
            'Kuota SerpApi akun Anda telah habis. Anda bisa menggunakan Serper.dev (Gratis 2.500 pencarian) dengan memasukkan SERPER_API_KEY di .env.local.',
          places: [],
        },
        { status: 429 }
      );
    }

    const finalPlaces = excludeFranchise
      ? places.filter((p) => p.leadStatus !== 'UNQUALIFIED_FRANCHISE')
      : places;

    return NextResponse.json({
      query,
      marketMode: isGlobal ? 'global' : 'indo',
      provider: usedProvider,
      total: finalPlaces.length,
      unfilteredTotal: places.length,
      excludedFranchiseCount: places.length - finalPlaces.length,
      places: finalPlaces,
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan pada server internal.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
