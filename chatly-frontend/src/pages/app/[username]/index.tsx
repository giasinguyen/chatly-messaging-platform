import { useParams } from "react-router-dom";
import { Grid, Clapperboard, Bookmark, UserSquare, Edit, Settings } from "lucide-react";

export default function UsernameProfilePage() {
    const { username } = useParams<{ username: string }>();

    // Fallback/Mock data for the profile
    const displayUsername = username || "sarah.creative";

    return (
        <div className="w-full h-full overflow-y-auto bg-background hide-scrollbar">
            {/* Mobile Top Nav (Visible only on mobile) */}
            <header className="md:hidden bg-background/80 backdrop-blur-md text-foreground font-inter antialiased top-0 sticky z-40 shadow-sm flex justify-between items-center px-6 py-3 w-full border-b border-border">
                <div className="text-2xl font-black tracking-tight text-foreground">{displayUsername}</div>
            </header>

            <div className="max-w-[1200px] mx-auto pt-8 px-4 md:px-10 pb-10">
                {/* Profile Header Section */}
                <section className="flex flex-col md:flex-row items-start md:items-center gap-10 mb-10">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-24 h-24 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-pink-400 to-indigo-500 relative">
                            <img alt="Profile avatar" className="w-full h-full object-cover rounded-full border-4 border-background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw3BRDDN3ZgW-Wb475jZn6vKeNDX3p2YMNbvoJpJl-pJURfUYnzB2QGyRp70f8Tu6bz4HVIjrq7a2GsL5YlI48LsGyIF1wKGlA8iqcMR1y_mlyM1IeTyOMqGdqneHqub3hgqRqqP_W_UXpRv-KM7XtXa9186wBHIksamlkUsZfWsGkSYLqJSkY3tz2ln5dOqesCJz-aUG0mosaXdgFMG0dniDEE_sptp7l6sST0DHDJ6z6K2C5Z0TLpdeYy8-zF_1-anFHN372J10" />
                        </div>
                    </div>
                    
                    {/* Profile Info */}
                    <div className="flex-1 flex flex-col gap-3 w-full">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <h1 className="text-2xl font-bold text-foreground">{displayUsername}</h1>
                            <div className="flex gap-2">
                                <button className="bg-muted text-foreground py-2 px-4 rounded-lg font-semibold hover:bg-muted/80 transition-colors">
                                    Edit Profile
                                </button>
                                <button className="bg-muted text-foreground py-2 px-4 rounded-lg font-semibold hover:bg-muted/80 transition-colors">
                                    Settings
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex gap-6 my-3">
                            <div className="text-base"><span className="font-bold text-foreground">142</span> <span className="text-muted-foreground">Posts</span></div>
                            <div className="text-base"><span className="font-bold text-foreground">12.4k</span> <span className="text-muted-foreground">Followers</span></div>
                            <div className="text-base"><span className="font-bold text-foreground">450</span> <span className="text-muted-foreground">Following</span></div>
                        </div>
                        
                        <div className="flex flex-col gap-1 max-w-lg">
                            <p className="text-sm font-bold text-foreground">Sarah Jenkins</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">Digital Artist & Photographer 📸
                                Finding beauty in the everyday.
                                Currently exploring Kyoto 🇯🇵
                                Prints available below 👇</p>
                            <a className="text-sm text-brand hover:underline" href="#">sarahcreative.studio/prints</a>
                        </div>
                    </div>
                </section>

                {/* Profile Tabs */}
                <div className="border-t border-border mb-6">
                    <nav className="flex justify-center gap-10">
                        <button className="flex items-center gap-1 py-4 border-t-[1px] border-foreground text-foreground font-semibold uppercase tracking-widest text-sm">
                            <Grid className="w-4 h-4" />
                            Posts
                        </button>
                        <button className="flex items-center gap-1 py-4 border-t-[1px] border-transparent text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-widest text-sm">
                            <Clapperboard className="w-4 h-4" />
                            Reels
                        </button>
                        <button className="flex items-center gap-1 py-4 border-t-[1px] border-transparent text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-widest text-sm">
                            <Bookmark className="w-4 h-4" />
                            Saved
                        </button>
                        <button className="flex items-center gap-1 py-4 border-t-[1px] border-transparent text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-widest text-sm">
                            <UserSquare className="w-4 h-4" />
                            Tagged
                        </button>
                    </nav>
                </div>

                {/* Bento Grid Content (Posts) */}
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {/* Grid Item 1 (Large) */}
                    <div className="col-span-2 row-span-2 aspect-square relative group overflow-hidden bg-muted rounded-lg cursor-pointer">
                        <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdxU5ugVM97kq-OFXMRFQ91X39pQKRgMRKvDSnuZSpvYYntotZAr9UErCFvY9b0i3VxScaGTJmaspR94UFIDLsnv-ggVq2WB__8SDkbwJiZL49ygdteuryIxZ4dHcADaisxu1mPwrdq32RcAHkYDeHeZJRwV1YjEUHeTfVScaSoe0yF6_YQ7ALDcebTc746IfKTkx8BzHE7Cmt7K7A5NM9w3T6TsoNtyI2yQ0o_4Vle7SooleeaAFGQjteDbFX5d-veMe6bsHodso" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-1 font-bold text-sm">
                                <HeartIcon filled /> 1.2k
                            </div>
                            <div className="flex items-center gap-1 font-bold text-sm">
                                <CommentIcon filled /> 84
                            </div>
                        </div>
                    </div>
                    {/* Grid Item 2 */}
                    <div className="aspect-square relative group overflow-hidden bg-muted rounded-lg cursor-pointer">
                        <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCG2pCpGOrpls7Nikqo8zeqf0AAzo5jPmwY58Riwv6DYCikdCIp3-t3ggfNK3jcgePOrGrfeax_sBl8oMTzaE-ISYiw8KiHgP76Pvp8cUFIt9TgqeeAx4CvCCtSPpkoK5F6hlWUEAzdeWEO5uBep47I43-ED9WkwgbNXud0yTfDBOpkEIpIdXg8Wt44e8lRAw5_lta2U-59_NP9T0yuUC0pAOfX_Ei8IgCi0g34karn_C-0T_iOM3t83qrHgH5bs3U2xXhW3JD3gZ0" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-1 font-bold text-sm">
                                <HeartIcon filled /> 856
                            </div>
                        </div>
                    </div>
                    {/* Grid Item 3 */}
                    <div className="aspect-square relative group overflow-hidden bg-muted rounded-lg cursor-pointer">
                        <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDR_FY5mJBrgS2Qi5lP7ZXLZ7FlFLiEi-2AmX-ZdT23LqSPMfTv16IBGtJrZ4ByVPbB4ssjPZM8aKvxD_fFNt3lqJIZKjHPMAZDvTDZCwXR9dBEtPB-J86iFNRRt5d50FDESyq5odhh6fUiphrBQ45UPFuiOwJB-4ITVaRBChoe8mnXfVveth7qWkN5XUEPTK2upPudRdntrOs4lnImxELjXJYov1S1QEEtFC4tdlFttLG4PTqS5MfL3sIw1UVnMe2cA6wf_ftak04" />
                        <div className="absolute top-2 right-2 text-white drop-shadow-md z-10">
                            <CopyIcon />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-1 font-bold text-sm">
                                <HeartIcon filled /> 432
                            </div>
                        </div>
                    </div>
                    {/* Grid Item 4 */}
                    <div className="aspect-square relative group overflow-hidden bg-muted rounded-lg cursor-pointer">
                        <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDn_N54J-ZvbdG1ZSd7y_EEqUiHzaer3l6p6ZKHeyPlGrxuUJnd_BhwifLLZxwFU4nTFJ4vTQ4H8hKjFPc_P4sudPp3VTj0rufj6koDv715LpFddKH9YYoTLAS3318h_3vPrk_rK0usJP4mcgAFU-2vN3b53_rF1swZrCKB5O3kuPImbL2fOnY_EQEPvLZpRDdNScnm45lWpCNCRomAFhT3Wiuf0vRx5_M2TsIQR5kI3giHnzR0XU6MzJZlut8OW2OMTYh-TdrdRoU" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-1 font-bold text-sm">
                                <HeartIcon filled /> 2.1k
                            </div>
                        </div>
                    </div>
                    {/* Grid Item 5 */}
                    <div className="aspect-square relative group overflow-hidden bg-muted rounded-lg cursor-pointer">
                        <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtRzjAKM7DxCVWS4hWj_isXpATr1ZBXZzdu-CN6CLNEwI0q5ml5IqjOoQnp9PolJjz9_hnGjvjIPQhSa2sVvotUIWGOPWFe0xGkvJsJgNs6fRnSxJq3MJoPPqGdZAUiNHA-aXi_pXRV5xeqZCUKpIPsMZydP1OskSqu4TSrQfz7rXuuz7bTh-ENs0Flm_yNOK_qQdo9NTX6_xK3pGMwi7lU9TKGrKWkeg5YiJ-Tr26ywUOaAW8IUswxZMkP4J2sZsjREuqAOM-7sk" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-1 font-bold text-sm">
                                <HeartIcon filled /> 921
                            </div>
                        </div>
                    </div>
                    {/* Grid Item 6 */}
                    <div className="aspect-square relative group overflow-hidden bg-muted rounded-lg cursor-pointer">
                        <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM14XcuxKH3snAZeqijVydLe8LK25h4UTFJaSWF7C-guiCWR3vzAPHVVXvvOWEnq5gPn5eTHzIT5qfzq5Gzuugu4hrTNg2XSLPztjKC8I-FIag-5nU_EOqHO4vWPUgfXLwIk7NnVYyUTgBrSbbawwCi27U4GxQoDcbB1QKXLh_X8egXbTT1DMjzguAxt9bM_E0eWvdmCeTnUfX-P0ahHyb_s-BzLK_YuRr3xWsJqdH33UjmP79N91OPXI09eINc9rTIWzycgZyyyU" />
                        <div className="absolute top-2 right-2 text-white drop-shadow-md z-10">
                            <PlayIcon />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-1 font-bold text-sm">
                                <HeartIcon filled /> 3.4k
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple internal icon components to keep code clean and match the fill state of the design
const HeartIcon = ({ filled }: { filled?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
);

const CommentIcon = ({ filled }: { filled?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
);
