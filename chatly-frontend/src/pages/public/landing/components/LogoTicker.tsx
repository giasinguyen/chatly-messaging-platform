import githubLogo from "@/assets/landing/sponsors/GitHub_wordmark_light_dark/GitHub_wordmark_light.svg";
import reactLogo from "@/assets/landing/sponsors/React_wordmark_light_dark/React_wordmark_light.svg";
import nginxLogo from "@/assets/landing/sponsors/nginx.svg";
import redisLogo from "@/assets/landing/sponsors/redis.svg";
import shadcnLogo from "@/assets/landing/sponsors/shadcn/ui_dark.svg";
import springLogo from "@/assets/landing/sponsors/spring-wordmark.svg";
import copilotLogo from "@/assets/landing/sponsors/copilot.svg";
import gitlabLogo from "@/assets/landing/sponsors/gitlab.svg";

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
              duration: 10,
              repeat: Infinity,
              ease: 'linear',
              repeatType: "loop"
            }}
          >
            <img src={githubLogo} alt="Acme logo" className="logo-ticker-image" />
            <img src={reactLogo} alt="React logo" className="logo-ticker-image" />
            <img src={nginxLogo} alt="NGINX logo" className="logo-ticker-image" />
            <img src={redisLogo} alt="Redis logo" className="logo-ticker-image" />
            <img src={shadcnLogo} alt="shadcn/ui logo" className="logo-ticker-image" />
            <img src={springLogo} alt="Spring logo" className="logo-ticker-image" />
            <img src={gitlabLogo} alt="Gitlab logo" className="logo-ticker-image" />
            <img src={copilotLogo} alt="Copilot logo" className="logo-ticker-image" />

            {/* second copied section of logos */}
            <img src={githubLogo} alt="Acme logo" className="logo-ticker-image" />
            <img src={reactLogo} alt="React logo" className="logo-ticker-image" />
            <img src={nginxLogo} alt="NGINX logo" className="logo-ticker-image" />
            <img src={redisLogo} alt="Redis logo" className="logo-ticker-image" />
            <img src={shadcnLogo} alt="shadcn/ui logo" className="logo-ticker-image" />
            <img src={springLogo} alt="Spring logo" className="logo-ticker-image" />
            <img src={gitlabLogo} alt="Gitlab logo" className="logo-ticker-image" />
            <img src={copilotLogo} alt="Copilot logo" className="logo-ticker-image" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
