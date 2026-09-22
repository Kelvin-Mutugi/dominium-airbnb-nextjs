export interface HomepageDestination {
  slug: string;
  label: string;
  searchTerms: string[];
}

// Server-controlled homepage sections. Add or remove destinations here without
// creating another section component or changing the homepage rendering logic.
export const HOMEPAGE_DESTINATIONS: HomepageDestination[] = [
  { slug: "Nairobi", label: "Stay in Nairobi", searchTerms: ["nairobi"] },
  { slug: "Mombasa", label: "Our Mombasa Homes", searchTerms: ["mombasa"] },
//   { slug: "Nakuru", label: "Stay in Nakuru", searchTerms: ["nakuru"] },
  { slug: "Diani", label: "Discover Diani", searchTerms: ["diani"] },
  { slug: "Malindi", label: "Stay in Malindi", searchTerms: ["malindi"] },
];
