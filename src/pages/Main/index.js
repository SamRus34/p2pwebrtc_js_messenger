import { useState, useEffect, useRef } from 'react';
import socket from '../../socket';
import ACTIONS from '../../socket/actions';
import { useNavigate } from 'react-router';
import { v4 } from 'uuid';

export default function Main() {
    const navigate = useNavigate();
    const [rooms, updateRooms] = useState([]);
    const rootNode = useRef();

    useEffect(() => {
        socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
            if (rootNode.current) {
                updateRooms(rooms);
            }
        });

        return () => {
            socket.off(ACTIONS.SHARE_ROOMS);
        };
    }, []);

    const createRoom = () => {
        const newRoomID = v4();
        socket.emit(ACTIONS.CREATE_ROOM, { roomID: newRoomID });
        navigate(`/room/${newRoomID}`);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <img src="/logo.png" alt="Логотип" style={styles.logo} />  {/* Обновлено здесь */}
                <h1 style={styles.title}>ЭИОС Онлайн</h1>
            </div>
            <div style={styles.joinContainer}>
                <h2 style={styles.joinTitle}>Подключиться к видеовстрече</h2>
                <div style={styles.roomsList} ref={rootNode}>
                    <ul style={styles.roomsUl}>
                        {rooms.map(roomID => (
                            <li key={roomID} style={styles.roomItem}>
                                {roomID}
                                <button onClick={() => navigate(`/room/${roomID}`)} style={styles.joinButton}>
                                    Войти
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <button onClick={createRoom} style={styles.createButton}>
                Создать видеовстречу
            </button>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#E5F5FF',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    logo: {
        width: '60px',
        height: '60px',
        marginRight: '10px',
    },
    title: {
        fontSize: '24px',
        color: '#006699',
    },
    joinContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#26A69A',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px',
    },
    joinTitle: {
        color: '#FFFFFF',
        marginBottom: '10px',
    },
    roomsList: {
        width: '100%',
        maxHeight: '200px',
        overflowY: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        padding: '10px',
    },
    roomsUl: {
        listStyleType: 'none',
        padding: 0,
        margin: 0,
    },
    roomItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px',
        borderBottom: '1px solid #DDDDDD',
    },
    joinButton: {
        backgroundColor: '#006699',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '5px',
        padding: '5px 10px',
        cursor: 'pointer',
    },
    createButton: {
        backgroundColor: '#26A69A',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '10px',
        padding: '15px 30px',
        cursor: 'pointer',
        fontSize: '18px',
    },
};
