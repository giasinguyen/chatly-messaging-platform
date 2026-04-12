import React from "react";
import { motion } from "framer-motion";

const testimonials = [
    {
        text: "The future of communication is fast, decentralized, and user-first. Platforms like this push the internet in the right direction.",
        imageSrc: "https://avatars.githubusercontent.com/u/121565657?v=4",
        name: "Nguyen Van Minh",
        username: "@nvminh162",
    },
    {
        text: "Great products focus on simplicity and community. This platform shows how powerful digital communication can be.",
        imageSrc: "https://avatars.githubusercontent.com/u/63839394?v=4",
        name: "Nguyen Tran Gia Si",
        username: "@giasinguyen ",
    },
    {
        text: "Technology should empower people to collaborate and build together. Tools like this make that possible.",
        imageSrc: "https://avatars.githubusercontent.com/u/156154739?v=4",
        name: "Dao Quoc Tuan",
        username: "@yezsudev",
    },
    {
        text: "Innovation happens when people connect and share ideas. Communication platforms are the backbone of the modern internet.",
        imageSrc: "https://avatars.githubusercontent.com/u/126145466?v=4",
        name: "Nguyen Trung Nguyen",
        username: "@NguyenNguyen0",
    },

    {
        text: "The best products create communities. When people feel connected, amazing things happen.",
        imageSrc: "https://avatars.githubusercontent.com/u/121565657?v=4",
        name: "Paul Nguyen",
        username: "@nvminh162",
    },
    {
        text: "Building tools that help creators and communities thrive is the future of the digital world.",
        imageSrc: "https://avatars.githubusercontent.com/u/63839394?v=4",
        name: "Ja Si",
        username: "@giasinguyen ",
    },
    {
        text: "Communication platforms shape culture. When designed well, they bring people closer together.",
        imageSrc: "https://avatars.githubusercontent.com/u/156154739?v=4",
        name: "Yezsu",
        username: "@yezsudev",
    },
    {
        text: "The power of the internet lies in how we connect and share ideas. Great platforms make that seamless.",
        imageSrc: "https://avatars.githubusercontent.com/u/126145466?v=4",
        name: "Putin Nguyen",
        username: "@NguyenNguyen0",
    },

    {
        text: "Communities are everything online. The right platform can turn a simple idea into a global movement.",
        imageSrc: "https://avatars.githubusercontent.com/u/5250117?v=4",
        name: "JUNO OKYO",
        username: "@J2TEAM",
    },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialsColumn = (props: {
    testimonials: typeof testimonials;
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
                            ({ text, imageSrc, name, username }, index) => (
                                <div key={name + index} className="card">
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
    return (
        <section className="bg-white dark:bg-[#1a1c23]">
            <div className="container">
                <div className="section-heading">
                    <div className="flex justify-center">
                        <div className="tag">Testimonials</div>
                    </div>
                    <h2 className="section-title mt-5">What our users say</h2>
                    <p className="section-description mt-5">
                        From intuitive design to powerful features, our app has
                        become an essential tool for users around the world.
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
