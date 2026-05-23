import cogImage from "@/assets/landing/68407334ccf9aeca71903bab_home-new.webp";
import cylinderImage from "@/assets/landing/cylinder.png";
import noodleImage from "@/assets/landing/noodle.png";
import appStoreImg from "@/assets/landing/appstore.png";
import googlePlayImg from "@/assets/landing/google_play_transparent.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import "./hero.css";

export const Hero = () => {
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start end", "end start"],
    });

    const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);
    return (
        <section
            ref={heroRef}
            className="hero-section relative pt-20 pb-20 md:pb-10 overflow-x-clip"
        >
            {/* Blobs */}
            <div className="hero-blob absolute -top-[10%] -left-[5%] h-[400px] w-[400px] rounded-full bg-brand-light opacity-35 blur-[80px]" />
            <div className="hero-blob absolute -right-[3%] -bottom-[8%] h-[300px] w-[300px] rounded-full bg-brand opacity-35 blur-[80px] [animation-delay:3s]" />
            <div className="hero-blob absolute top-[20%] right-[10%] h-[200px] w-[200px] rounded-full bg-brand-light opacity-35 blur-[80px] [animation-delay:6s]" />
            <div className="hero-blob absolute bottom-[15%] left-[8%] h-[250px] w-[250px] rounded-full bg-brand-dark opacity-35 blur-[80px] [animation-delay:9s]" />

            {/* Stars */}
            <div className="pointer-events-none absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="hero-star absolute rounded-full bg-white/70"
                        style={{
                            left: `${(i * 53) % 100}%`,
                            top: `${(i * 37) % 100}%`,
                            animationDelay: `${(i * 0.2) % 4}s`,
                            width: `${2 + (i % 3)}px`,
                            height: `${2 + (i % 3)}px`,
                        }}
                    />
                ))}
            </div>
            <div className="relative z-10 container flex justify-center">
                <div className="md:flex md:items-center md:gap-10 md:max-w-[1040px] w-full">
                    <div className="md:w-[420px] md:flex-shrink-0">
                        <div className="tag">Version 1.0.0 coming soon</div>
                        <h1 className="text-7xl md:text-8xl font-bold tracking-tighter bg-gradient-to-b from-black to-brand dark:from-white dark:to-brand-light text-transparent bg-clip-text mt-6">
                            Chatly
                        </h1>
                        <p className="text-xl text-gray-900 dark:text-gray-100 tracking-tight mt-6">
                            Your AI-Powered, messaging, storage and
                            collaboration platform
                        </p>

                        {/* Download section */}
                        <div className="mt-8 flex items-center gap-5 mt-15">
                            {/* QR code */}
                            {/* <div className="flex-shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 p-2 shadow-md border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center h-[88px] w-[88px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase text-center leading-tight">
                                    Coming<br/>Soon
                                </p>
                            </div> */}
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Scan to download
                                </p>
                                <div className="flex flex-row gap-5 justify-center">
                                    <a
                                        href="#"
                                        onClick={(e) => e.preventDefault()}
                                        title="Coming soon"
                                        className="cursor-not-allowed"
                                    >
                                        <img
                                            src={googlePlayImg}
                                            alt="Get it on Google Play"
                                            className="h-9 w-auto object-contain"
                                        />
                                    </a>
                                    <a
                                        href="#"
                                        onClick={(e) => e.preventDefault()}
                                        title="Coming soon"
                                        className="cursor-not-allowed"
                                    >
                                        <img
                                            src={appStoreImg}
                                            alt="Download on the App Store"
                                            className="h-9 w-auto object-contain"
                                        />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-20 md:mt-0 md:h-[580px] md:w-[580px] md:flex-shrink-0 relative">
                        <motion.img
                            src={cogImage}
                            alt="cog"
                            className="md:absolute md:h-full md:w-auto md:max-w-[580px] md:right-0 md:left-auto"
                            animate={{
                                translateY: [-30, 30],
                            }}
                            transition={{
                                repeat: Infinity,
                                repeatType: "mirror",
                                duration: 3,
                                ease: "easeInOut",
                            }}
                        />
                        <motion.img
                            src={cylinderImage}
                            alt="cylinder image"
                            width={220}
                            height={220}
                            className="hidden md:block md:absolute top-10 -left-32"
                            style={{
                                translateY: translateY,
                            }}
                        />
                        <motion.img
                            src={noodleImage}
                            alt="noodle image"
                            width={220}
                            height={220}
                            className="hidden lg:block absolute top-[420px] -right-35 left-auto rotate-[30deg]"
                            style={{
                                rotate: 30,
                                translateY: translateY,
                            }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};
