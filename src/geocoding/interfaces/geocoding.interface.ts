// src/geocoding/interfaces/geocoding.interface.ts
export interface GeocodingResult {
    id: string;
    name: string;
    displayName: string;
    latitude: number;
    longitude: number;
    type: string;
    address: {
      road?: string;
      city?: string;
      state?: string;
      country?: string;
      postcode?: string;
    };
    boundingBox?: {
      minLat: number;
      maxLat: number;
      minLon: number;
      maxLon: number;
    };
  }
  
  export interface SearchAddressDto {
    query: string;
    limit?: number;
    countryCode?: string;
  }
  
  export interface ReverseGeocodeDto {
    latitude: number;
    longitude: number;
  }
  
  // src/geocoding/interfaces/nominatim.interface.ts
  export interface NominatimResponse {
    place_id: string;
    licence: string;
    osm_type: string;
    osm_id: string;
    boundingbox: string[];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
    address: {
      road?: string;
      city?: string;
      state?: string;
      country?: string;
      postcode?: string;
      [key: string]: string | undefined;
    };
  }