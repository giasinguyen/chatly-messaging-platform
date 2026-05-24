import { useCallback, useEffect, useRef, useState } from "react";
import AgoraRTC, {
    type IAgoraRTCClient,
    type IAgoraRTCRemoteUser,
    type ILocalAudioTrack,
    type ILocalVideoTrack,
    type IRemoteAudioTrack,
    type IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";
import { callService } from "@/services/call.service";
import type { CallType } from "@/types/call";

interface JoinAgoraGroupCallParams {
    conversationId: string;
    callId: string;
    type: CallType;
}

type AgoraMediaType = "audio" | "video" | "datachannel";

interface RemoteTrackSet {
    audio?: IRemoteAudioTrack;
    video?: IRemoteVideoTrack;
}

export function useAgoraGroupCall() {
    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
    const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
    const remoteTracksRef = useRef<Map<string, RemoteTrackSet>>(new Map());
    const isSpeakerEnabledRef = useRef(true);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<
        Record<string, MediaStream>
    >({});

    const syncLocalStream = useCallback((): void => {
        const tracks: MediaStreamTrack[] = [];
        const audioTrack = localAudioTrackRef.current;
        const videoTrack = localVideoTrackRef.current;

        if (audioTrack) tracks.push(audioTrack.getMediaStreamTrack());
        if (videoTrack) tracks.push(videoTrack.getMediaStreamTrack());

        setLocalStream(tracks.length > 0 ? new MediaStream(tracks) : null);
    }, []);

    const syncRemoteStream = useCallback((uid: string): void => {
        const trackSet = remoteTracksRef.current.get(uid);
        const tracks = [trackSet?.video?.getMediaStreamTrack()].filter(
            (track): track is MediaStreamTrack => Boolean(track),
        );

        setRemoteStreams((current) => {
            const next = { ...current };
            if (tracks.length > 0) {
                next[uid] = new MediaStream(tracks);
            } else {
                delete next[uid];
            }
            return next;
        });
    }, []);

    const removeRemoteUser = useCallback((uid: string): void => {
        const trackSet = remoteTracksRef.current.get(uid);
        trackSet?.audio?.stop();
        trackSet?.video?.stop();
        remoteTracksRef.current.delete(uid);
        setRemoteStreams((current) => {
            const next = { ...current };
            delete next[uid];
            return next;
        });
    }, []);

    const ensureClient = useCallback((): IAgoraRTCClient => {
        if (clientRef.current) {
            return clientRef.current;
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        client.on(
            "user-published",
            async (
                remoteUser: IAgoraRTCRemoteUser,
                mediaType: AgoraMediaType,
            ) => {
                if (mediaType !== "audio" && mediaType !== "video") return;

                const uid = String(remoteUser.uid);
                const current = remoteTracksRef.current.get(uid) ?? {};

                if (mediaType === "audio") {
                    current.audio = await client.subscribe(remoteUser, "audio");
                    if (isSpeakerEnabledRef.current) {
                        current.audio.play();
                    }
                } else {
                    current.video = await client.subscribe(remoteUser, "video");
                }

                remoteTracksRef.current.set(uid, current);
                syncRemoteStream(uid);
            },
        );

        client.on(
            "user-unpublished",
            (remoteUser: IAgoraRTCRemoteUser, mediaType: AgoraMediaType) => {
                if (mediaType !== "audio" && mediaType !== "video") return;

                const uid = String(remoteUser.uid);
                const current = remoteTracksRef.current.get(uid);
                if (!current) return;

                if (mediaType === "audio") {
                    current.audio?.stop();
                    delete current.audio;
                } else {
                    current.video?.stop();
                    delete current.video;
                }

                remoteTracksRef.current.set(uid, current);
                syncRemoteStream(uid);
            },
        );

        client.on("user-left", (remoteUser: IAgoraRTCRemoteUser) => {
            removeRemoteUser(String(remoteUser.uid));
        });

        clientRef.current = client;
        return client;
    }, [removeRemoteUser, syncRemoteStream]);

    const publishAudioTrack = useCallback(
        async (client: IAgoraRTCClient): Promise<void> => {
            if (localAudioTrackRef.current) return;

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            localAudioTrackRef.current = audioTrack;
            await client.publish(audioTrack);
            syncLocalStream();
        },
        [syncLocalStream],
    );

    const publishVideoTrack = useCallback(
        async (client: IAgoraRTCClient): Promise<boolean> => {
            if (localVideoTrackRef.current) {
                await localVideoTrackRef.current.setEnabled(true);
                syncLocalStream();
                return true;
            }

            try {
                const videoTrack = await AgoraRTC.createCameraVideoTrack();
                localVideoTrackRef.current = videoTrack;
                await client.publish(videoTrack);
                syncLocalStream();
                return true;
            } catch {
                syncLocalStream();
                return false;
            }
        },
        [syncLocalStream],
    );

    const closeLocalVideoTrack = useCallback(
        async (client: IAgoraRTCClient | null): Promise<void> => {
            const localVideoTrack = localVideoTrackRef.current;
            if (!localVideoTrack) return;

            if (client?.connectionState === "CONNECTED") {
                await client.unpublish(localVideoTrack).catch(() => undefined);
            }

            localVideoTrack.stop();
            localVideoTrack.close();
            localVideoTrackRef.current = null;
            syncLocalStream();
        },
        [syncLocalStream],
    );

    const joinCall = useCallback(
        async ({
            conversationId,
            callId,
            type,
        }: JoinAgoraGroupCallParams): Promise<{
            hasLocalVideoTrack: boolean;
        }> => {
            const response = await callService.createAgoraToken({
                conversationId,
                callId,
            });
            if (response.code !== 1000) {
                throw new Error(
                    response.message ?? "Unable to prepare the group call.",
                );
            }

            const { appId, channelName, token, uid } = response.result;
            const client = ensureClient();

            if (client.connectionState !== "CONNECTED") {
                await client.join(appId, channelName, token, uid);
            }

            await publishAudioTrack(client);
            const hasLocalVideoTrack =
                type === "VIDEO" ? await publishVideoTrack(client) : false;

            return { hasLocalVideoTrack };
        },
        [ensureClient, publishAudioTrack, publishVideoTrack],
    );

    const leaveCall = useCallback((): void => {
        const client = clientRef.current;
        const localAudioTrack = localAudioTrackRef.current;
        const localVideoTrack = localVideoTrackRef.current;

        if (localAudioTrack) {
            localAudioTrack.stop();
            localAudioTrack.close();
            localAudioTrackRef.current = null;
        }

        if (localVideoTrack) {
            localVideoTrack.stop();
            localVideoTrack.close();
            localVideoTrackRef.current = null;
        }

        remoteTracksRef.current.forEach((trackSet) => {
            trackSet.audio?.stop();
            trackSet.video?.stop();
        });
        remoteTracksRef.current.clear();
        setLocalStream(null);
        setRemoteStreams({});

        if (client) {
            void client.leave().catch(() => undefined);
        }
    }, []);

    const toggleMute = useCallback((muted: boolean): void => {
        const localAudioTrack = localAudioTrackRef.current;
        if (!localAudioTrack) return;

        void localAudioTrack.setMuted(muted).catch(() => undefined);
    }, []);

    const toggleSpeaker = useCallback((enabled: boolean): void => {
        isSpeakerEnabledRef.current = enabled;
        remoteTracksRef.current.forEach((trackSet) => {
            if (enabled) {
                trackSet.audio?.play();
            } else {
                trackSet.audio?.stop();
            }
        });
    }, []);

    const enableVideo = useCallback(async (): Promise<boolean> => {
        const client = clientRef.current;
        if (!client) return false;

        return publishVideoTrack(client);
    }, [publishVideoTrack]);

    const toggleCamera = useCallback(async (): Promise<boolean> => {
        const localVideoTrack = localVideoTrackRef.current;
        if (!localVideoTrack) {
            return enableVideo();
        }

        await closeLocalVideoTrack(clientRef.current);
        return false;
    }, [closeLocalVideoTrack, enableVideo]);

    useEffect(() => {
        return () => {
            leaveCall();
            clientRef.current = null;
        };
    }, [leaveCall]);

    return {
        joinCall,
        leaveCall,
        toggleMute,
        toggleSpeaker,
        toggleCamera,
        enableVideo,
        localStream,
        remoteStreams,
    };
}
