export const HERO_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1400&q=70",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1400&q=70",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1400&q=70",
];

export const ROUTES: string[] = [
  "All towns",
  "Nairobi — Kilimani",
  "Nairobi — Westlands",
  "Mombasa — Nyali",
  "Kisumu — Milimani",
  "Nakuru — Section 58",
];

export type Amenity = "wifi" | "ac" | "pool" | "parking";

export interface Listing {
  id: string;
  name: string;
  loc: string;
  price: string;
  detail: string;
  img: string;
  gallery: string[];
  video: string;
  description: string;
  features: string[];
  host: string;
  // Card-display fields — derived from the fields above, kept explicit here
  // so the card doesn't have to parse strings like "Verified host · 4.9 rating".
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  rareFind?: boolean;
  rareFindNote?: string;
  guests?: number;
  beds?: number;
  baths?: number;
  amenities?: Amenity[];
}

export const LISTINGS: Listing[] = [
  {
    id: "riverside-2br",
    name: "Riverside 2BR Apartment",
    loc: "Kilimani, Nairobi",
    price: "KES 3,500 / night",
    detail: "Sleeps 4 · wifi · parking",
    img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    description:
      "A bright, modern apartment with open-plan living, a private balcony, and easy access to the city's best cafes, supermarkets, and nightlife.",
    features: [
      "2 bedrooms",
      "2 bathrooms",
      "Fast Wi-Fi",
      "Secure parking",
      "Balcony view",
      "Air conditioning",
    ],
    host: "Verified host · 4.9 rating",
    rating: 4.9,
    verified: true,
    guests: 4,
    beds: 2,
    baths: 2,
    amenities: ["wifi", "ac", "parking"],
  },
  {
    id: "beachfront-studio",
    name: "Beachfront Studio",
    loc: "Nyali, Mombasa",
    price: "KES 5,200 / night",
    detail: "Sleeps 2 · sea view",
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/movie.mp4",
    description:
      "Wake up to sea breeze and sunset views in this stylish studio apartment right by the beach, perfect for a quick coastal escape.",
    features: [
      "1 bedroom",
      "Ocean view",
      "Private patio",
      "Breakfast kitchen",
      "Beach access",
      "Housekeeping",
    ],
    host: "Local host · 5.0 rating",
    rating: 5.0,
    verified: false,
    guests: 2,
    beds: 1,
    amenities: [],
  },
  {
    id: "milimani-garden-flat",
    name: "Milimani Garden Flat",
    loc: "Milimani, Kisumu",
    price: "KES 2,800 / night",
    detail: "Sleeps 3 · garden",
    img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    description:
      "A calm and leafy flat with a quiet garden, ideal for families or guests who want a relaxed rest in a safe neighborhood.",
    features: [
      "3 guests",
      "Garden access",
      "Self check-in",
      "Quiet area",
      "Laundry",
      "Workspace",
    ],
    host: "Verified host · 4.8 rating",
    rating: 4.8,
    verified: true,
    guests: 3,
    amenities: [],
  },
  {
    id: "westlands-loft",
    name: "Westlands Loft Suite",
    loc: "Westlands, Nairobi",
    price: "KES 4,100 / night",
    detail: "Sleeps 2 · rooftop access",
    img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/movie.mp4",
    description:
      "A trendy loft in a buzzing neighborhood with rooftop views, ideal for business trips or city breaks without the usual hotel vibe.",
    features: [
      "Loft layout",
      "Rooftop lounge",
      "Smart TV",
      "High-speed internet",
      "Coffee station",
      "Late check-in",
    ],
    host: "Superhost · 4.9 rating",
    rating: 4.9,
    verified: false,
    guests: 2,
    amenities: ["wifi"],
  },
  {
    id: "nyali-bay-house",
    name: "Nyali Bay House",
    loc: "Nyali, Mombasa",
    price: "KES 6,100 / night",
    detail: "Sleeps 5 · family villa",
    img: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    description:
      "A spacious family villa with bright rooms, a shaded outdoor lounge, and a short drive to the coast for easy evenings out.",
    features: [
      "3 bedrooms",
      "Outdoor seating",
      "Ocean access",
      "Pool nearby",
      "Family friendly",
      "Dedicated parking",
    ],
    host: "Verified host · 5.0 rating",
    rating: 5.0,
    verified: true,
    guests: 5,
    beds: 3,
    amenities: ["pool", "parking"],
  },
  {
    id: "kili-view-flat",
    name: "Kilimani View Flat",
    loc: "Kilimani, Nairobi",
    price: "KES 3,200 / night",
    detail: "Sleeps 2 · quiet street",
    img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/movie.mp4",
    description:
      "A sleek and quiet apartment nestled in a safe neighborhood, perfect for long stays and a smooth work-life balance.",
    features: [
      "2 guests",
      "Quiet residential street",
      "Workspace",
      "Laundry",
      "Security",
      "Close to cafes",
    ],
    host: "Verified host · 4.8 rating",
    rating: 4.8,
    verified: true,
    guests: 2,
    amenities: [],
  },
  {
    id: "westlands-modern-studio",
    name: "Westlands Modern Studio",
    loc: "Westlands, Nairobi",
    price: "KES 4,000 / night",
    detail: "Sleeps 2 · city views",
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
      "https://images.unsplash.com/photo-1560185008-b033106af5c3?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/movie.mp4",
    description:
      "A stylish modern studio in the heart of Westlands, offering a comfortable stay with easy access to restaurants, malls, and entertainment.",
    features: [
      "2 guests",
      "City views",
      "High-speed Wi-Fi",
      "Workspace",
      "Secure parking",
      "Near restaurants and malls",
    ],
    host: "Verified host · 4.9 rating",
    rating: 4.9,
    verified: true,
    guests: 2,
    amenities: ["wifi", "parking"],
  },
  {
    id: "kileleshwa-garden-apartment",
    name: "Kileleshwa Garden Apartment",
    loc: "Kileleshwa, Nairobi",
    price: "KES 3,600 / night",
    detail: "Sleeps 3 · garden setting",
    img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1200&q=80",
    ],
    video: "https://www.w3schools.com/html/movie.mp4",
    description:
      "A peaceful and spacious apartment surrounded by greenery, ideal for guests looking for a relaxing stay while remaining close to Nairobi's main attractions.",
    features: [
      "3 guests",
      "Garden setting",
      "Fast Wi-Fi",
      "Fully equipped kitchen",
      "Laundry",
      "24/7 security",
    ],
    host: "Verified host · 4.7 rating",
    rating: 4.7,
    verified: true,
    guests: 3,
    amenities: ["wifi"],
  },
];