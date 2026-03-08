import ArrowRightIcon from "@/assets/landing/arrow-right.svg";
import starImage from "@/assets/landing/star.png";
import springImage from "@/assets/landing/spring.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export const CallToAction = () => {
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
            className="overflow-x-clip bg-gradient-to-b from-white to-[#D2DCFF] py-24"
        >
            <div className="container">
                <div className="section-heading relative">
                    <h2 className="section-title">Sign up for free today</h2>
                    <p className="section-description mt-5">
                        Celebrate the joy of accomplishment with an app designed
                        to track your progress and motivate your efforts
                    </p>
                    <motion.img
                        src={starImage}
                        alt="Star image"
                        width={360}
                        className="absolute -left-[350px] -top-[137px]"
                        style={{
                            translateY,
                        }}
                    />
                    <motion.img
                        src={springImage}
                        alt="Spring image"
                        width={360}
                        className="absolute -right-[331px] -top-[19px]"
                        style={{
                            translateY,
                        }}
                    />
                </div>
                <div className="mt-10 flex justify-center gap-2">
                    <button onClick={() => navigate("/auth/register")} className="btn btn-primary">Sign up now</button>
                </div>
            </div>
        </section>
    );
};
