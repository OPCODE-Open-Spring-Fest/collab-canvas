import { useState } from "react";
import { Canvas } from "./components/Canvas";

function App() {
    const [roomId, setRoomId] = useState("");
    const [joined, setJoined] = useState(false);

    const handleJoin = () => {
        if (!roomId.trim()) {
            alert("Please enter a valid Room ID");
            return;
        }
        setJoined(true);
    };

    return (
        <main className="w-full h-screen flex items-center justify-center bg-gray-100">
            {!joined ? (
                <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-md">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Join a Drawing Room
                    </h1>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleJoin}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        Join Room
                    </button>
                </div>
            ) : (
                <Canvas roomId={roomId} />
            )}
        </main>
    );
}

export default App;
