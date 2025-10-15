import { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Button } from './ui/Button';
import { toast } from 'sonner';

export const RoomManager = () => {
    const { socket, isConnected, currentRoom, userCount, joinRoom, leaveRoom } = useSocket();
    const [roomId, setRoomId] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const handleJoinRoom = async () => {
        console.log('🎯 Attempting to join room:', roomId);
        console.log('🔗 Connection status:', isConnected);
        console.log('🔌 Socket available:', !!socket);
        
        if (!roomId.trim()) {
            toast.error('Please enter a room ID');
            return;
        }

        if (!isConnected) {
            toast.error('Not connected to server - please wait for connection');
            return;
        }

        setIsJoining(true);
        try {
            console.log('📤 Calling joinRoom with:', roomId.trim());
            await joinRoom(roomId.trim());
            console.log('✅ Successfully joined room:', roomId);
            toast.success(`🎉 Joined room: ${roomId}`);
            setRoomId(''); // Clear input after successful join
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            toast.error(`Failed to join room: ${error.message}`);
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeaveRoom = () => {
        leaveRoom();
        setRoomId('');
        toast.info('Left the room');
    };

    const generateRandomRoomId = () => {
        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomId(randomId);
    };

    return (
        <div className="fixed top-6 right-6 bg-white/95 border border-gray-200/50 rounded-2xl shadow-xl backdrop-blur-md p-6 min-w-[320px] animate-float z-50">
            <div className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-sm font-semibold text-gray-700">
                        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </span>
                    {!isConnected && (
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            Retry Connection
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            console.log('🧪 Connection Test');
                            console.log('Socket:', socket);
                            console.log('Connected:', isConnected);
                            console.log('Socket ID:', socket?.id);
                            console.log('Socket Connected:', socket?.connected);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
                    >
                        Test
                    </button>
                </div>

                {currentRoom ? (
                    <div className="space-y-3">
                        {/* Room Info */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">Room</span>
                                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                    {userCount} user{userCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="text-lg font-bold text-blue-700 font-mono tracking-wider">
                                {currentRoom}
                            </div>
                        </div>
                        
                        <Button
                            onClick={handleLeaveRoom}
                            variant="outline"
                            size="sm"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                        >
                            🚪 Leave Room
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Enter room ID"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isJoining && roomId.trim()) {
                                        handleJoinRoom();
                                    }
                                }}
                                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                                disabled={!isConnected}
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleJoinRoom}
                                    disabled={!isConnected || isJoining || !roomId.trim()}
                                    size="sm"
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 transition-all duration-200"
                                >
                                    {isJoining ? '⏳ Joining...' : '🚀 Join Room'}
                                </Button>
                                <Button
                                    onClick={generateRandomRoomId}
                                    variant="outline"
                                    size="sm"
                                    disabled={!isConnected}
                                    className="border-gray-200 hover:bg-gray-50 transition-all duration-200"
                                >
                                    🎲 Random
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
