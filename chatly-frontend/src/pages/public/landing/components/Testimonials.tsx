import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const TESTIMONIAL_AVATARS = [
    { id: "minh", imageSrc: "https://avatars.githubusercontent.com/u/121565657?v=4" },
    { id: "si", imageSrc: "https://avatars.githubusercontent.com/u/63839394?v=4" },
    { id: "tuan", imageSrc: "https://avatars.githubusercontent.com/u/156154739?v=4" },
    { id: "nguyen", imageSrc: "https://avatars.githubusercontent.com/u/126145466?v=4" },
    { id: "paul", imageSrc: "https://avatars.githubusercontent.com/u/121565657?v=4" },
    { id: "ja", imageSrc: "https://avatars.githubusercontent.com/u/63839394?v=4" },
    { id: "yezsu", imageSrc: "https://avatars.githubusercontent.com/u/156154739?v=4" },
    { id: "putin", imageSrc: "https://avatars.githubusercontent.com/u/126145466?v=4" },
    { id: "juno", imageSrc: "https://avatars.githubusercontent.com/u/5250117?v=4" },
] as const;

type TestimonialItem = {
    text: string;
    imageSrc: string;
    name: string;
    username: string;
};

const TestimonialsColumn = (props: {
    testimonials: TestimonialItem[];
    className?: string;
    duration?: number;
}) => {
    return (
        <div className={props.className}>
            <motion.div
                className="flex flex-col gap-6 pb-6"
                animate={{
                    translateY: "-50%",
                }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    repeatType: "loop",
                    duration: props.duration || 10,
                }}
            >
                {[...new Array(2)].fill(0).map((_, index) => (
                    <React.Fragment key={index}>
                        {props.testimonials.map(
                            ({ text, imageSrc, name, username }, itemIndex) => (
                                <div key={name + itemIndex} className="card">
                                    <div>{text}</div>
                                    <div className="flex items-center gap-2 mt-5">
                                        <img
                                            src={imageSrc}
                                            alt={name}
                                            width={40}
                                            height={40}
                                            className="h-10 w-10 rounded-full"
                                        />
                                        <div className="flex flex-col">
                                            <div className="font-medium tracking-tight leading-5">
                                                {name}
                                            </div>
                                            <div className="leading-5 tracking-tight">
                                                {username}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ),
                        )}
                    </React.Fragment>
                ))}
            </motion.div>
        </div>
    );
};

export const Testimonials = () => {
    const { t, i18n } = useTranslation();

    const testimonials = useMemo<TestimonialItem[]>(
        () =>
            TESTIMONIAL_AVATARS.map(({ id, imageSrc }) => ({
                imageSrc,
                text: t(`landing.testimonials.${id}.text`),
                name: t(`landing.testimonials.${id}.name`),
                username: t(`landing.testimonials.${id}.username`),
            })),
        [t, i18n.language],
    );

    const firstColumn = testimonials.slice(0, 3);
    const secondColumn = testimonials.slice(3, 6);
    const thirdColumn = testimonials.slice(6, 9);

    return (
        <section className="bg-white dark:bg-[#1a1c23]">
            <div className="container">
                <div className="section-heading">
                    <div className="flex justify-center">
                        <div className="tag">{t("landing.testimonials.tag")}</div>
                    </div>
                    <h2 className="section-title mt-5">
                        {t("landing.testimonials.title")}
                    </h2>
                    <p className="section-description mt-5">
                        {t("landing.testimonials.description")}
                    </p>
                </div>
                <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] dark:[mask-image:linear-gradient(to_bottom,transparent,white_25%,white_75%,transparent)] mt-10 max-h-[738px] overflow-hidden">
                    <TestimonialsColumn
                        testimonials={firstColumn}
                        duration={15}
                    />
                    <TestimonialsColumn
                        testimonials={secondColumn}
                        duration={19}
                        className="hidden md:flex"
                    />
                    <TestimonialsColumn
                        testimonials={thirdColumn}
                        className="hidden lg:flex"
                        duration={17}
                    />
                </div>
            </div>
        </section>
    );
};
