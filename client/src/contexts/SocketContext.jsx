import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [userCount, setUserCount] = useState(0);

    useEffect(() => {
        console.log('🚀 Initializing socket connection...');
        
        // Connect to Socket.io server
        const newSocket = io('http://localhost:3000', {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });

        newSocket.on('connect', () => {
            console.log('✅ Connected to server:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            setIsConnected(false);
            setCurrentRoom(null);
            setUserCount(0);
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔴 Connection error:', error);
            setIsConnected(false);
        });

        newSocket.on('user-count', (count) => {
            console.log('👥 User count updated:', count);
            setUserCount(count);
        });

        setSocket(newSocket);

        return () => {
            console.log('🧹 Cleaning up socket connection');
            newSocket.close();
        };
    }, []);

    const joinRoom = (roomId) => {
        return new Promise((resolve, reject) => {
            console.log('🔍 joinRoom called with:', roomId, 'socket:', !!socket);
            
            if (!socket) {
                console.log('❌ No socket available');
                reject(new Error('Socket not connected'));
                return;
            }
            
            if (!roomId) {
                console.log('❌ No room ID provided');
                reject(new Error('Room ID is required'));
                return;
            }

            console.log('📡 Setting up room join listeners for:', roomId);

            // Set up one-time listeners for room join response
            const handleJoinSuccess = (data) => {
                console.log('✅ Room join success:', data);
                socket.off('join-room-success', handleJoinSuccess);
                socket.off('join-room-error', handleJoinError);
                setCurrentRoom(roomId);
                resolve();
            };

            const handleJoinError = (error) => {
                console.log('❌ Room join error:', error);
                socket.off('join-room-success', handleJoinSuccess);
                socket.off('join-room-error', handleJoinError);
                reject(new Error(error.message || 'Failed to join room'));
            };

            socket.once('join-room-success', handleJoinSuccess);
            socket.once('join-room-error', handleJoinError);
            
            console.log('📤 Emitting join-room event:', roomId);
            // Emit join room request
            socket.emit('join-room', roomId);
            
            // Fallback timeout
            setTimeout(() => {
                console.log('⏰ Room join timeout');
                socket.off('join-room-success', handleJoinSuccess);
                socket.off('join-room-error', handleJoinError);
                reject(new Error('Join room timeout'));
            }, 5000);
        });
    };

    const leaveRoom = () => {
        if (socket && currentRoom) {
            socket.emit('leave-room', currentRoom);
            setCurrentRoom(null);
            setUserCount(0);
        }
    };

    const draw = (path) => {
        if (socket && currentRoom) {
            console.log('📤 Sending draw event:', path);
            socket.emit('draw', { roomId: currentRoom, path });
        }
    };

    const clearCanvas = () => {
        if (socket && currentRoom) {
            console.log('📤 Sending clear canvas event');
            socket.emit('clear-canvas', currentRoom);
        }
    };

    const value = {
        socket,
        isConnected,
        currentRoom,
        userCount,
        joinRoom,
        leaveRoom,
        draw,
        clearCanvas
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};