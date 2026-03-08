import logo from "@/assets/brand/chatly-logo-transparent.png";
import SocialX from "@/assets/landing/social-x.svg";
import SocialInsta from "@/assets/landing/social-insta.svg";
import SocialLinkedin from "@/assets/landing/social-linkedin.svg";
import SocialPin from "@/assets/landing/social-pin.svg";
import SocialYoutube from "@/assets/landing/social-youtube.svg";

export const Footer = () => {
  return (
    <footer className="bg-black py-10 text-center text-sm text-[#BCBCBC]">
      <div className="container">
        <div className="before:bg-[linear-gradient(to_right,#F87BFF,#FB92CF,#FFDD9B,#C2F0B1,#2FD8FE)] relative inline-flex before:absolute before:top-2 before:bottom-0 before:blur before:w-full before:content-['']">
          <img src={logo} alt="SAAS Logo" height={70} width={70} className="relative" />
        </div>
        <nav className="flex flex-col md:flex-row md:justify-center gap-6 mt-6">
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
        </nav>
        <div className="flex justify-center gap-6 mt-6">
          <img src={SocialX} alt="X" />
          <img src={SocialInsta} alt="Instagram" />
          <img src={SocialLinkedin} alt="LinkedIn" />
          <img src={SocialPin} alt="Pinterest" />
          <img src={SocialYoutube} alt="YouTube" />
        </div>
        <p className="mt-6">
          &copy; 2026 The Challenger Team. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
