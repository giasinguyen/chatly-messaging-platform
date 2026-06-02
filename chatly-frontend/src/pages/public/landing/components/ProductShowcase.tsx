import pyramidImage from "@/assets/landing/pyramid.png";
import tubeImage from "@/assets/landing/tube.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

const productImage = "/chatly-image-show.png";

export const ProductShowcase = () => {
    const { t } = useTranslation();
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });
    const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);
    return (
        <section
            ref={sectionRef}
            className="bg-gradient-to-b from-[#FFFFFF] to-[#EAEEFE] dark:from-[#1a1c23] dark:to-brand-dark/20 py-24 overflow-x-clip"
        >
            <div className="container">
                <div className="section-heading">
                    <div className="flex justify-center">
                        <div className="tag">{t("landing.product.tag")}</div>
                    </div>
                    <h2 className="section-title mt-5">
                        {t("landing.product.title")}
                    </h2>
                    <p className="section-description mt-5">
                        {t("landing.product.description")}
                    </p>
                </div>
                <div className="relative">
                    <img
                        src={productImage}
                        alt={t("landing.product.image_alt")}
                        className="mt-10 w-full"
                    />
                    <motion.img
                        src={pyramidImage}
                        alt=""
                        className="hidden md:block absolute -right-36 -top-32"
                        height={262}
                        width={262}
                        style={{
                            translateY,
                        }}
                    />
                    <motion.img
                        src={tubeImage}
                        alt=""
                        className="hidden md:block absolute bottom-24 -left-36"
                        height={248}
                        width={248}
                        style={{
                            translateY,
                        }}
                    />
                </div>
            </div>
        </section>
    );
};
