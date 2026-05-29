import starImage from "@/assets/landing/star.png";
import springImage from "@/assets/landing/spring.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const CallToAction = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });
    const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);
    return (
        <section
            ref={sectionRef}
            className="overflow-x-clip bg-gradient-to-b from-white to-[#D2DCFF] dark:from-[#1a1c23] dark:to-brand-dark/20 py-24"
        >
            <div className="container">
                <div className="section-heading relative">
                    <h2 className="section-title">{t("landing.cta.title")}</h2>
                    <p className="section-description mt-5">
                        {t("landing.cta.description")}
                    </p>
                    <motion.img
                        src={starImage}
                        alt=""
                        width={360}
                        className="absolute -left-[350px] -top-[137px]"
                        style={{
                            translateY,
                        }}
                    />
                    <motion.img
                        src={springImage}
                        alt=""
                        width={360}
                        className="absolute -right-[331px] -top-[19px]"
                        style={{
                            translateY,
                        }}
                    />
                </div>
                <div className="mt-10 flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate("/auth/register")}
                        className="btn btn-primary"
                    >
                        {t("landing.cta.button")}
                    </button>
                </div>
            </div>
        </section>
    );
};
