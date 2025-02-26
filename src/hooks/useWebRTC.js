import { useEffect, useRef, useCallback, useState } from 'react';
import freeice from 'freeice';
import useStateWithCallback from './useStateWithCallback';
import socket from '../socket';
import ACTIONS from '../socket/actions';

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export default function useWebRTC(roomID) {
    const [clients, updateClients] = useStateWithCallback([]);
    const [messages, setMessages] = useState([]);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const addNewClient = useCallback((newClient, cb) => {
        updateClients(list => {
            if (!list.includes(newClient)) {
                return [...list, newClient];
            }
            return list;
        }, cb);
    }, [clients, updateClients]);

    const peerConnections = useRef({});
    const localMediaStream = useRef(null);
    const screenMediaStream = useRef(null);
    const peerMediaElements = useRef({
        [LOCAL_VIDEO]: null,
    });

    const startScreenShare = async () => {
        try {
            screenMediaStream.current = await navigator.mediaDevices.getDisplayMedia({
                video: true,
            });

            const screenTrack = screenMediaStream.current.getTracks()[0];

            Object.values(peerConnections.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            });

            const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
            if (localVideoElement) {
                localVideoElement.srcObject = screenMediaStream.current;
            }

            screenTrack.onended = () => {
                stopScreenShare();
                setIsScreenSharing(false);
            };

            setIsScreenSharing(true);
        } catch (e) {
            console.error('Error getting display media:', e);
        }
    };

    const stopScreenShare = () => {
        const screenTrack = screenMediaStream.current.getTracks()[0];
        screenTrack.stop();

        Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track.kind === 'video');
            if (sender) {
                const videoTrack = localMediaStream.current.getTracks().find(t => t.kind === 'video');
                sender.replaceTrack(videoTrack);
            }
        });

        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
        if (localVideoElement) {
            localVideoElement.srcObject = localMediaStream.current;
        }

        setIsScreenSharing(false);
    };

    useEffect(() => {
        async function handleNewPeer({ peerID, createOffer }) {
            if (peerID in peerConnections.current) {
                return console.warn(`Peer ${peerID} is already connected`);
            }

            console.log(`Connecting to peer ${peerID}`);

            const pc = new RTCPeerConnection({
                iceServers: freeice(),
            });

            peerConnections.current[peerID] = pc;

            pc.onicecandidate = event => {
                if (event.candidate) {
                    console.log(`Sending ICE candidate to peer ${peerID}`);
                    socket.emit(ACTIONS.RELAY_ICE, {
                        peerID,
                        iceCandidate: event.candidate,
                    });
                }
            };

            let tracksNumber = 0;
            pc.ontrack = ({ streams: [remoteStream] }) => {
                tracksNumber++;
                if (tracksNumber === 2) {
                    console.log(`Received remote stream from peer ${peerID}`);
                    addNewClient(peerID, () => {
                        if (peerMediaElements.current[peerID]) {
                            peerMediaElements.current[peerID].srcObject = remoteStream;
                        } else {
                            const interval = setInterval(() => {
                                if (peerMediaElements.current[peerID]) {
                                    peerMediaElements.current[peerID].srcObject = remoteStream;
                                    clearInterval(interval);
                                }
                            }, 1000);
                        }
                    });
                }
            };

            if (localMediaStream.current) {
                localMediaStream.current.getTracks().forEach(track => {
                    pc.addTrack(track, localMediaStream.current);
                });
            } else {
                console.warn('localMediaStream is not available when trying to add tracks');
            }

            if (createOffer) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                console.log(`Sending SDP offer to peer ${peerID}`);
                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID,
                    sessionDescription: offer,
                });
            }
        }

        socket.on(ACTIONS.ADD_PEER, handleNewPeer);

        return () => {
            socket.off(ACTIONS.ADD_PEER, handleNewPeer);
        };
    }, [addNewClient]);

    useEffect(() => {
        async function setRemoteMedia({ peerID, sessionDescription: remoteDescription }) {
            console.log(`Setting remote media for peer ${peerID}`);
            const pc = peerConnections.current[peerID];
            await pc.setRemoteDescription(new RTCSessionDescription(remoteDescription));

            if (remoteDescription.type === 'offer') {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                console.log(`Sending SDP answer to peer ${peerID}`);
                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID,
                    sessionDescription: answer,
                });
            }
        }

        socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);

        return () => {
            socket.off(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
        };
    }, []);

    useEffect(() => {
        socket.on(ACTIONS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
            console.log(`Adding ICE candidate from peer ${peerID}`);
            const pc = peerConnections.current[peerID];
            pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
        });

        return () => {
            socket.off(ACTIONS.ICE_CANDIDATE);
        };
    }, []);

    useEffect(() => {
        const handleRemovePeer = ({ peerID }) => {
            if (peerConnections.current[peerID]) {
                peerConnections.current[peerID].close();
            }

            delete peerConnections.current[peerID];
            delete peerMediaElements.current[peerID];

            updateClients(list => list.filter(c => c !== peerID));
        };

        socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

        return () => {
            socket.off(ACTIONS.REMOVE_PEER, handleRemovePeer);
        };
    }, [updateClients]);

    useEffect(() => {
        async function startCapture() {
            localMediaStream.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: 640,
                    height: 480,
                }
            });

            addNewClient(LOCAL_VIDEO, () => {
                const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

                if (localVideoElement) {
                    localVideoElement.volume = 0;
                    localVideoElement.srcObject = localMediaStream.current;
                }
            });
        }

        startCapture()
            .then(() => socket.emit(ACTIONS.JOIN, { room: roomID }))
            .catch(e => console.error('Error getting userMedia:', e));

        return () => {
            if (localMediaStream.current) {
                localMediaStream.current.getTracks().forEach(track => track.stop());
            }
            socket.emit(ACTIONS.LEAVE);
        };
    }, [roomID]);

    // Обработка сообщений чата
    useEffect(() => {
        const handleMessageReceive = ({ message, user }) => {
            setMessages(prevMessages => [...prevMessages, { user, message }]);
        };

        socket.on(ACTIONS.RECEIVE_MESSAGE, handleMessageReceive);

        return () => {
            socket.off(ACTIONS.RECEIVE_MESSAGE, handleMessageReceive);
        };
    }, []);

    const sendMessage = (message, user) => {
        socket.emit(ACTIONS.SEND_MESSAGE, { roomID, message, user });
    };

    const provideMediaRef = useCallback((id, node) => {
        peerMediaElements.current[id] = node;
    }, []);

    return {
        clients,
        messages,
        sendMessage,
        provideMediaRef,
        localMediaStream, // Экспортируем эту переменную
        isScreenSharing,  // Экспортируем эту переменную
        startScreenShare, // Экспортируем эту функцию
        stopScreenShare,  // Экспортируем эту функцию
    };
}
