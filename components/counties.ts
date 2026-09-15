/**
 * County data for the "Explore accommodation by county" directory.
 *
 * Images are currently static Unsplash URLs.
 * Later, these can be replaced with Supabase/CDN-hosted images
 * or populated automatically through the Unsplash API.
 */

export type IconKey =
  | "building"
  | "waves"
  | "droplet"
  | "anchor"
  | "sun"
  | "fish"
  | "bird"
  | "paw"
  | "wheat"
  | "mountain"
  | "trees"
  | "leaf";

export interface CountyInfo {
  name: string;
  region: string;

  /** Recorded short-stay listings. null = not tracked yet. */
  listings: number | null;

  /** A well-known tourist attraction or draw. */
  attraction?: string;

  /** Icon used for the fallback thumbnail. */
  iconKey?: IconKey;

  /** Tailwind gradient used if the image fails to load. */
  gradient?: string;

  /** Static Unsplash image URL. */
  imageUrl?: string;
}

export const COUNTIES: CountyInfo[] = [
  {
    name: "Nairobi",
    region: "Nairobi",
    listings: 5240,
    attraction: "Nairobi National Park",
    iconKey: "building",
    gradient: "from-[#1c1f2e] via-[#262a3d] to-[#3a3454]",
    imageUrl:
      "https://images.unsplash.com/photo-1709558459319-2053d7691ab7?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Mombasa",
    region: "Coast",
    listings: 3649,
    attraction: "Fort Jesus",
    iconKey: "waves",
    gradient: "from-[#0e5c57] to-[#159089]",
    imageUrl:
      "https://images.unsplash.com/photo-1707378844990-c3423ade7fea?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Kiambu",
    region: "Central",
    listings: 2210,
    attraction: "Chania Falls",
    iconKey: "droplet",
    gradient: "from-[#1f6f5c] to-[#38a08a]",
    imageUrl:
      "https://images.unsplash.com/photo-1747359637099-82aafad26271?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Kilifi",
    region: "Coast",
    listings: 2404,
    attraction: "Watamu Marine Park",
    iconKey: "anchor",
    gradient: "from-[#0a7ea4] to-[#22bcd4]",
    imageUrl:
      "https://images.unsplash.com/photo-1673262791211-55f7a4e13118?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Kwale",
    region: "Coast",
    listings: 1590,
    attraction: "Diani Beach",
    iconKey: "sun",
    gradient: "from-[#c9573b] to-[#e0904f]",
    imageUrl:
      "https://images.unsplash.com/photo-1651860282131-e3257674ccd1?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Kisumu",
    region: "Nyanza",
    listings: 1120,
    attraction: "Lake Victoria",
    iconKey: "fish",
    gradient: "from-[#204d80] to-[#2f8ba0]",
    imageUrl:
      "https://images.unsplash.com/photo-1751561484224-71ecfb3086d9?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Nakuru",
    region: "Rift Valley",
    listings: 980,
    attraction: "Lake Nakuru flamingos",
    iconKey: "bird",
    gradient: "from-[#6f3f80] to-[#b3538c]",
    imageUrl:
      "https://images.unsplash.com/photo-1758090980104-0fcffcaf71a8?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Narok",
    region: "Rift Valley",
    listings: 720,
    attraction: "Maasai Mara",
    iconKey: "paw",
    gradient: "from-[#7a5a1e] to-[#b8873a]",
    imageUrl:
      "https://images.unsplash.com/photo-1554490754-c1f912ac1b77?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Kajiado",
    region: "Rift Valley",
    listings: 610,
    attraction: "Amboseli National Park",
    iconKey: "mountain",
    gradient: "from-[#4a5f7a] to-[#7ea0b8]",
    imageUrl:
      "https://images.unsplash.com/photo-1631646109206-4b5616964f84?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Uasin Gishu",
    region: "Rift Valley",
    listings: 540,
    attraction: "Eldoret running trails",
    iconKey: "wheat",
    gradient: "from-[#8a6a1e] to-[#c99a2e]",
    imageUrl:
      "https://images.unsplash.com/photo-1663790034135-2406b09eafed?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Nyeri",
    region: "Central",
    listings: 430,
    attraction: "Mount Kenya",
    iconKey: "mountain",
    gradient: "from-[#2c4736] to-[#4d7a5b]",
    imageUrl:
      "https://images.unsplash.com/photo-1768734829789-3f6ddc76a87e?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Laikipia",
    region: "Rift Valley",
    listings: 340,
    attraction: "Ol Pejeta Conservancy",
    iconKey: "paw",
    gradient: "from-[#5a4a2e] to-[#8c7a4a]",
    imageUrl:
      "https://images.unsplash.com/photo-1774800912536-4aaab0653791?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Machakos",
    region: "Eastern",
    listings: 260,
    attraction: "Fourteen Falls",
    iconKey: "droplet",
    gradient: "from-[#2f5c6f] to-[#4a8ea0]",
    imageUrl:
      "https://images.unsplash.com/photo-1663596849080-8fa034fc4ff2?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Kericho",
    region: "Rift Valley",
    listings: 190,
    attraction: "Tea plantations",
    iconKey: "leaf",
    gradient: "from-[#2f6b3f] to-[#4f9a5c]",
    imageUrl:
      "https://images.unsplash.com/photo-1491497895121-1334fc14d8c9?auto=format&fit=crop&w=600&q=80",
  },

  {
    name: "Kakamega",
    region: "Western",
    listings: 150,
    attraction: "Kakamega Forest",
    iconKey: "trees",
    gradient: "from-[#284a2c] to-[#4a7a4f]",
    imageUrl:
      "https://images.unsplash.com/photo-1707819235986-df585047b0c2?auto=format&fit=crop&w=600&q=80",
  },

  // Counties without images/listing data yet

  { name: "Tana River", region: "Coast", listings: null },
  { name: "Lamu", region: "Coast", listings: null },
  { name: "Taita-Taveta", region: "Coast", listings: null },

  { name: "Garissa", region: "North Eastern", listings: null },
  { name: "Wajir", region: "North Eastern", listings: null },
  { name: "Mandera", region: "North Eastern", listings: null },

  { name: "Murang'a", region: "Central", listings: null },
  { name: "Kirinyaga", region: "Central", listings: null },
  { name: "Nyandarua", region: "Central", listings: null },

  { name: "Makueni", region: "Eastern", listings: null },
  { name: "Kitui", region: "Eastern", listings: null },
  { name: "Embu", region: "Eastern", listings: null },
  { name: "Tharaka-Nithi", region: "Eastern", listings: null },
  { name: "Meru", region: "Eastern", listings: null },
  { name: "Isiolo", region: "Eastern", listings: null },
  { name: "Marsabit", region: "Eastern", listings: null },

  { name: "Siaya", region: "Nyanza", listings: null },
  { name: "Homa Bay", region: "Nyanza", listings: null },
  { name: "Migori", region: "Nyanza", listings: null },
  { name: "Kisii", region: "Nyanza", listings: null },
  { name: "Nyamira", region: "Nyanza", listings: null },

  { name: "Trans Nzoia", region: "Rift Valley", listings: null },
  { name: "Bomet", region: "Rift Valley", listings: null },
  { name: "Baringo", region: "Rift Valley", listings: null },
  { name: "Elgeyo-Marakwet", region: "Rift Valley", listings: null },
  { name: "Nandi", region: "Rift Valley", listings: null },
  { name: "Samburu", region: "Rift Valley", listings: null },
  { name: "Turkana", region: "Rift Valley", listings: null },
  { name: "West Pokot", region: "Rift Valley", listings: null },

  { name: "Bungoma", region: "Western", listings: null },
  { name: "Busia", region: "Western", listings: null },
  { name: "Vihiga", region: "Western", listings: null },
];