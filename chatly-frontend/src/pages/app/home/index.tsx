import { Plus, MoreHorizontal, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useState } from "react";
import { CreatePostModal } from "@/components/app/CreatePostModal";
import { CreateOptionsModal } from "@/components/app/CreateOptionsModal";
import { CreateStoryModal } from "@/components/app/CreateStoryModal";

export default function HomePage() {
    const { user } = useAuthStore();
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);

    return (
        <div className="w-full h-full flex justify-center overflow-y-auto bg-background relative hide-scrollbar">
            {/* Central Feed Area */}
            <div className="w-full max-w-2xl px-4 py-8 flex flex-col gap-8 pb-32">
                {/* Stories Carousel */}
                <div className="w-full relative">
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-3 pt-1 snap-x">
                        {/* Create */}
                        <div
                            className="flex flex-col items-center gap-1 snap-start cursor-pointer group"
                            onClick={() => setShowOptionsModal(true)}
                        >
                            <div className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                                <Plus className="text-muted-foreground w-8 h-8" />
                                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                                    <Plus className="w-3 h-3 font-bold" />
                                </div>
                            </div>
                            <span className="text-sm text-muted-foreground truncate w-16 text-center">Create</span>
                        </div>
                        {/* Active Story 1 */}
                        <div className="flex flex-col items-center gap-1 snap-start cursor-pointer group">
                            <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-brand via-blue-500 to-cyan-400 group-hover:scale-105 transition-transform shadow-sm">
                                <div className="bg-background p-[2px] rounded-full">
                                    <img alt="Story" className="w-14 h-14 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWIy5P8l6JNF01sKwLdXh_Bqx4hB1ASqLsJdcjGIDtUP2IR8A92VdPHY4egj8kzSyaJnG7q-hiCrG8q-hbJkolHBkHMfoq4_y--fWqeQ7jzlcYBF8ENTuBQ2pgoPjB7y86t4MoWCLJMHJa4XtS-ZLmSUyIprcgQHWt7eBC6LpoGRWT5bB85vl7FXpja-LV5UExKUodAliUCrKUs8NqDfLQHT7T_Q1oZfnA-ddJG5uusqqk5-K8uI8wQgfNbnFf4xlclH_DQQQjq0o" />
                                </div>
                            </div>
                            <span className="text-sm text-muted-foreground truncate w-16 text-center">sarah.j</span>
                        </div>
                        {/* Active Story 2 */}
                        <div className="flex flex-col items-center gap-1 snap-start cursor-pointer group">
                            <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-brand via-blue-500 to-cyan-400 group-hover:scale-105 transition-transform shadow-sm">
                                <div className="bg-background p-[2px] rounded-full">
                                    <img alt="Story" className="w-14 h-14 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAw4gelwgK0dfE_fw7_MQ2rTJawfYGmK8TOVxrOhj4dMvTCshE8lzCVsObVpPXba5ZMxW0gcN1evXaPaNBuGFqMKGh6Ga0jLF9S2ixKYhvD3fc0KdM175MrplGkeGvfX3MqjTXK9V05-Zrw_uWFpTkYHL8ZUVuJsHgP-WzYklBWm2RJtmzYwBdHZodqIchpHuv56RNjwYif6V-qem7HDwtCUa3s5o27Zmu9KyALmJYS0jPF2Wnkyk5n4JjBz7yqdTXxxFeXXOOnWbc" />
                                </div>
                            </div>
                            <span className="text-sm text-muted-foreground truncate w-16 text-center">mike_d</span>
                        </div>
                        {/* Active Story 3 */}
                        <div className="flex flex-col items-center gap-1 snap-start cursor-pointer group">
                            <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-brand via-blue-500 to-cyan-400 group-hover:scale-105 transition-transform shadow-sm">
                                <div className="bg-background p-[2px] rounded-full">
                                    <img alt="Story" className="w-14 h-14 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_29HAq7q_ojMDIUuVwdAKcTcajcwjP3BEPCJutZGIymsefjSrIg4opww60hr8N13X9Ur6uFw6HbBrRe1aJ_GQI0o02zwC77CzPHKhjGZJCPJkQj8WgJ56O6GnV7wl7AzeQf9z2hUxOIfaap9urpOaZ3mBJ3uGjcaYWoAJeGIXYCk_WG6LUuxhXesAoNjO3SeSUUlWUrqtT-W5lJWcUZjHDitV9PEK1HUBKV57ZRWylrOrG79J55OGGcnARZ7MLWeN3SM7wo6YCjM" />
                                </div>
                            </div>
                            <span className="text-sm text-muted-foreground truncate w-16 text-center">emma_w</span>
                        </div>
                    </div>
                </div>

                {/* Feed Posts */}
                <div className="flex flex-col gap-8">
                    {/* Post Card 1 */}
                    <article className="bg-card rounded-[24px] p-6 shadow-sm border border-border">
                        {/* Post Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 cursor-pointer">
                                <img alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-border" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdlQDZ-KEw3ik6jcpWcfP5IopF5lA3JSu0X5BxzImcSLLSao6pfN3LD4iZJ8H_r3QWa2bWbCMktJTfEg-wgWZP253El5hztU_X6tVQ5RHICJ50-YI3_mufj43vaQcLAq9A5syJeskJiEZHfsHXpEizq9HpdB-GrP-4lAb2y2gMtPJueE4ZqT62E6mpv-XdxR8uUvOzDWVgaE6AbtPpkuEzm0pPagMbBuaFaLT_Vnjzj-FlDqg5bUdJkOBtoA67tv2_fVEJE0LeEyc" />
                                <div>
                                    <h3 className="font-semibold text-foreground flex items-center gap-1">
                                        sarah.j
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground inline-block"></span>
                                        <span className="text-sm text-muted-foreground font-normal">2h</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground">Kyoto, Japan</p>
                                </div>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Post Media */}
                        <div className="w-full rounded-xl overflow-hidden mb-4 bg-muted">
                            <img alt="Post media" className="w-full h-auto object-cover max-h-[600px]" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgmSL9PPcOx7y3K__MP6Q8PEdNfjPGuoZuqA&s" />
                        </div>
                        {/* Post Actions */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                                <button className="flex items-center gap-1 text-foreground hover:text-red-500 transition-colors group">
                                    <Heart className="w-6 h-6 group-hover:scale-110 transition-transform fill-red-500 text-red-500" />
                                    <span className="font-semibold text-sm">2,451</span>
                                </button>
                                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group">
                                    <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-sm">128</span>
                                </button>
                                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group">
                                    <Send className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground transition-colors group">
                                <Bookmark className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                        {/* Caption & Comments */}
                        <div className="flex flex-col gap-1">
                            <p className="text-base text-foreground">
                                <span className="font-semibold mr-1">sarah.j</span>
                                Evening walks through Gion are truly magical. The lanterns give everything such a warm, nostalgic glow. ✨🏮
                            </p>
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full font-semibold text-[11px] uppercase tracking-wider">#Travel</span>
                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full font-semibold text-[11px] uppercase tracking-wider">#Kyoto</span>
                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full font-semibold text-[11px] uppercase tracking-wider">#Japan</span>
                            </div>
                            <button className="text-muted-foreground text-sm text-left mt-2 hover:underline decoration-border underline-offset-2">
                                View all 128 comments
                            </button>
                            {/* Add Comment Input (Minimal) */}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border relative">
                                <img alt="Your Avatar" className="w-8 h-8 rounded-full object-cover" src={user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDiWCK8eU36XEfrbqiJZBRgtZo4ia0h9UnSXoPZ6TmLd4c4bnTZxeOvu2ljozhYxj1cqN-Bqe6tSMDXNN1cPILsBFaTHYMRgbCV8EtOGgUw__L2SKT-4GmCmoVeLhJKUY5liFTwxe43Uh2O-4ldLr1mADZ06-fj83LbDdgrW8_4LTYCsQ2VgEKOKWAUe52M1waBRbx4qnQ9wdWhwC7nkVKwJemA4vh0ZQqk6HaLqWGMi0r9mE0PNFXfQoBfYJqvLYY8UmWwrNcSfMY"} />
                                <input className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm text-foreground placeholder:text-muted-foreground border-b border-transparent focus:border-brand transition-colors focus:outline-none" placeholder="Add a comment..." type="text" />
                                <button className="text-brand font-semibold text-[13px] hover:text-brand-dark transition-colors">Post</button>
                            </div>
                        </div>
                    </article>

                    {/* Post Card 2 */}
                    <article className="bg-card rounded-[24px] p-6 shadow-sm border border-border">
                        {/* Post Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 cursor-pointer">
                                <img alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-border" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdlQDZ-KEw3ik6jcpWcfP5IopF5lA3JSu0X5BxzImcSLLSao6pfN3LD4iZJ8H_r3QWa2bWbCMktJTfEg-wgWZP253El5hztU_X6tVQ5RHICJ50-YI3_mufj43vaQcLAq9A5syJeskJiEZHfsHXpEizq9HpdB-GrP-4lAb2y2gMtPJueE4ZqT62E6mpv-XdxR8uUvOzDWVgaE6AbtPpkuEzm0pPagMbBuaFaLT_Vnjzj-FlDqg5bUdJkOBtoA67tv2_fVEJE0LeEyc" />
                                <div>
                                    <h3 className="font-semibold text-foreground flex items-center gap-1">
                                        sarah.j
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground inline-block"></span>
                                        <span className="text-sm text-muted-foreground font-normal">2h</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground">Kyoto, Japan</p>
                                </div>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Post Media */}
                        <div className="w-full rounded-xl overflow-hidden mb-4 bg-muted">
                            <img alt="Post media" className="w-full h-auto object-cover max-h-[600px]" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgmSL9PPcOx7y3K__MP6Q8PEdNfjPGuoZuqA&s" />
                        </div>
                        {/* Post Actions */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                                <button className="flex items-center gap-1 text-foreground hover:text-red-500 transition-colors group">
                                    <Heart className="w-6 h-6 group-hover:scale-110 transition-transform fill-red-500 text-red-500" />
                                    <span className="font-semibold text-sm">2,451</span>
                                </button>
                                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group">
                                    <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-sm">128</span>
                                </button>
                                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group">
                                    <Send className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground transition-colors group">
                                <Bookmark className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                        {/* Caption & Comments */}
                        <div className="flex flex-col gap-1">
                            <p className="text-base text-foreground">
                                <span className="font-semibold mr-1">sarah.j</span>
                                Evening walks through Gion are truly magical. The lanterns give everything such a warm, nostalgic glow. ✨🏮
                            </p>
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full font-semibold text-[11px] uppercase tracking-wider">#Travel</span>
                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full font-semibold text-[11px] uppercase tracking-wider">#Kyoto</span>
                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full font-semibold text-[11px] uppercase tracking-wider">#Japan</span>
                            </div>
                            <button className="text-muted-foreground text-sm text-left mt-2 hover:underline decoration-border underline-offset-2">
                                View all 128 comments
                            </button>
                            {/* Add Comment Input (Minimal) */}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border relative">
                                <img alt="Your Avatar" className="w-8 h-8 rounded-full object-cover" src={user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDiWCK8eU36XEfrbqiJZBRgtZo4ia0h9UnSXoPZ6TmLd4c4bnTZxeOvu2ljozhYxj1cqN-Bqe6tSMDXNN1cPILsBFaTHYMRgbCV8EtOGgUw__L2SKT-4GmCmoVeLhJKUY5liFTwxe43Uh2O-4ldLr1mADZ06-fj83LbDdgrW8_4LTYCsQ2VgEKOKWAUe52M1waBRbx4qnQ9wdWhwC7nkVKwJemA4vh0ZQqk6HaLqWGMi0r9mE0PNFXfQoBfYJqvLYY8UmWwrNcSfMY"} />
                                <input className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm text-foreground placeholder:text-muted-foreground border-b border-transparent focus:border-brand transition-colors focus:outline-none" placeholder="Add a comment..." type="text" />
                                <button className="text-brand font-semibold text-[13px] hover:text-brand-dark transition-colors">Post</button>
                            </div>
                        </div>
                    </article>
                </div>
            </div>

            {/* Right Sidebar (Suggested & Profile) */}
            <aside className="w-[340px] flex-shrink-0 pt-8 pr-8 pl-6 hidden xl:block sticky top-0 h-screen overflow-y-auto hide-scrollbar">
                {/* Current User Snippet */}
                <div className="flex items-center justify-between mb-8 bg-card p-3 rounded-xl shadow-sm border border-border">
                    <div className="flex items-center gap-3 cursor-pointer">
                        <img alt="Your Profile" className="w-12 h-12 rounded-full object-cover" src={user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuA6GOYxKIO701rlif0eWimmBX2cov4Sz8bRW3su9fX6rJ0e5HYGbclNYHKzX5vPO5YO5_Wu3dKmSy3449c1CgC2kwjLcNDacsfbPddRBdjVpbD8512XIVJjgm2hpLUFryte8vP9uSsZX8XCiy9hKrMM9smEJ6Dl8RKg2VqQw-1kOFgtQARcci75AJG4iHsCf9jntmetpFMfJLSJGY_aUucGrhfd9oBtz1qTd_HkxqYbUbytZrW1QkuPCL7BqWT2828-TlIOIA_lDo4"} />
                        <div>
                            <h4 className="font-semibold text-foreground">{user?.displayName || "current_user"}</h4>
                            <p className="text-[13px] text-muted-foreground">{user?.email || "user@example.com"}</p>
                        </div>
                    </div>
                    <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors bg-transparent border-none">Switch</button>
                </div>

                {/* Suggestions Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-muted-foreground">Suggested for you</h3>
                    <button className="text-foreground hover:text-brand font-semibold text-[12px] transition-colors">See All</button>
                </div>

                {/* Suggestions List */}
                <div className="flex flex-col gap-4">
                    {/* Suggestion Item */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img alt="Suggestion" className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtQbmCncraFATDL2rxq57BOBFRSyd3MM8ggKQ3XyiZGjSA_rQAnnvxPVB6HrHTQzuTMv1k8275EYSSs6hbO79oyWmM6r_Lu2hkiNf7Ls50D0A8a_Pjnok0z2jyuLVeGd7HBdT43zHFPYChfO08rlcS5ZHYcEcYN2Mws9LzVSvITUKouS3ZOb6HkvIxcnWCj2mxpcbZW5YMEB1AWQlOjsvjUHledXgfndVs8w9QU28RsbMTFDZht_nOpeowT1XFHS-slxGTHcFTDKU" />
                            <div>
                                <h4 className="font-semibold text-foreground">lisa.style</h4>
                                <p className="text-[12px] text-muted-foreground truncate w-32">Followed by sarah.j + 2 more</p>
                            </div>
                        </div>
                        <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors">Follow</button>
                    </div>

                    {/* Suggestion Item */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img alt="Suggestion" className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr8ocsQzubPBaF5JcApmNLdblgg5aNPduaOqmWc9OgoTL1JURALgMri90c1BR2h6DDIXodl0dhfiKonU-t7HF2l3T8X5VQTygdJv75Qe3hzyb1nbo6SqdCQS7B9AdXg1ENvJNf_KPpRy0XfEfyX-JHKpOty-AHyaU9n1i-cGTqXs_HpeKjhgft83bZMqt9e4UI93aVaZb3VEuzV4N8nzgBk5cBdZ3tkwQo4rzcuSho2OWhm_TPMsJQBF6adK05CuBS-8Hjg7HlQLI" />
                            <div>
                                <h4 className="font-semibold text-foreground">dave_travels</h4>
                                <p className="text-[12px] text-muted-foreground truncate w-32">New to ChatLy</p>
                            </div>
                        </div>
                        <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors">Follow</button>
                    </div>

                    {/* Suggestion Item */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img alt="Suggestion" className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWXD73dDQiY-5BdmjbK7M8JU_533AFMvS0dCbSUPWVMvl1pJsj8-qbKgIzBv9QdirT7Y2QSaJi5tUVLL4dKlWVwtR1xt2HTDFeSVeVw19w84VuDS47Rf659j2IUh_ART6HTcFYl4CYkBvi35EDT7pxYck-sA5hcknUgjfd5ZmREd_iozO5q1T5d2TgwA5Pbn4bY90b7xgaqov2W2mFd2qnPkOquRY1qpG6ikAefVc2Qsr-IAKWi9KNx6CJHMuKvAH1G0DrREttu_w" />
                            <div>
                                <h4 className="font-semibold text-foreground">photo_art</h4>
                                <p className="text-[12px] text-muted-foreground truncate w-32">Suggested for you</p>
                            </div>
                        </div>
                        <button className="text-brand font-semibold text-[12px] hover:text-brand-dark transition-colors">Follow</button>
                    </div>
                </div>

                <p className="mt-4 text-[11px] text-muted-foreground text-center">© 2027 ChatLy - The Challenger Team</p>
            </aside>

            <CreateOptionsModal
                isOpen={showOptionsModal}
                onClose={() => setShowOptionsModal(false)}
                onSelectPost={() => {
                    setShowOptionsModal(false);
                    setShowPostModal(true);
                }}
                onSelectStory={() => {
                    setShowOptionsModal(false);
                    setShowStoryModal(true);
                }}
            />

            <CreatePostModal
                isOpen={showPostModal}
                onClose={() => setShowPostModal(false)}
                user={user}
            />

            <CreateStoryModal
                isOpen={showStoryModal}
                onClose={() => setShowStoryModal(false)}
            />
        </div>
    );
}
