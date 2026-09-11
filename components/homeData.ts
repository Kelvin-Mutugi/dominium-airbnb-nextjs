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

  // Booking / pricing
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  pricePerNight: number;
  serviceFeePercent: number;
  cancellationDeadline?: string;

  // Location
  latitude?: number;
  longitude?: number;

  // Card-display fields
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  rareFind?: boolean;
  rareFindNote?: string;
  guests?: number;
  beds?: number;
  baths?: number;
  amenities?: Amenity[];

  // Reviews
  reviews?: {
    id: string;
    guestName: string;
    rating: number;
    comment: string;
    date: string;
  }[];

  // Dates already booked
  bookedDateRanges?: {
    start: string;
    end: string;
  }[];
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
      "A bright, modern apartment with open-plan living, a private balcony, and easy access to the city's best cafes, supermarkets, and nightlife. Perfect for families or groups looking for a comfortable stay in Nairobi.",

    features: [
      "2 bedrooms",
      "2 bathrooms",
      "Fast Wi-Fi",
      "Secure parking",
      "Balcony view",
      "Air conditioning",
    ],

    host: "Verified",

    // Policies
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
      "Eligible refunds are processed according to the cancellation policy.",

    privacyPolicy:
      "Guest information is used only to process bookings, communicate with guests, and provide accommodation services.",

    // Booking
    maxGuests: 4,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 1,
    pricePerNight: 3500,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-10",

    // Location
    latitude: -1.2921,
    longitude: 36.7875,

    // Reviews
    rating: 4.9,
    reviewCount: 18,

    reviews: [
      {
        id: "review-riverside-1",
        guestName: "Brian M.",
        rating: 5,
        comment: "Beautiful apartment and very clean. The location was perfect.",
        date: "2026-08-22",
      },
      {
        id: "review-riverside-2",
        guestName: "Sarah K.",
        rating: 5,
        comment: "Great stay. The apartment looked exactly like the photos.",
        date: "2026-08-10",
      },
      {
        id: "review-riverside-3",
        guestName: "David O.",
        rating: 4,
        comment: "Very comfortable and secure. Would definitely stay again.",
        date: "2026-07-28",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-12",
        end: "2026-09-15",
      },
      {
        start: "2026-09-21",
        end: "2026-09-24",
      },
    ],

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
      "Check-in is from 2:00 PM and check-out is by 11:00 AM.",

    cancelationPolicy:
      "Free cancellation up to 72 hours before check-in.",

    houserules: [
      "No smoking indoors",
      "No parties or events",
      "Maximum 2 guests",
      "No unregistered overnight guests",
      "Respect quiet hours after 10:00 PM",
    ],

    refundPolicy:
      "Refunds are issued according to the applicable cancellation terms.",

    privacyPolicy:
      "Personal information is used to manage reservations and provide accommodation services.",

    maxGuests: 2,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 1,
    pricePerNight: 5200,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-12",

    latitude: -4.0435,
    longitude: 39.7145,

    rating: 5.0,
    reviewCount: 12,

    reviews: [
      {
        id: "review-beach-1",
        guestName: "Mary W.",
        rating: 5,
        comment: "Amazing location and beautiful ocean views.",
        date: "2026-08-30",
      },
      {
        id: "review-beach-2",
        guestName: "Kevin T.",
        rating: 5,
        comment: "Perfect for a weekend getaway.",
        date: "2026-08-15",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-14",
        end: "2026-09-17",
      },
      {
        start: "2026-09-25",
        end: "2026-09-28",
      },
    ],

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
      "Approved refunds are returned to the original payment method where possible.",

    privacyPolicy:
      "Booking information is kept confidential and used only for reservation management.",

    maxGuests: 3,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 1,
    pricePerNight: 2800,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-11",

    latitude: -0.0917,
    longitude: 34.7680,

    rating: 4.8,
    reviewCount: 9,

    reviews: [
      {
        id: "review-milimani-1",
        guestName: "James A.",
        rating: 5,
        comment: "Quiet location and very welcoming host.",
        date: "2026-08-19",
      },
      {
        id: "review-milimani-2",
        guestName: "Lucy N.",
        rating: 4,
        comment: "Nice garden and comfortable rooms.",
        date: "2026-07-31",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-13",
        end: "2026-09-16",
      },
    ],

    verified: true,
    guests: 3,
    beds: 2,
    baths: 1,
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
      "Check-in is available from 3:00 PM and check-out is by 11:00 AM.",

    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in.",

    houserules: [
      "No smoking",
      "No parties or events",
      "Maximum 2 guests",
      "No loud music after 10:00 PM",
      "Follow rooftop building rules",
    ],

    refundPolicy:
      "Refund eligibility depends on the cancellation time and booking conditions.",

    privacyPolicy:
      "Guest details are used to administer reservations and provide customer support.",

    maxGuests: 2,
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 1,
    pricePerNight: 4100,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-12",

    latitude: -1.2676,
    longitude: 36.8033,

    rating: 4.9,
    reviewCount: 24,

    reviews: [
      {
        id: "review-loft-1",
        guestName: "Daniel K.",
        rating: 5,
        comment: "Excellent apartment in a great location.",
        date: "2026-08-28",
      },
      {
        id: "review-loft-2",
        guestName: "Anne W.",
        rating: 5,
        comment: "Very modern and comfortable. Loved the rooftop.",
        date: "2026-08-12",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-11",
        end: "2026-09-13",
      },
      {
        start: "2026-09-20",
        end: "2026-09-23",
      },
    ],

    verified: false,
    guests: 2,
    beds: 1,
    baths: 1,
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
      "Check-in is from 2:00 PM and check-out is by 11:00 AM. Maximum occupancy is 5 guests.",

    cancelationPolicy:
      "Free cancellation up to 5 days before check-in.",

    houserules: [
      "No smoking inside",
      "No parties or large gatherings",
      "Maximum 5 guests",
      "Children must be supervised outdoors",
      "Respect quiet hours",
    ],

    refundPolicy:
      "Refunds are determined according to the cancellation policy.",

    privacyPolicy:
      "Information provided during booking is used securely for reservation processing and guest communication.",

    maxGuests: 5,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 2,
    pricePerNight: 6100,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-15",

    latitude: -4.0346,
    longitude: 39.7132,

    rating: 5.0,
    reviewCount: 31,

    reviews: [
      {
        id: "review-nyali-1",
        guestName: "Peter O.",
        rating: 5,
        comment: "Perfect family accommodation. Very spacious.",
        date: "2026-08-25",
      },
      {
        id: "review-nyali-2",
        guestName: "Grace M.",
        rating: 5,
        comment: "Great stay and very helpful host.",
        date: "2026-08-05",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-18",
        end: "2026-09-22",
      },
      {
        start: "2026-09-27",
        end: "2026-10-02",
      },
    ],

    verified: true,
    guests: 5,
    beds: 3,
    baths: 2,
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
      "Check-in is from 2:00 PM and check-out is by 11:00 AM.",

    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in.",

    houserules: [
      "No smoking",
      "No parties",
      "Maximum 2 guests",
      "Quiet hours after 10:00 PM",
      "No unauthorized guests",
    ],

    refundPolicy:
      "Eligible refunds are processed according to the cancellation policy.",

    privacyPolicy:
      "Guest information is used only for booking management and accommodation services.",

    maxGuests: 2,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 2,
    pricePerNight: 3200,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-12",

    latitude: -1.3008,
    longitude: 36.7876,

    rating: 4.8,
    reviewCount: 15,

    reviews: [
      {
        id: "review-kili-1",
        guestName: "John N.",
        rating: 5,
        comment: "Very quiet and convenient location.",
        date: "2026-08-20",
      },
      {
        id: "review-kili-2",
        guestName: "Esther A.",
        rating: 4,
        comment: "Clean apartment with everything I needed.",
        date: "2026-07-29",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-16",
        end: "2026-09-19",
      },
    ],

    verified: true,
    guests: 2,
    beds: 1,
    baths: 1,
    amenities: ["wifi", "pool"],
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
      "Check-in is from 2:00 PM and check-out is by 11:00 AM.",

    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in.",

    houserules: [
      "No smoking indoors",
      "No parties",
      "Maximum 2 guests",
      "No excessive noise",
      "No unauthorized overnight guests",
    ],

    refundPolicy:
      "Refunds are handled according to the applicable cancellation terms.",

    privacyPolicy:
      "Personal information is used to process bookings and communicate with guests.",

    maxGuests: 2,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 1,
    pricePerNight: 4000,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-13",

    latitude: -1.2671,
    longitude: 36.8061,

    rating: 4.9,
    reviewCount: 21,

    reviews: [
      {
        id: "review-westlands-1",
        guestName: "Michael K.",
        rating: 5,
        comment: "Fantastic studio and excellent location.",
        date: "2026-08-27",
      },
      {
        id: "review-westlands-2",
        guestName: "Naomi W.",
        rating: 5,
        comment: "Clean, modern and very comfortable.",
        date: "2026-08-08",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-10",
        end: "2026-09-12",
      },
      {
        start: "2026-09-22",
        end: "2026-09-25",
      },
    ],

    verified: true,
    guests: 2,
    beds: 1,
    baths: 1,
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
      "Check-in is from 2:00 PM and check-out is by 11:00 AM.",

    cancelationPolicy:
      "Free cancellation up to 48 hours before check-in.",

    houserules: [
      "No smoking inside",
      "No parties or events",
      "Maximum 3 guests",
      "Quiet hours after 10:00 PM",
      "No pets",
    ],

    refundPolicy:
      "Eligible refunds are processed according to the cancellation policy.",

    privacyPolicy:
      "Guest information is kept private and used only for booking management and accommodation services.",

    maxGuests: 3,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    minNights: 2,
    pricePerNight: 3600,
    serviceFeePercent: 0.1,
    cancellationDeadline: "2026-09-14",

    latitude: -1.2917,
    longitude: 36.7786,

    rating: 4.7,
    reviewCount: 11,

    reviews: [
      {
        id: "review-kileleshwa-1",
        guestName: "Carol M.",
        rating: 5,
        comment: "Lovely apartment with a peaceful garden.",
        date: "2026-08-17",
      },
      {
        id: "review-kileleshwa-2",
        guestName: "Samuel O.",
        rating: 4,
        comment: "Good location and very secure.",
        date: "2026-07-24",
      },
    ],

    bookedDateRanges: [
      {
        start: "2026-09-17",
        end: "2026-09-20",
      },
      {
        start: "2026-09-29",
        end: "2026-10-02",
      },
    ],

    verified: true,
    guests: 3,
    beds: 2,
    baths: 1,
    amenities: ["wifi"],
  },
{
  id: "nyali-coastal-2br",
  name: "Nyali Coastal 2BR Apartment",
  loc: "Nyali, Mombasa",
  price: "KES 4,500 / night",
  detail: "Max guests: 4 · wifi · parking",

  img: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=500&q=60",

  gallery: [
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
  ],

  description:
    "A comfortable coastal apartment in Nyali with modern interiors, spacious living areas, and convenient access to beaches, restaurants, shopping centres, and other attractions around Mombasa. Ideal for families or small groups looking for a relaxing coastal stay.",

  features: [
    "2 bedrooms",
    "2 bathrooms",
    "Fast Wi-Fi",
    "Secure parking",
    "Balcony",
    "Air conditioning",
  ],

  host: "Verified",

  // Policies
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
    "Eligible refunds are processed according to the cancellation policy.",

  privacyPolicy:
    "Guest information is used only to process bookings, communicate with guests, and provide accommodation services.",

  // Booking
  maxGuests: 4,
  checkInTime: "2:00 PM",
  checkOutTime: "11:00 AM",
  minNights: 1,
  pricePerNight: 4500,
  serviceFeePercent: 0.1,
  cancellationDeadline: "2026-09-10",

  // Location
  latitude: -4.0435,
  longitude: 39.6682,

  // Reviews
  rating: 4.8,
  reviewCount: 21,

  reviews: [
    {
      id: "review-nyali-1",
      guestName: "Mary W.",
      rating: 5,
      comment:
        "Lovely apartment in a great location. Everything was clean and comfortable.",
      date: "2026-08-24",
    },
    {
      id: "review-nyali-2",
      guestName: "Kevin M.",
      rating: 5,
      comment:
        "The apartment was spacious and close to restaurants and the beach.",
      date: "2026-08-12",
    },
    {
      id: "review-nyali-3",
      guestName: "Ann N.",
      rating: 4,
      comment:
        "Very comfortable stay and the apartment was exactly as described.",
      date: "2026-07-30",
    },
  ],

  bookedDateRanges: [
    {
      start: "2026-09-14",
      end: "2026-09-17",
    },
    {
      start: "2026-09-25",
      end: "2026-09-28",
    },
  ],

  verified: true,
  guests: 4,
  beds: 2,
  baths: 2,
  amenities: ["wifi", "ac", "parking"],
},

{
  id: "bamburi-beach-studio",
  name: "Bamburi Beach Studio",
  loc: "Bamburi, Mombasa",
  price: "KES 2,800 / night",
  detail: "Max guests: 2 · wifi · parking",

  img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=60",

  gallery: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce85?w=1200&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
  ],

  description:
    "A cozy modern studio in Bamburi, ideal for couples or solo travellers visiting the Kenyan coast. The apartment offers a comfortable living space, reliable Wi-Fi, and easy access to Bamburi Beach, restaurants, shops, and local attractions.",

  features: [
    "1 bedroom",
    "1 bathroom",
    "Fast Wi-Fi",
    "Secure parking",
    "Air conditioning",
    "Kitchenette",
  ],

  host: "Verified",

  // Policies
  bookingTerms:
    "Guests must provide accurate booking information and a valid phone number. Check-in is from 2:00 PM and check-out is by 11:00 AM.",

  cancelationPolicy:
    "Free cancellation up to 48 hours before check-in. Cancellations made less than 48 hours before check-in may incur a charge.",

  houserules: [
    "No smoking inside the apartment",
    "No parties or events",
    "Maximum 2 guests",
    "Keep noise low after 10:00 PM",
    "No pets",
  ],

  refundPolicy:
    "Eligible refunds are processed according to the cancellation policy.",

  privacyPolicy:
    "Guest information is used only to process bookings, communicate with guests, and provide accommodation services.",

  // Booking
  maxGuests: 2,
  checkInTime: "2:00 PM",
  checkOutTime: "11:00 AM",
  minNights: 1,
  pricePerNight: 2800,
  serviceFeePercent: 0.1,
  cancellationDeadline: "2026-09-10",

  // Location
  latitude: -3.9894,
  longitude: 39.7195,

  // Reviews
  rating: 4.7,
  reviewCount: 15,

  reviews: [
    {
      id: "review-bamburi-1",
      guestName: "James K.",
      rating: 5,
      comment:
        "Clean and comfortable studio. Great location for a beach trip.",
      date: "2026-08-20",
    },
    {
      id: "review-bamburi-2",
      guestName: "Lucy A.",
      rating: 5,
      comment:
        "The place was cozy and had everything I needed for my stay.",
      date: "2026-08-05",
    },
    {
      id: "review-bamburi-3",
      guestName: "Peter O.",
      rating: 4,
      comment:
        "Good value for the price and easy access to the beach.",
      date: "2026-07-19",
    },
  ],

  bookedDateRanges: [
    {
      start: "2026-09-13",
      end: "2026-09-16",
    },
    {
      start: "2026-09-22",
      end: "2026-09-24",
    },
  ],

  verified: true,
  guests: 2,
  beds: 1,
  baths: 1,
  amenities: ["wifi", "ac", "parking"],
},

];