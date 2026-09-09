import { Wifi } from "lucide-react";

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

export type Amenity = string;

export interface Listing {
  id: string;
  name: string;
  loc: string;
  price: string;
  detail: string;
  img: string;
  gallery: string[];
  description: string;
  features: string[];
  host: string;
  bookingTerms?: string;
  cancelationPolicy?: string;
  houserules?: string[];
  refundPolicy?: string;
  privacyPolicy?: string;
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
    detail: "Max guests: 4 · wifi · parking",
    img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=60",
    gallery: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    ],
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
    host: "Verified",
    bookingTerms:
      "Guests must provide accurate booking information and a valid phone number. Check-in is from 2:00 PM and check-out is by 11:00 AM.",
    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in. Cancellations made less than 48 hours before check-in may incur a charge.",
    houserules: [
      "No smoking inside the apartment",
      "No parties or events",
      "Maximum 4 guests",
      "Keep noise low after 10:00 PM",
      "No pets",
    ],
    refundPolicy:
      "Eligible refunds are processed according to the cancellation policy. Refunds may take 5–10 business days to appear.",
    privacyPolicy:
      "Guest information is used only to process bookings, communicate with guests, and provide the requested accommodation services.",
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
    bookingTerms:
      "Check-in is from 2:00 PM and check-out is by 11:00 AM. Guests must provide valid contact information before arrival.",
    cancelationPolicy:
      "Free cancellation up to 72 hours before check-in. Cancellations within 72 hours may be partially refundable.",
    houserules: [
      "No smoking indoors",
      "No parties or events",
      "Maximum 2 guests",
      "No unregistered overnight guests",
      "Respect quiet hours after 10:00 PM",
    ],
    refundPolicy:
      "Refunds are issued based on the applicable cancellation terms. Processing times may vary depending on the payment method.",
    privacyPolicy:
      "Personal information collected during booking is used to manage your reservation, provide support, and communicate important booking information.",
    rating: 5.0,
    verified: false,
    guests: 2,
    beds: 1,
    baths: 1,
    amenities: ["wifi", "parking", "pool"],
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
    bookingTerms:
      "Bookings are confirmed once payment requirements are completed. Check-in is from 2:00 PM and check-out is by 11:00 AM.",
    cancelationPolicy:
      "Guests may cancel up to 48 hours before check-in for a full eligible refund.",
    houserules: [
      "No smoking indoors",
      "No parties",
      "Maximum 3 guests",
      "Quiet hours after 10:00 PM",
      "Keep shared outdoor areas clean",
    ],
    refundPolicy:
      "Approved refunds are returned to the original payment method where possible and may take several business days to process.",
    privacyPolicy:
      "Booking information is kept confidential and used only for reservation management, communication, and accommodation services.",
    rating: 4.8,
    verified: true,
    guests: 3,
    amenities: ["parking", "wifi"],
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
    bookingTerms:
      "Check-in is available from 3:00 PM and check-out is by 11:00 AM. Guests must follow the property's access instructions.",
    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in. Late cancellations may be subject to a cancellation fee.",
    houserules: [
      "No smoking",
      "No parties or events",
      "Maximum 2 guests",
      "No loud music after 10:00 PM",
      "Rooftop access must follow building rules",
    ],
    refundPolicy:
      "Refund eligibility depends on the cancellation time and booking conditions. Approved refunds are processed after cancellation confirmation.",
    privacyPolicy:
      "Guest details are used to administer reservations, provide customer support, and communicate stay-related information.",
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
    bookingTerms:
      "Check-in is from 2:00 PM and check-out is by 11:00 AM. The property accommodates a maximum of 5 guests.",
    cancelationPolicy:
      "Free cancellation up to 5 days before check-in. Cancellations made closer to arrival may receive a partial refund.",
    houserules: [
      "No smoking inside",
      "No parties or large gatherings",
      "Maximum 5 guests",
      "Children must be supervised outdoors",
      "Respect neighbors and quiet hours",
    ],
    refundPolicy:
      "Refunds are determined according to the cancellation policy. Approved refunds are processed through the original payment method.",
    privacyPolicy:
      "Information provided during booking is used securely for reservation processing, guest communication, and accommodation services.",
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
    bookingTerms:
      "Check-in is from 2:00 PM and check-out is by 11:00 AM. Guests are expected to provide accurate booking details.",
    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in. Late cancellations may be charged according to the booking terms.",
    houserules: [
      "No smoking",
      "No parties",
      "Maximum 2 guests",
      "Quiet hours after 10:00 PM",
      "No unauthorized guests",
    ],
    refundPolicy:
      "Eligible refunds are processed after cancellation and may take several business days depending on the payment provider.",
    privacyPolicy:
      "Guest information is used only for booking management, communication, support, and services directly related to the stay.",
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
    bookingTerms:
      "Check-in is from 2:00 PM and check-out is by 11:00 AM. Guests must follow the property's check-in instructions.",
    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in. Cancellations after this period may qualify for a partial refund.",
    houserules: [
      "No smoking indoors",
      "No parties",
      "Maximum 2 guests",
      "No excessive noise",
      "No unauthorized overnight guests",
    ],
    refundPolicy:
      "Refunds are handled according to the applicable cancellation terms and returned through the original payment method where available.",
    privacyPolicy:
      "Personal information is used to process bookings, communicate with guests, and provide support related to the accommodation.",
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
    bookingTerms:
      "Check-in is from 2:00 PM and check-out is by 11:00 AM. Guests must provide accurate contact details when making a reservation.",
    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in. Cancellations after this period may be partially refundable.",
    houserules: [
      "No smoking inside",
      "No parties or events",
      "Maximum 3 guests",
      "Quiet hours after 10:00 PM",
      "No pets",
    ],
    refundPolicy:
      "Eligible refunds are processed according to the cancellation policy. Processing time depends on the payment method used.",
    privacyPolicy:
      "Guest information is kept private and used only for booking management, communication, customer support, and accommodation services.",
    rating: 4.7,
    verified: true,
    guests: 3,
    amenities: ["wifi"],
  },
];