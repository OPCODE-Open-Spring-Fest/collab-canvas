// components/JoinRoom.jsx
import React, { useState } from "react";

export default function JoinRoom({ onJoin }) {
    const [input, setInput] = useState("");

    const handleJoin = () => {
        if (!input.trim()) {
            alert("Please enter a Room ID");
            return;
        }
        onJoin(input.trim());
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-100 rounded-lg shadow-md">
            <h1 className="text-2xl font-semibold">Enter Room ID</h1>
            <input
                type="text"
                placeholder="e.g. room123"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="border border-gray-400 rounded-md px-4 py-2"
            />
            <button
                onClick={handleJoin}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
                Join Room
            </button>
        </div>
    );
}
