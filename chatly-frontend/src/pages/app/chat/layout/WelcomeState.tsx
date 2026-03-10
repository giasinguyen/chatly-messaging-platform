import { MonitorSmartphone, CloudLightning, ShieldCheck } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

const slides = [
    {
        title: "Trải nghiệm xuyên suốt",
        desc: "Kết nối và giải quyết công việc trên mọi thiết bị với dữ liệu luôn được đồng bộ",
        icon: <MonitorSmartphone className="h-32 w-32 text-brand" />,
    },
    {
        title: "Gửi file nặng dễ dàng",
        desc: "Đã có thể gửi file lên tới 1GB nhanh chóng và tiện lợi",
        icon: <CloudLightning className="h-32 w-32 text-brand" />,
    },
    {
        title: "Bảo mật tin nhắn",
        desc: "Trò chuyện an toàn với mã hoá đầu cuối cho mọi không gian",
        icon: <ShieldCheck className="h-32 w-32 text-brand" />,
    },
];

export function WelcomeState() {
    return (
        <main className="flex-1 bg-[#F5F5F7] dark:bg-[#1D1D1F] flex flex-col items-center justify-center p-8 overflow-hidden relative">
            <div className="max-w-[480px] w-full flex flex-col items-center justify-center">
                <h2 className="text-2xl font-semibold mb-12 text-foreground text-center">
                    Chào mừng đến với{" "}
                    <span className="font-bold text-foreground">
                        Chatly PC!
                    </span>
                </h2>

                <Carousel className="w-full" opts={{ loop: true }}>
                    <CarouselContent>
                        {slides.map((slide, index) => (
                            <CarouselItem key={index}>
                                <div className="flex flex-col items-center text-center px-4">
                                    <div className="mb-10 opacity-90 animate-in zoom-in duration-500">
                                        {slide.icon}
                                    </div>
                                    <h3 className="text-brand font-medium text-lg mb-3">
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
                        <CarouselPrevious className="relative inset-0 translate-x-0 translate-y-0 h-8 w-8 bg-transparent border-none text-brand hover:bg-brand/10 hover:text-brand" />
                        <CarouselNext className="relative inset-0 translate-x-0 translate-y-0 h-8 w-8 bg-transparent border-none text-brand hover:bg-brand/10 hover:text-brand" />
                    </div>
                </Carousel>
            </div>
        </main>
    );
}

