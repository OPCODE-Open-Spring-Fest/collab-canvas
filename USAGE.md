# Collaborative Canvas - Usage Guide

## 🎨 Real-time Collaborative Drawing

This application allows multiple users to draw together in real-time on a shared canvas. Each user can see other users' strokes instantly without any flickering or lag.

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- Two or more browser windows/tabs for testing collaboration

### Running the Application

1. **Start the Server** (Terminal 1):
   ```bash
   cd server
   npm run dev
   ```
   Server will run on `http://localhost:3000`

2. **Start the Client** (Terminal 2):
   ```bash
   cd client
   npm run dev
   ```
   Client will run on `http://localhost:5173`

## 🎯 How to Use

### Step 1: Join a Room
1. Open the application in your browser (`http://localhost:5173`)
2. In the top-right corner, you'll see the Room Manager
3. Enter a room ID (e.g., "ROOM1", "TEST123") or click "🎲 Random" to generate one
4. Click "🚀 Join Room" or press Enter
5. You'll see a green indicator showing you're connected and collaborating

### Step 2: Start Drawing
1. Once in a room, you can start drawing immediately
2. Use the toolbar on the left to select tools:
   - **Pen**: Draw with your selected color
   - **Eraser**: Erase parts of the drawing
3. Adjust stroke width using the slider
4. Change colors using the color picker

### Step 3: Collaborate
1. Open another browser window/tab and go to `http://localhost:5173`
2. Join the same room ID
3. Start drawing - you'll see each other's strokes in real-time!
4. The status bar at the bottom shows how many users are in the room

## ✨ Features

- **Real-time Synchronization**: All strokes appear instantly for all users
- **Room-based Collaboration**: Multiple rooms for different drawing sessions
- **Smooth Performance**: Optimized for 120fps drawing with no lag
- **Multiple Tools**: Pen and eraser with customizable colors and stroke widths
- **User Count**: See how many people are collaborating
- **Clean UI**: Modern, responsive interface with smooth animations

## 🔧 Technical Features

- **Low Latency**: Optimized throttling for smooth drawing
- **Memory Management**: Automatic cleanup of old strokes
- **Error Handling**: Graceful disconnection and reconnection
- **Performance**: Efficient data structures and rendering

## 🎨 Tips for Best Experience

1. **Room IDs**: Use descriptive names like "TEAM1", "PROJECT", "MEETING"
2. **Multiple Users**: Test with 2-3 browser windows to see real-time collaboration
3. **Drawing Tools**: Experiment with different colors and stroke widths
4. **Clear Canvas**: Use the clear button to start fresh (affects all users)

## 🐛 Troubleshooting

- **Not Connected**: Check if the server is running on port 3000
- **Can't Join Room**: Make sure you're connected (green indicator)
- **Drawing Not Syncing**: Refresh the page and rejoin the room
- **Performance Issues**: Close other browser tabs to free up resources

Enjoy collaborative drawing! 🎨✨
