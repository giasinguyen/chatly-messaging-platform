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

interface JoinAgoraCallParams {
    conversationId: string;
    callId: string;
    type: CallType;
}

type AgoraMediaType = "audio" | "video" | "datachannel";
type RemoteTrack = IRemoteAudioTrack | IRemoteVideoTrack;

export function useAgoraMediaCall() {
    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
    const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
    const remoteTracksRef = useRef<Map<string, RemoteTrack>>(new Map());
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const syncLocalStream = useCallback((): void => {
        const tracks: MediaStreamTrack[] = [];
        const audioTrack = localAudioTrackRef.current;
        const videoTrack = localVideoTrackRef.current;

        if (audioTrack) tracks.push(audioTrack.getMediaStreamTrack());
        if (videoTrack) tracks.push(videoTrack.getMediaStreamTrack());

        setLocalStream(tracks.length > 0 ? new MediaStream(tracks) : null);
    }, []);

    const syncRemoteStream = useCallback((): void => {
        const tracks = Array.from(remoteTracksRef.current.values()).map(
            (track) => track.getMediaStreamTrack(),
        );

        setRemoteStream(tracks.length > 0 ? new MediaStream(tracks) : null);
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
                if (mediaType === "audio") {
                    const track = await client.subscribe(remoteUser, "audio");
                    remoteTracksRef.current.set(
                        `${remoteUser.uid}:audio`,
                        track,
                    );
                    syncRemoteStream();
                    return;
                }

                if (mediaType !== "video") return;

                const track = await client.subscribe(remoteUser, "video");
                remoteTracksRef.current.set(`${remoteUser.uid}:video`, track);
                syncRemoteStream();
            },
        );

        client.on(
            "user-unpublished",
            (remoteUser: IAgoraRTCRemoteUser, mediaType: AgoraMediaType) => {
                if (mediaType !== "audio" && mediaType !== "video") return;

                const key = `${remoteUser.uid}:${mediaType}`;
                remoteTracksRef.current.get(key)?.stop();
                remoteTracksRef.current.delete(key);
                syncRemoteStream();
            },
        );

        clientRef.current = client;
        return client;
    }, [syncRemoteStream]);

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
        }: JoinAgoraCallParams): Promise<{ hasLocalVideoTrack: boolean }> => {
            const response = await callService.createAgoraToken({
                conversationId,
                callId,
            });
            if (response.code !== 1000) {
                throw new Error(
                    response.message ?? "Unable to prepare the call.",
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

        remoteTracksRef.current.forEach((track) => track.stop());
        remoteTracksRef.current.clear();
        setLocalStream(null);
        setRemoteStream(null);

        if (client) {
            void client.leave().catch(() => undefined);
        }
    }, []);

    const toggleMute = useCallback((muted: boolean): void => {
        const localAudioTrack = localAudioTrackRef.current;
        if (!localAudioTrack) return;

        void localAudioTrack.setMuted(muted).catch(() => undefined);
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
        toggleCamera,
        enableVideo,
        localStream,
        remoteStream,
    };
}
