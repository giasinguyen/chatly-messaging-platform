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
                        Phiên bản lưu trữ
                    </Link>
                </div>

                <h1 className="mb-8 text-4xl font-extrabold uppercase tracking-[-0.02em] text-gray-900 md:text-5xl lg:text-[56px] lg:leading-[1.1] dark:text-white">
                    Chatly's Terms of Service
                </h1>

                <div className="mb-12 space-y-2 text-[17px] font-medium text-gray-800 dark:text-[#d1d3da]">
                    <p>Có hiệu lực: 29 Tháng 9, 2025</p>
                    <p>Cập nhật lần cuối: 29 Tháng 8, 2025</p>
                </div>

                <div className="prose prose-blue dark:prose-invert max-w-none">
                    <ol className="list-decimal space-y-3 pl-5 text-[15px] font-medium text-[#0066cc] dark:text-[#5ac8fa]">
                        <li>
                            <a href="#who-we-are" className="hover:underline">
                                Chúng tôi là ai
                            </a>
                        </li>
                        <li>
                            <a href="#age" className="hover:underline">
                                Yêu cầu độ tuổi và trách nhiệm của cha mẹ/người
                                giám hộ pháp lý
                            </a>
                        </li>
                        <li>
                            <a
                                href="#what-to-expect"
                                className="hover:underline"
                            >
                                Những gì bạn có thể mong đợi từ chúng tôi
                            </a>
                        </li>
                        <li>
                            <a href="#account" className="hover:underline">
                                Tài khoản Chatly của bạn
                            </a>
                        </li>
                        <li>
                            <a href="#content" className="hover:underline">
                                Nội dung trong dịch vụ của Chatly
                            </a>
                            <ul className="mt-2 list-disc space-y-2 pl-5">
                                <li>
                                    <a
                                        href="#your-content"
                                        className="hover:underline"
                                    >
                                        Nội dung của bạn
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#chatly-content"
                                        className="hover:underline"
                                    >
                                        Nội dung của Chatly
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#other-content"
                                        className="hover:underline"
                                    >
                                        Nội dung khác
                                    </a>
                                </li>
                            </ul>
                        </li>
                        <li>
                            <a href="#software" className="hover:underline">
                                Phần mềm trong dịch vụ của Chatly
                            </a>
                        </li>
                        <li>
                            <a href="#copyright" className="hover:underline">
                                Bản quyền
                            </a>
                        </li>
                        <li>
                            <a
                                href="#paid-services"
                                className="hover:underline"
                            >
                                Dịch vụ trả phí của Chatly
                            </a>
                        </li>
                        <li>
                            <a href="#restrictions" className="hover:underline">
                                Giới hạn trong việc sử dụng dịch vụ của Chatly
                            </a>
                        </li>
                        <li>
                            <a href="#termination" className="hover:underline">
                                Thời hạn & Chấm dứt
                            </a>
                        </li>
                        <li>
                            <a href="#appeals" className="hover:underline">
                                Khiếu nại
                            </a>
                        </li>
                        <li>
                            <a href="#indemnity" className="hover:underline">
                                Bồi thường
                            </a>
                        </li>
                        <li>
                            <a href="#asis" className="hover:underline">
                                Dịch vụ cung cấp "NGUYÊN TRẠNG" (AS IS)
                            </a>
                        </li>
                        <li>
                            <a href="#liability" className="hover:underline">
                                Giới hạn trách nhiệm
                            </a>
                        </li>
                        <li>
                            <a href="#disputes" className="hover:underline">
                                Giải quyết tranh chấp giữa bạn và Chatly
                            </a>
                        </li>
                        <li>
                            <a href="#more-stuff" className="hover:underline">
                                Các nội dung quan trọng khác
                            </a>
                        </li>
                    </ol>

                    {/* Simulated Content Bodies */}
                    <div className="mt-16 space-y-12 text-[16px] leading-relaxed text-gray-700 dark:text-[#a0a3ab]">
                        <section id="who-we-are">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                1. Chúng tôi là ai
                            </h2>
                            <p>
                                Chúng tôi là Chatly Inc., và các công ty liên
                                kết của chúng tôi. Tại Chatly, chúng tôi định
                                hướng và xây dựng nền tảng để bạn và cộng đồng
                                của mình có thể trò chuyện, trao đổi, chia sẻ
                                truyền thông đa phương tiện mỗi ngày một cách
                                thuận tiện, an toàn và nhanh chóng nhất.
                            </p>
                        </section>

                        <section id="age">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                2. Yêu cầu độ tuổi
                            </h2>
                            <p>
                                Bằng việc đồng ý với bộ Điều khoản Dịch vụ này,
                                bạn xác nhận bạn đáp ứng mọi yêu cầu về độ tuổi
                                sử dụng tối thiểu theo luật pháp của quốc gia
                                nơi bạn đang cư trú (thường là 13 tuổi trở lên).
                                Nếu là phụ huynh hoặc người giám hộ hợp pháp,
                                bạn phải có trách nhiệm quản lý nội dung của trẻ
                                khi tiếp xúc công nghệ.
                            </p>
                        </section>

                        <section id="what-to-expect">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                3. Những gì bạn có thể mong đợi từ chúng tôi
                            </h2>
                            <p>
                                Cam kết của chúng tôi là nỗ lực cập nhật, phát
                                triển và sửa lỗi thường xuyên để nền tảng luôn
                                ổn định. Chúng tôi hướng tới tính khả dụng 99.9%
                                đối với toàn bộ hệ thống API và hạ tầng tin nhắn
                                lõi.
                            </p>
                        </section>

                        <section id="account">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                4. Tài khoản Chatly của bạn
                            </h2>
                            <p>
                                Bạn phải hoàn toàn chịu trách nhiệm đối với việc
                                bảo vệ thông tin đăng nhập tài khoản. Chatly sẽ
                                không xử lý trách nhiệm bồi thường trong trường
                                hợp thông tin đánh cắp do lỗi bảo mật từ phía
                                thiết bị, trình duyệt hay việc bạn đưa tài khoản
                                cho người thứ ba.
                            </p>
                        </section>

                        <section id="content">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                5. Nội dung trong dịch vụ
                            </h2>
                            <p>
                                Tôn trọng quyền sáng tạo cá nhân, tuy nhiên mọi
                                cá nhân sử dụng Chatly không được tải lên các
                                thông tin trái với pháp luật, bao gồm nội dung
                                bạo lực, phỉ báng và ảnh hưởng thuần phong mỹ
                                tục.
                            </p>
                        </section>

                        {/* More generic text blocks can be simulated similarly */}
                        <div className="my-10 h-px w-full bg-gray-200 dark:bg-white/10" />
                        <p className="text-sm italic opacity-70">
                            Lưu ý: Nội dung trên là văn bản giả lập
                            (placeholder) nhằm minh họa cấu trúc tài liệu pháp
                            lý của Chatly. Vui lòng tham khảo bộ phận pháp chế
                            để có văn bản chính thức đưa vào khai thác.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
