import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="bg-brand-dark py-12 text-center text-sm text-brand-light/60 dark:bg-[#0f1115] dark:text-gray-400">
            <div className="container px-4 mx-auto">
                <nav className="flex flex-col md:flex-row md:justify-center gap-8 mb-8 font-medium">
                    <Link
                        to="/terms"
                        className="hover:text-brand-light dark:hover:text-white transition-colors"
                    >
                        {t("landing.terms")}
                    </Link>
                    <Link
                        to="/privacy"
                        className="hover:text-brand-light dark:hover:text-white transition-colors"
                    >
                        {t("landing.privacy")}
                    </Link>
                </nav>
                <p className="opacity-80">{t("landing.footer_copyright")}</p>
            </div>
        </footer>
    );
};
