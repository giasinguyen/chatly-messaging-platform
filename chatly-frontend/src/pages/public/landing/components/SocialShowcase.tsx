import cylinderImage from "@/assets/landing/cylinder.png";
import noodleImage from "@/assets/landing/noodle.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const socialImage = "/chatly-image-show-social.png";

export const SocialShowcase = () => {
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });
    const translateY = useTransform(scrollYProgress, [0, 1], [140, -140]);

    return (
        <section
            ref={sectionRef}
            className="bg-white dark:bg-[#1a1c23] py-24 overflow-x-clip"
        >
            <div className="container">
                <div className="section-heading">
                    <div className="flex justify-center">
                        <div className="tag">Social spaces</div>
                    </div>
                    <h2 className="section-title mt-5">
                        Share stories, posts, and moments in one place
                    </h2>
                    <p className="section-description mt-5">
                        Chatly combines messaging with a social feed, reels, and
                        media sharing so conversations stay connected to what
                        people are doing.
                    </p>
                </div>
                <div className="relative">
                    <img
                        src={socialImage}
                        alt="Chatly social feed preview"
                        className="mt-10 w-full rounded-3xl shadow-2xl shadow-black/10"
                    />
                    <motion.img
                        src={cylinderImage}
                        alt=""
                        className="hidden md:block absolute -right-28 -top-24"
                        height={220}
                        width={220}
                        style={{ translateY }}
                    />
                    <motion.img
                        src={noodleImage}
                        alt=""
                        className="hidden md:block absolute bottom-16 -left-32"
                        height={220}
                        width={220}
                        style={{ translateY }}
                    />
                </div>
            </div>
        </section>
    );
};
