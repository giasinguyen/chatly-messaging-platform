import { MonitorSmartphone, CloudLightning, ShieldCheck } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const slides = [
    {
        title: "Seamless Experience",
        desc: "Connect and work on all devices with always-synced data",
        icon: <MonitorSmartphone className="h-32 w-32 text-[#1a146b]" />,
    },
    {
        title: "Large File Transfer",
        desc: "Send files up to 1GB quickly and conveniently",
        icon: <CloudLightning className="h-32 w-32 text-[#312e81]" />,
    },
    {
        title: "Secure Messaging",
        desc: "Chat securely with end-to-end encryption in all spaces",
        icon: <ShieldCheck className="h-32 w-32 text-[#1a146b]" />,
    },
];

export function WelcomeState() {
    return (
        <main className="flex-1 bg-[#f8f9fa] dark:bg-[#1D1D1F] flex flex-col items-center justify-center p-8 overflow-hidden relative">
            <div className="max-w-[480px] w-full flex flex-col items-center justify-center">
                <h2 className="text-2xl md:text-3xl font-semibold mb-12 text-foreground text-center">
                    Welcome to{" "}
                    <span className="font-bold text-[#1a146b]">
                        Chatly!
                    </span>
                </h2>

                <Carousel 
                    className="w-full" 
                    opts={{ loop: true }}
                    plugins={[Autoplay({ delay: 4500, stopOnInteraction: false })]}
                >
                    <CarouselContent>
                        {slides.map((slide, index) => (
                            <CarouselItem key={index}>
                                <div className="flex flex-col items-center text-center px-4">
                                    <div className="mb-10 opacity-90 animate-in zoom-in duration-500">
                                        {slide.icon}
                                    </div>
                                    <h3 className="text-[#1a146b] font-medium text-lg mb-3">
                                        {slide.title}
                                    </h3>
                                    <p className="text-muted-foreground text-sm max-w-[360px] leading-relaxed">
                                        {slide.desc}
                                    </p>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <div className="flex items-center justify-center mt-12 gap-2">
                        <CarouselPrevious className="relative inset-0 translate-x-0 translate-y-0 h-8 w-8 bg-transparent border-none text-[#1a146b] hover:bg-[#1a146b]/10 hover:text-[#1a146b]" />
                        <CarouselNext className="relative inset-0 translate-x-0 translate-y-0 h-8 w-8 bg-transparent border-none text-[#1a146b] hover:bg-[#1a146b]/10 hover:text-[#1a146b]" />
                    </div>
                </Carousel>
            </div>
        </main>
    );
}
