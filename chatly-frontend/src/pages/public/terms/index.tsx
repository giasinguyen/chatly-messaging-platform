import { Link } from "react-router-dom";

export default function TermsPage() {
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
                    Chatly's Terms of Service
                </h1>

                <div className="mb-12 space-y-2 text-[17px] font-medium text-gray-800 dark:text-[#d1d3da]">
                    <p>Effective: September 29, 2025</p>
                    <p>Last updated: August 29, 2025</p>
                </div>

                <div className="prose prose-blue dark:prose-invert max-w-none">
                    <ol className="list-decimal space-y-3 pl-5 text-[15px] font-medium text-[#0066cc] dark:text-[#5ac8fa]">
                        <li>
                            <a href="#who-we-are" className="hover:underline">
                                Who we are
                            </a>
                        </li>
                        <li>
                            <a href="#age" className="hover:underline">
                                Age requirements and responsibility of parents/legal guardians
                            </a>
                        </li>
                        <li>
                            <a
                                href="#what-to-expect"
                                className="hover:underline"
                            >
                                What you can expect from us
                            </a>
                        </li>
                        <li>
                            <a href="#account" className="hover:underline">
                                Your Chatly account
                            </a>
                        </li>
                        <li>
                            <a href="#content" className="hover:underline">
                                Content in Chatly services
                            </a>
                            <ul className="mt-2 list-disc space-y-2 pl-5">
                                <li>
                                    <a
                                        href="#your-content"
                                        className="hover:underline"
                                    >
                                        Your content
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#chatly-content"
                                        className="hover:underline"
                                    >
                                        Chatly content
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#other-content"
                                        className="hover:underline"
                                    >
                                        Other content
                                    </a>
                                </li>
                            </ul>
                        </li>
                        <li>
                            <a href="#software" className="hover:underline">
                                Software in Chatly services
                            </a>
                        </li>
                        <li>
                            <a href="#copyright" className="hover:underline">
                                Copyright
                            </a>
                        </li>
                        <li>
                            <a
                                href="#paid-services"
                                className="hover:underline"
                            >
                                Chatly's paid services
                            </a>
                        </li>
                        <li>
                            <a href="#restrictions" className="hover:underline">
                                Restrictions on using Chatly services
                            </a>
                        </li>
                        <li>
                            <a href="#termination" className="hover:underline">
                                Term & Termination
                            </a>
                        </li>
                        <li>
                            <a href="#appeals" className="hover:underline">
                                Appeals
                            </a>
                        </li>
                        <li>
                            <a href="#indemnity" className="hover:underline">
                                Indemnity
                            </a>
                        </li>
                        <li>
                            <a href="#asis" className="hover:underline">
                                Services provided "AS IS"
                            </a>
                        </li>
                        <li>
                            <a href="#liability" className="hover:underline">
                                Limitation of liability
                            </a>
                        </li>
                        <li>
                            <a href="#disputes" className="hover:underline">
                                Dispute resolution
                            </a>
                        </li>
                        <li>
                            <a href="#more-stuff" className="hover:underline">
                                Other important items
                            </a>
                        </li>
                    </ol>

                    {/* Simulated Content Bodies */}
                    <div className="mt-16 space-y-12 text-[16px] leading-relaxed text-gray-700 dark:text-[#a0a3ab]">
                        <section id="who-we-are">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                1. Who we are
                            </h2>
                            <p>
                                We are Chatly Inc., and our affiliates. At Chatly,
                                we design and build a platform for you and your community
                                to chat, interact, and share multimedia every day in the
                                most convenient, safe, and fastest way.
                            </p>
                        </section>

                        <section id="age">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                2. Age requirements
                            </h2>
                            <p>
                                By agreeing to these Terms of Service, you confirm
                                that you meet all minimum age requirements under
                                the laws of the country where you reside (typically
                                13 years or older). If you are a parent or legal
                                guardian, you are responsible for managing your
                                child's content when interacting with technology.
                            </p>
                        </section>

                        <section id="what-to-expect">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                3. What you can expect from us
                            </h2>
                            <p>
                                Our commitment is to strive for regular updates,
                                development, and bug fixes to keep the platform
                                stable. We aim for 99.9% availability for the
                                entire core API and messaging infrastructure.
                            </p>
                        </section>

                        <section id="account">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                4. Your Chatly account
                            </h2>
                            <p>
                                You are fully responsible for protecting your account
                                login information. Chatly will not handle compensation
                                liability in cases of information theft due to
                                security flaws in your device, browser, or if you
                                share your account with a third party.
                            </p>
                        </section>

                        <section id="content">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                5. Content in the service
                            </h2>
                            <p>
                                Respecting individual creative rights, however,
                                any individual using Chatly must not upload
                                information contrary to the law, including
                                violent, defamatory content, or anything
                                affecting social ethics.
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
