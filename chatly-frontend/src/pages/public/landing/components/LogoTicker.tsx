import acmeLogo from "@/assets/landing/logo-acme.png";
import quantumLogo from "@/assets/landing/logo-quantum.png";
import echoLogo from "@/assets/landing/logo-echo.png";
import celestialLogo from "@/assets/landing/logo-celestial.png";
import pulseLogo from "@/assets/landing/logo-pulse.png";
import apexLogo from "@/assets/landing/logo-apex.png";
import { motion } from "framer-motion";
export const LogoTicker = () => {
  return (
    <div className="py-8 md:py-12 bg-white">
      <div className="container">
        <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black,transparent)]">
          <motion.div
            className="flex gap-14 flex-none pr-14"
            animate={{
              translateX: "-50%",
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
              repeatType: "loop"
            }}
          >
            <img src={acmeLogo} alt="Acme logo" className="logo-ticker-image" />
            <img src={quantumLogo} alt="Quantum logo" className="logo-ticker-image" />
            <img src={echoLogo} alt="Echo logo" className="logo-ticker-image" />
            <img src={celestialLogo} alt="celestial logo" className="logo-ticker-image" />
            <img src={pulseLogo} alt="pulse logo" className="logo-ticker-image" />
            <img src={apexLogo} alt="apex logo" className="logo-ticker-image" />
            {/* second copied section of logos */}
            <img src={acmeLogo} alt="Acme logo" className="logo-ticker-image" />
            <img src={quantumLogo} alt="Quantum logo" className="logo-ticker-image" />
            <img src={echoLogo} alt="Echo logo" className="logo-ticker-image" />
            <img src={celestialLogo} alt="celestial logo" className="logo-ticker-image" />
            <img src={pulseLogo} alt="pulse logo" className="logo-ticker-image" />
            <img src={apexLogo} alt="apex logo" className="logo-ticker-image" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
