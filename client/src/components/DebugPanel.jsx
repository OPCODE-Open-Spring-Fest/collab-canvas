import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const DebugPanel = () => {
    const { socket, isConnected, currentRoom, userCount } = useSocket();
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
            originalLog(...args);
            setLogs(prev => [...prev.slice(-9), { type: 'log', message: args.join(' '), time: new Date().toLocaleTimeString() }]);
        };
        
        console.error = (...args) => {
            originalError(...args);
            setLogs(prev => [...prev.slice(-9), { type: 'error', message: args.join(' '), time: new Date().toLocaleTimeString() }]);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
        };
    }, []);

    const testConnection = () => {
        console.log('🧪 Testing connection...');
        if (socket) {
            console.log('Socket exists:', !!socket);
            console.log('Socket connected:', socket.connected);
            console.log('Socket ID:', socket.id);
        } else {
            console.log('No socket available');
        }
    };

    return (
        <div className="fixed bottom-6 right-6 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs">
            <h3 className="font-bold mb-2">Debug Panel</h3>
            
            <div className="space-y-2 mb-4">
                <div>Socket: {socket ? '✅' : '❌'}</div>
                <div>Connected: {isConnected ? '✅' : '❌'}</div>
                <div>Room: {currentRoom || 'None'}</div>
                <div>Users: {userCount}</div>
            </div>

            <button 
                onClick={testConnection}
                className="bg-blue-600 px-2 py-1 rounded text-xs mb-2"
            >
                Test Connection
            </button>

            <div className="space-y-1">
                <div className="font-bold">Console Logs:</div>
                {logs.map((log, i) => (
                    <div key={i} className={`text-xs ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                        [{log.time}] {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
};
