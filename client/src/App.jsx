import { Canvas } from "./components/Canvas";
import { SocketProvider } from "./contexts/SocketContext";

function App() {
    return (
        <SocketProvider>
            <main className="w-full h-screen">
                <Canvas />
            </main>
        </SocketProvider>
    )
}

export default App;
