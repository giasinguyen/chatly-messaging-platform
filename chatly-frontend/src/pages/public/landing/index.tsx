import { CallToAction } from "./components/CallToAction";
import { Hero } from "./components/Hero";
import { LogoTicker } from "./components/LogoTicker";
import { ProductShowcase } from "./components/ProductShowcase";
import { SocialShowcase } from "./components/SocialShowcase";
import { Testimonials } from "./components/Testimonials";

export default function LandingPage() {
    return (
        <div
            className="antialiased bg-[#EAEEFE]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            <Hero />
            <LogoTicker />
            <ProductShowcase />
            <SocialShowcase />
            <Testimonials />
            <CallToAction />
        </div>
    );
}
