import React, { useState } from 'react';
import socket from '../socket';
import ACTIONS from '../socket/actions';
import axios from 'axios';

function Chat({ messages, sendMessage, user }) {
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);

    const handleSendMessage = () => {
        if (message.trim() !== '') {
            sendMessage(message, user);
            setMessage('');
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleFileUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:3001/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            const { fileName } = response.data;
            sendMessage(`File uploaded: ${fileName}`, user);
            setFile(null);
        } catch (err) {
            console.error('Error uploading file:', err);
        }
    };

    return (
        <div>
            <div className="chat-window">
                {messages.map((msg, index) => (
                    <div key={index}>
                        <strong>{msg.user.id}: </strong>{msg.message}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
            />
            <button onClick={handleSendMessage}>Send</button>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleFileUpload}>Upload</button>
        </div>
    );
}

export default Chat;
