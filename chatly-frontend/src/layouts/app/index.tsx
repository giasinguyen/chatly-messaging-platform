import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { Sidebar } from "./Sidebar";
import { useUiStore } from "@/store/ui.store";
import { useCallStore } from "@/store/call.store";
import { CallSocketProvider, useCallContext } from "@/contexts/CallContext";
import { CallScreen } from "@/components/call/CallScreen";
import { OutgoingCallScreen } from "@/components/call/OutgoingCallScreen";
import { ActiveCallOverlay } from "@/components/call/ActiveCallOverlay";
import { AnimatePresence, motion } from "framer-motion";

// Inner layout has access to the shared CallSocketProvider
function AppLayoutInner() {
    const { user } = useAuthStore();
    const mobileDrawerOpen = useUiStore((s) => s.mobileDrawerOpen);
    const setMobileDrawerOpen = useUiStore((s) => s.setMobileDrawerOpen);

    const { answerCall, endCall, localStream, remoteStream, upgradeToVideo, toggleCamera } = useCallContext();
    const incomingCall = useCallStore((s) => s.incomingCall);
    const callStatus = useCallStore((s) => s.callStatus);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
            {/* Desktop Sidebar (hidden on mobile max-width: 767px) */}
            <div className="hidden md:flex shrink-0 h-full">
                <Sidebar user={user} />
            </div>

            {/* Mobile Sidebar Drawer */}
            <AnimatePresence>
                {mobileDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                            onClick={() => setMobileDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 bottom-0 left-0 z-50 md:hidden flex shadow-2xl"
                        >
                            <Sidebar user={user} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
                <Outlet />
            </div>

            {/* Màn hình cuộc gọi đến */}
            <CallScreen
                visible={!!incomingCall && callStatus === "RINGING"}
                incomingCall={incomingCall}
                onAccept={() => answerCall(true)}
                onReject={() => answerCall(false)}
            />

            {/* Màn hình cuộc gọi đi (caller đang đổ chuông / bị từ chối) */}
            <OutgoingCallScreen onCancel={endCall} />

            {/* Overlay cuộc gọi đang diễn ra */}
            {callStatus === "ONGOING" && (
                <ActiveCallOverlay
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onEndCall={endCall}
                    onToggleCamera={toggleCamera}
                    onUpgradeToVideo={upgradeToVideo}
                />
            )}
        </div>
    );
}

export default function AppLayout() {
    return (
        <CallSocketProvider>
            <AppLayoutInner />
        </CallSocketProvider>
    );
}

