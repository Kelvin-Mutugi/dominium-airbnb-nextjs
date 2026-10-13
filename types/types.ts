export interface Listing {
  id: string;
  title: string;
  location: string;
  distanceLabel?: string;
  pricePerNight: number;
  bedrooms: number;
  guests: number;
  amenities: string[];
  description: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  imageUrl?: string;
  imageUrls?: string[];
}

export interface FilterState {
  minPrice: number;
  maxPrice: number;
  propertyType: string | null;
  bedrooms: string | null;
  amenities: string[];
  groupStayOnly: boolean;
  instantBooking: boolean;
  minRating: number | null;
}

export const DEFAULT_FILTERS: FilterState = {
  minPrice: 0,
  maxPrice: 50000,
  propertyType: null,
  bedrooms: null,
  amenities: [],
  groupStayOnly: false,
  instantBooking: false,
  minRating: null,
};

export interface AmenityOption {
  key: string;
  label: string;
  count: number;
}