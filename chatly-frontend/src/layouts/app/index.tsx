import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { Sidebar } from "./Sidebar";
import { useUiStore } from "@/store/ui.store";
import { useCallStore } from "@/store/call.store";
import { CallSocketProvider, useCallContext } from "@/contexts/CallContext";
import { CallScreen } from "@/components/call/CallScreen";
import { OutgoingCallScreen } from "@/components/call/OutgoingCallScreen";
import { ActiveCallOverlay } from "@/components/call/ActiveCallOverlay";
import { GroupCallScreen } from "@/components/call/GroupCallScreen";
import { GroupCallOverlay } from "@/components/call/GroupCallOverlay";
import { VideoUpgradeRequestDialog } from "@/components/call/VideoUpgradeRequestDialog";
import { GroupVideoUpgradeRequestDialog } from "@/components/call/GroupVideoUpgradeRequestDialog";
import { AnimatePresence, motion } from "framer-motion";

// Inner layout has access to the shared CallSocketProvider
function AppLayoutInner() {
    const { user } = useAuthStore();
    const mobileDrawerOpen = useUiStore((s) => s.mobileDrawerOpen);
    const setMobileDrawerOpen = useUiStore((s) => s.setMobileDrawerOpen);

    const {
        answerCall,
        endCall,
        localStream,
        remoteStream,
        upgradeToVideo,
        toggleCamera,
        incomingVideoUpgradeRequest,
        respondToVideoUpgradeRequest,
        joinGroupCall,
        leaveGroupCall,
        upgradeGroupCallToVideo,
        incomingGroupVideoUpgradeRequest,
        respondToGroupVideoUpgradeRequest,
        groupLocalStream,
        groupRemoteStreams,
        groupToggleMute,
        groupToggleCamera,
    } = useCallContext();
    const incomingCall = useCallStore((s) => s.incomingCall);
    const incomingGroupCall = useCallStore((s) => s.incomingGroupCall);
    const callStatus = useCallStore((s) => s.callStatus);
    const isGroupCall = useCallStore((s) => s.isGroupCall);

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

            {/* Incoming 1-1 call screen */}
            <CallScreen
                visible={!!incomingCall && callStatus === "RINGING" && !incomingGroupCall}
                incomingCall={incomingCall}
                onAccept={() => answerCall(true)}
                onReject={() => answerCall(false)}
            />

            {/* Incoming group call screen */}
            <GroupCallScreen
                visible={!!incomingGroupCall && callStatus === "RINGING"}
                incomingGroupCall={incomingGroupCall}
                onJoin={() => joinGroupCall(true)}
                onDecline={() => joinGroupCall(false)}
            />

            {/* Outgoing call screen (caller ringing / rejected) */}
            <OutgoingCallScreen onCancel={isGroupCall ? leaveGroupCall : endCall} />

            {/* Active group call overlay — shows for both initiator (RINGING) and joined participants (ONGOING) */}
            {isGroupCall && !incomingGroupCall && (callStatus === "ONGOING" || callStatus === "RINGING") && (
                <GroupCallOverlay
                    groupLocalStream={groupLocalStream}
                    groupRemoteStreams={groupRemoteStreams}
                    onLeave={leaveGroupCall}
                    onToggleMute={groupToggleMute}
                    onToggleCamera={groupToggleCamera}
                    onUpgradeToVideo={upgradeGroupCallToVideo}
                />
            )}

            {/* Active 1-1 call overlay */}
            {callStatus === "ONGOING" && !isGroupCall && (
                <ActiveCallOverlay
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onEndCall={endCall}
                    onToggleCamera={toggleCamera}
                    onUpgradeToVideo={upgradeToVideo}
                />
            )}

            <VideoUpgradeRequestDialog
                visible={!!incomingVideoUpgradeRequest && callStatus === "ONGOING" && !isGroupCall}
                requesterName={incomingVideoUpgradeRequest?.requesterName ?? "Peer"}
                onAccept={() => respondToVideoUpgradeRequest(true)}
                onDecline={() => respondToVideoUpgradeRequest(false)}
            />

            <GroupVideoUpgradeRequestDialog
                visible={!!incomingGroupVideoUpgradeRequest && callStatus === "ONGOING" && isGroupCall}
                requesterName={incomingGroupVideoUpgradeRequest?.requesterName ?? "A participant"}
                onAccept={() => respondToGroupVideoUpgradeRequest(true)}
                onDecline={() => respondToGroupVideoUpgradeRequest(false)}
            />
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

