import Navbar from "@/components/navigationBar"
import HeroSection from "@/components/HeroSection"
import QuickRoutes from "@/components/QuickRoutes"
import FeaturedListings from "@/components/FeaturedListings"
import BookingProcess from "@/components/BookingProcess"

export default function Home() {
  return (
    <> 
    <Navbar/>
    <HeroSection/>
    <QuickRoutes/>
    <FeaturedListings/>
    <BookingProcess/>
    </>
  );
}
