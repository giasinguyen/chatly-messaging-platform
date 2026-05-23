import { Link } from "react-router-dom";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif] dark:bg-[#1a1c23]">
            {/* Content */}
            <main className="mx-auto max-w-[800px] px-6 py-16 sm:py-24">
                <div className="mb-4">
                    <Link
                        to="#"
                        className="text-[13px] font-medium text-brand hover:underline dark:text-brand-light"
                    >
                        Archived versions
                    </Link>
                </div>

                <h1 className="mb-8 text-4xl font-extrabold uppercase tracking-[-0.02em] text-gray-900 md:text-5xl lg:text-[56px] lg:leading-[1.1] dark:text-white">
                    Chatly Privacy Policy
                </h1>

                <div className="mb-12 space-y-2 text-[17px] font-medium text-gray-800 dark:text-[#d1d3da]">
                    <p>Effective: September 29, 2025</p>
                    <p>Last updated: August 29, 2025</p>
                </div>

                <div className="prose prose-blue dark:prose-invert max-w-none">
                    <ol className="list-decimal space-y-3 pl-5 text-[15px] font-medium text-[#0066cc] dark:text-[#5ac8fa]">
                        <li>
                            <a href="#welcome" className="hover:underline">
                                Welcome!
                            </a>
                        </li>
                        <li>
                            <a href="#about" className="hover:underline">
                                About Chatly
                            </a>
                        </li>
                        <li>
                            <a href="#info-collect" className="hover:underline">
                                Information we collect
                            </a>
                            <ul className="mt-2 list-disc space-y-2 pl-5">
                                <li>
                                    <a
                                        href="#info-provide"
                                        className="hover:underline"
                                    >
                                        Information you provide to us
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#info-auto"
                                        className="hover:underline"
                                    >
                                        Information we collect automatically
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#info-other"
                                        className="hover:underline"
                                    >
                                        Information we receive from other sources
                                    </a>
                                </li>
                            </ul>
                        </li>
                        <li>
                            <a href="#how-use" className="hover:underline">
                                How we use your information
                            </a>
                        </li>
                        <li>
                            <a href="#how-disclose" className="hover:underline">
                                How we disclose your information
                            </a>
                        </li>
                        <li>
                            <a
                                href="#data-retention"
                                className="hover:underline"
                            >
                                Data retention
                            </a>
                        </li>
                        <li>
                            <a href="#how-protect" className="hover:underline">
                                How we protect your information
                            </a>
                        </li>
                        <li>
                            <a href="#how-control" className="hover:underline">
                                How to control your privacy
                            </a>
                        </li>
                        <li>
                            <a
                                href="#international"
                                className="hover:underline"
                            >
                                International data transfers
                            </a>
                        </li>
                        <li>
                            <a
                                href="#third-parties"
                                className="hover:underline"
                            >
                                Third-party services
                            </a>
                        </li>
                        <li>
                            <a href="#changes" className="hover:underline">
                                Changes to this Privacy Policy
                            </a>
                        </li>
                        <li>
                            <a href="#contact" className="hover:underline">
                                Contact us
                            </a>
                        </li>
                    </ol>

                    {/* Simulated Content Bodies */}
                    <div className="mt-16 space-y-12 text-[16px] leading-relaxed text-gray-700 dark:text-[#a0a3ab]">
                        <section id="welcome">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                1. Welcome!
                            </h2>
                            <p>
                                Thank you for using Chatly! We are excited to
                                connect you with your loved ones. This Privacy
                                Policy explains how we collect, use, and share
                                your data, and provides the best privacy
                                controls.
                            </p>
                        </section>

                        <section id="about">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                2. About Chatly
                            </h2>
                            <p>
                                Founded with the mission of creating a safe and
                                private chat space, Chatly is committed to
                                providing a superior experience for millions of
                                users worldwide. Protecting your personal data
                                is our core principle.
                            </p>
                        </section>

                        <section id="info-collect">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                3. Information we collect
                            </h2>
                            <p>
                                When you interact with Chatly, we collect
                                information to provide and improve our services.
                                This includes information you provide directly,
                                device information, and contextual analysis.
                            </p>

                            <h3
                                id="info-provide"
                                className="mt-6 mb-3 text-lg font-bold text-gray-900 dark:text-white"
                            >
                                Information you provide to us
                            </h3>
                            <p>
                                Including email account, display name, avatar,
                                contacts (when permitted), and the content of
                                messages you send in the app. We do not collect
                                personal financial information except when you
                                subscribe to Chatly Pro.
                            </p>

                            <h3
                                id="info-auto"
                                className="mt-6 mb-3 text-lg font-bold text-gray-900 dark:text-white"
                            >
                                Information we collect automatically
                            </h3>
                            <p>
                                We automatically record IP addresses, device types,
                                network operating systems, basic location information
                                (region level), and crash logs to ensure platform
                                stability.
                            </p>
                        </section>

                        <section id="how-use">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                4. How we use your information
                            </h2>
                            <p>
                                Collected data is used solely for maintaining
                                real-time messaging infrastructure, preventing
                                fraud, blocking spam accounts, and improving
                                video call algorithm performance.
                            </p>
                        </section>

                        {/* More generic text blocks can be simulated similarly */}
                        <div className="my-10 h-px w-full bg-gray-200 dark:bg-white/10" />
                        <p className="text-sm italic opacity-70">
                            Note: The above content is placeholder text to
                            illustrate the structure of Chatly's legal documentation.
                            Please consult the legal department for official text
                            for production use.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
