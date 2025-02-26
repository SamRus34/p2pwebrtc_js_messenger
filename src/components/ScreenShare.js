import React from 'react';

const ScreenShare = ({ isScreenSharing, startScreenShare, stopScreenShare }) => {
    const toggleScreenShare = () => {
        if (isScreenSharing) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    };

    return (
        <button onClick={toggleScreenShare} style={{ position: 'absolute', top: '10px', right: '10px' }}>
            {isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        </button>
    );
};

export default ScreenShare;
