import productImage from "@/mocks/images/pc.png";
import pyramidImage from "@/assets/landing/pyramid.png";
import tubeImage from "@/assets/landing/tube.png";
import {motion, useScroll, useTransform} from "framer-motion"
import { useRef } from "react";
export const ProductShowcase = () => {
  const sectionRef = useRef(null)
 const {scrollYProgress} = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  })
  const translateY = useTransform(scrollYProgress, [0, 1], [150, -150])
  return (
    <section ref={sectionRef} className="bg-gradient-to-b from-[#FFFFFF] to-[#EAEEFE] py-24 overflow-x-clip">
      <div className="container">
        <div className="section-heading">
          <div className="flex justify-center">
            <div className="tag">Boost your productivity</div>
          </div>
          <h2 className="section-title mt-5">
            A more effective way to track progress
          </h2>
          <p className="section-description mt-5">
            Effortlessly turn your ideas into a fully functional, responsive,
            SAAS website in just minutes with this template
          </p>
        </div>
        <div className="relative">
          <img src={productImage} alt="Product image" className="mt-10 w-full" />
          <motion.img
            src={pyramidImage}
            alt="pyramid image"
            className="hidden md:block absolute -right-36 -top-32"
            height={262}
            width={262}
            style={{
              translateY
            }}
          />
          <motion.img
            src={tubeImage}
            alt="tube image"
            className="hidden md:block absolute bottom-24 -left-36"
            height={248}
            width={248}
            style={{
              translateY
            }}
          />
        </div>
      </div>
    </section>
  );
};
