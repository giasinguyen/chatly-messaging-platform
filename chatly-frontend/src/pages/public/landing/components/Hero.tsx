import ArrowIcon from "@/assets/landing/arrow-right.svg";
import cogImage from "@/assets/landing/68407334ccf9aeca71903bab_home-new.webp";
import cylinderImage from "@/assets/landing/cylinder.png";
import noodleImage from "@/assets/landing/noodle.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
export const Hero = () => {
    const navigate = useNavigate();

    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start end", "end start"],
    });

    const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);
    return (
        <section
            ref={heroRef}
            className="pt-8 pb-20 bg-[radial-gradient(ellipse_200%_100%_at_bottom_left,#183EC2,#EAEEFE_100%)] md:pt-5 md:pb-10 overflow-x-clip"
        >
            <div className="container flex justify-center">
                <div className="md:flex md:items-center md:gap-10 md:max-w-[1040px] w-full">
                    <div className="md:w-[420px] md:flex-shrink-0">
                        <div className="tag">Version 1.0.0 comming soon</div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text mt-6">
                            Chatly
                        </h1>
                        <p className="text-xl text-[#010D3E] tracking-tight mt-6">
                            Your AI-Powered, messaging, storage and
                            collaboration platform
                        </p>
                        <div className="flex gap-1 items-center mt-[30px]">
                            <button className="btn btn-primary" onClick={() => navigate("/auth/login")}>
                                Try now
                            </button>
                            <button className="btn btn-text gap-1" onClick={() => navigate("/auth/register")}>
                                <span>Learn more</span>
                                <img
                                    src={ArrowIcon}
                                    alt="Arrow icon"
                                    className="h-5 w-5"
                                />
                            </button>
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
                            className="hidden md:block md:absolute -top-8 -left-32"
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
