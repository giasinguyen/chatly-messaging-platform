import { CallToAction } from "./components/CallToAction";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { LogoTicker } from "./components/LogoTicker";
import { Pricing } from "./components/Pricing";
import { ProductShowcase } from "./components/ProductShowcase";
import { Testimonials } from "./components/Testimonials";

export default function LandingPage() {
    return (
        <div className="min-h-screen antialiased bg-[#EAEEFE] dark:text-gray-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <Header />
            <Hero />
            <LogoTicker />
            <ProductShowcase />
            <Pricing />
            <Testimonials />
            <CallToAction />
            <Footer />
        </div>
    );
}
