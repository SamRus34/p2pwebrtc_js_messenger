import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import useWebRTC, { LOCAL_VIDEO } from '../../hooks/useWebRTC';
import Chat from '../../components/Chat';
import ScreenShare from '../../components/ScreenShare';
import socket from '../../socket';

function layout(clientsNumber = 1) {
    const pairs = Array.from({ length: clientsNumber })
        .reduce((acc, next, index, arr) => {
            if (index % 2 === 0) {
                acc.push(arr.slice(index, index + 2));
            }

            return acc;
        }, []);

    const rowsNumber = pairs.length;
    const height = `${100 / rowsNumber}%`;

    return pairs.map((row, index, arr) => {
        if (index === arr.length - 1 && row.length === 1) {
            return [{
                width: '100%',
                height,
            }];
        }

        return row.map(() => ({
            width: '50%',
            height,
        }));
    }).flat();
}

export default function Room() {
    const { id: roomID } = useParams();
    const { clients, messages, sendMessage, provideMediaRef, localMediaStream, isScreenSharing, startScreenShare, stopScreenShare } = useWebRTC(roomID);
    const videoLayout = layout(clients.length);

    const [seconds, setSeconds] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const copyInviteLink = () => {
        const inviteLink = `${window.location.origin}/room/${roomID}`;
        navigator.clipboard.writeText(inviteLink).then(() => {
            alert('Ссылка приглашения скопирована в буфер обмена!');
        }).catch(err => {
            console.error('Ошибка при копировании ссылки: ', err);
        });
    };

    const handleMute = () => {
        setIsMuted(prev => !prev);
        if (localMediaStream.current) {
            localMediaStream.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={copyInviteLink} style={styles.inviteButton}>+ Пригласить</button>
                <span style={styles.timer}>Трансляция идет: {formatTime(seconds)}</span>
            </div>
            <div style={styles.mainContent}>
                <div style={styles.videoContainer}>
                    {clients.map((clientID, index) => (
                        <div key={clientID} style={styles.videoWrapper}>
                            <video
                                width='100%'
                                height='100%'
                                ref={instance => {
                                    provideMediaRef(clientID, instance);
                                }}
                                autoPlay
                                playsInline
                                muted={clientID === LOCAL_VIDEO}
                            />
                        </div>
                    ))}
                </div>
                <div style={styles.chatContainer}>
                    <Chat messages={messages} sendMessage={sendMessage} user={{ id: socket.id }} />
                </div>
            </div>
            <ScreenShare
                isScreenSharing={isScreenSharing}
                startScreenShare={startScreenShare}
                stopScreenShare={stopScreenShare}
            />
            <div style={styles.controlPanel}>
                <button style={styles.controlButton} onClick={handleMute}>
                    {isMuted ? '🔈' : '🔇'}
                </button>
                <button style={styles.controlButton}>🔴</button>
                <button style={styles.controlButton}>⛶</button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#2D3E50',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#1C2733',
        color: '#FFFFFF',
    },
    inviteButton: {
        backgroundColor: '#26A69A',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '5px',
        padding: '10px',
        cursor: 'pointer',
    },
    timer: {
        fontSize: '18px',
    },
    mainContent: {
        display: 'flex',
        flexGrow: 1,
    },
    videoContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1,
        backgroundColor: '#181D23',
        padding: '10px',
        borderRight: '1px solid #1C2733',
    },
    videoWrapper: {
        width: '320px',
        height: '240px',
        margin: '10px',
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    chatContainer: {
        width: '300px',
        backgroundColor: '#1C2733',
        padding: '10px',
    },
    controlPanel: {
        display: 'flex',
        justifyContent: 'center',
        padding: '10px',
        backgroundColor: '#1C2733',
    },
    controlButton: {
        backgroundColor: '#FFFFFF',
        border: 'none',
        borderRadius: '5px',
        padding: '10px',
        margin: '0 5px',
        cursor: 'pointer',
    },
};
