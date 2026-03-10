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
                        Phiên bản lưu trữ
                    </Link>
                </div>

                <h1 className="mb-8 text-4xl font-extrabold uppercase tracking-[-0.02em] text-gray-900 md:text-5xl lg:text-[56px] lg:leading-[1.1] dark:text-white">
                    Chatly Privacy Policy
                </h1>

                <div className="mb-12 space-y-2 text-[17px] font-medium text-gray-800 dark:text-[#d1d3da]">
                    <p>Có hiệu lực: 29 Tháng 9, 2025</p>
                    <p>Cập nhật lần cuối: 29 Tháng 8, 2025</p>
                </div>

                <div className="prose prose-blue dark:prose-invert max-w-none">
                    <ol className="list-decimal space-y-3 pl-5 text-[15px] font-medium text-[#0066cc] dark:text-[#5ac8fa]">
                        <li>
                            <a href="#welcome" className="hover:underline">
                                Chào mừng!
                            </a>
                        </li>
                        <li>
                            <a href="#about" className="hover:underline">
                                Đôi nét về Chatly
                            </a>
                        </li>
                        <li>
                            <a href="#info-collect" className="hover:underline">
                                Thông tin chúng tôi thu thập
                            </a>
                            <ul className="mt-2 list-disc space-y-2 pl-5">
                                <li>
                                    <a
                                        href="#info-provide"
                                        className="hover:underline"
                                    >
                                        Thông tin bạn cung cấp cho chúng tôi
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#info-auto"
                                        className="hover:underline"
                                    >
                                        Thông tin chúng tôi thu thập tự động
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#info-other"
                                        className="hover:underline"
                                    >
                                        Thông tin chúng tôi nhận từ các nguồn
                                        khác
                                    </a>
                                </li>
                            </ul>
                        </li>
                        <li>
                            <a href="#how-use" className="hover:underline">
                                Cách chúng tôi sử dụng thông tin của bạn
                            </a>
                        </li>
                        <li>
                            <a href="#how-disclose" className="hover:underline">
                                Cách chúng tôi tiết lộ thông tin của bạn
                            </a>
                        </li>
                        <li>
                            <a
                                href="#data-retention"
                                className="hover:underline"
                            >
                                Lưu giữ dữ liệu
                            </a>
                        </li>
                        <li>
                            <a href="#how-protect" className="hover:underline">
                                Cách chúng tôi bảo vệ thông tin của bạn
                            </a>
                        </li>
                        <li>
                            <a href="#how-control" className="hover:underline">
                                Cách kiểm soát quyền riêng tư của bạn
                            </a>
                        </li>
                        <li>
                            <a
                                href="#international"
                                className="hover:underline"
                            >
                                Chuyển dữ liệu quốc tế
                            </a>
                        </li>
                        <li>
                            <a
                                href="#third-parties"
                                className="hover:underline"
                            >
                                Dịch vụ do bên thứ ba cung cấp
                            </a>
                        </li>
                        <li>
                            <a href="#changes" className="hover:underline">
                                Các thay đổi đối với Chính sách Bảo mật này
                            </a>
                        </li>
                        <li>
                            <a href="#contact" className="hover:underline">
                                Liên hệ với chúng tôi
                            </a>
                        </li>
                    </ol>

                    {/* Simulated Content Bodies */}
                    <div className="mt-16 space-y-12 text-[16px] leading-relaxed text-gray-700 dark:text-[#a0a3ab]">
                        <section id="welcome">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                1. Chào mừng!
                            </h2>
                            <p>
                                Cảm ơn bạn đã sử dụng Chatly! Chúng tôi rất vui
                                mừng được kết nối bạn với những người bạn yêu
                                thương. Chính sách Bảo mật này giải thích cách
                                chúng tôi thực hiện việc thu thập, sử dụng và
                                chia sẻ dữ liệu của bạn, đồng thời cung cấp các
                                biện pháp kiểm soát quyền riêng tư tối ưu nhất.
                            </p>
                        </section>

                        <section id="about">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                2. Đôi nét về Chatly
                            </h2>
                            <p>
                                Được thành lập với sứ mệnh tạo ra không gian trò
                                chuyện an toàn và riêng tư, Chatly cam kết mang
                                lại trải nghiệm ưu việt cho hàng triệu người
                                dùng trên toàn thế giới. Bảo vệ dữ liệu cá nhân
                                của bạn là tôn chỉ cốt lõi của chúng tôi.
                            </p>
                        </section>

                        <section id="info-collect">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                3. Thông tin chúng tôi thu thập
                            </h2>
                            <p>
                                Khi bạn tương tác với Chatly, chúng tôi thu thập
                                thông tin để cung cấp và cải thiện dịch vụ.
                                Thông tin này bao gồm những gì bạn trực tiếp
                                cung cấp, thông tin thiết bị và các phân tích
                                ngữ cảnh.
                            </p>

                            <h3
                                id="info-provide"
                                className="mt-6 mb-3 text-lg font-bold text-gray-900 dark:text-white"
                            >
                                Thông tin bạn cung cấp cho chúng tôi
                            </h3>
                            <p>
                                Bao gồm tài khoản email, tên hiển thị, hình đại
                                diện, danh bạ liên lạc (khi được cấp quyền) và
                                nội dung tin nhắn bạn gửi trong ứng dụng. Chúng
                                tôi không thu thập thông tin tài chính cá nhân
                                ngoại trừ khi bạn đăng ký gói Chatly Pro.
                            </p>

                            <h3
                                id="info-auto"
                                className="mt-6 mb-3 text-lg font-bold text-gray-900 dark:text-white"
                            >
                                Thông tin chúng tôi thu thập tự động
                            </h3>
                            <p>
                                Chúng tôi tự động ghi nhận địa chỉ IP, loại
                                thiết bị, hệ điều hành mạng, thông tin định vị
                                cơ bản (cấp độ khu vực) và lịch sử lỗi (crash
                                logs) để đảm bảo ổn định của nền tảng.
                            </p>
                        </section>

                        <section id="how-use">
                            <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                4. Cách chúng tôi sử dụng thông tin của bạn
                            </h2>
                            <p>
                                Dữ liệu thu thập được dùng duy nhất vào mục đích
                                duy trì hạ tầng tin nhắn thời gian thực, ngăn
                                chặn gian lận, chặn tài khoản spam và nâng cấp
                                hiệu năng thuật toán gọi video.
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
