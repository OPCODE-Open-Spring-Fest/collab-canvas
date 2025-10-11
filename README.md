# 🎨 CollabCanvas

### A Real-Time, Infinite Collaborative Whiteboard

**CollabCanvas** is an open-source infinite canvas web app inspired by tools like [Excalidraw](https://excalidraw.com) and [Eraser.io](https://eraser.io). It enables users to draw, brainstorm, and collaborate in real-time with a focus on simplicity and performance.

Born out of our **College Open Source Event**, this project serves as a practical guide to building real-time applications using **WebSockets**, **React**, and the **HTML Canvas API**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Contributors](https://img.shields.io/github/contributors/your-username/collab-canvas)](https://github.com/your-username/collab-canvas/graphs/contributors)

---

## ✨ Core Features

| Feature                   | Description                                                                 | Status     |
| ------------------------- | --------------------------------------------------------------------------- | ---------- |
| ✏️ **Freehand Drawing**   | Smooth, responsive sketching on an infinite, pannable canvas.               | 🗓️ Planned |
| 🎨 **Color Palette**      | Choose from a curated set of colors for your brush.                         | 🗓️ Planned |
| 🖌️ **Stroke Control**     | Adjust brush thickness for fine details or bold strokes.                    | 🗓️ Planned |
| 👥 **Live Collaboration** | See cursors and drawings from other users in real-time.                     | 🗓️ Planned |
| 🔗 **Shareable Rooms**    | Create a private room and share the link to invite collaborators instantly. | 🗓️ Planned |
| 🧽 **Eraser Tool**        | Easily remove any part of your drawing.                                     | 🗓️ Planned |
| ⬛ **Shape Tools**        | Draw perfect rectangles, circles, and lines.                                | 🗓️ Planned |
| 💾 **Session Saving**     | Save your canvas state to the server and resume your work later.            | 🗓️ Planned |
| 🔒 **Private Rooms**      | Secure your sessions with a unique room code or password.                   | 🗓️ Planned |

---

## 🧰 Tech Stack

We chose a modern, scalable tech stack designed for real-time performance and a great developer experience.

| Layer                | Technology                                                                                                                                                                | Purpose                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Frontend**         | **[React](https://reactjs.org/)**, **[Tailwind CSS](https://tailwindcss.com/)** & **[HTML Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Canvas_API)** | For a reactive UI, utility-first styling, and high-performance canvas rendering. |
| **Backend**          | **[Node.js](https://nodejs.org/)** & **[Express](https://expressjs.com/)**                                                                                                | To build a fast, non-blocking server-side API.                                   |
| **Real-Time Engine** | **[Socket.IO](https://socket.io/)**                                                                                                                                       | For bidirectional, low-latency communication.                                    |
| **Database**         | **[MongoDB](https://www.mongodb.com/)**                                                                                                                                   | To store room data and user session information.                                 |
| **Deployment**       | **[Vercel](https://vercel.com/)** / **[Render](https://render.com/)**                                                                                                     | For seamless, continuous deployment.                                             |

---

## 🏛️ Architecture Overview

CollabCanvas uses a classic client-server architecture, with Socket.IO acting as the real-time communication backbone.

-   **Client (React)**: Handles all rendering and user interaction. When a user draws, the client captures the canvas events, processes them, and emits a WebSocket event to the server with the drawing data.
-   **Server (Node.js/Express)**: Acts as the central hub. It manages user rooms and brokers messages. It does not handle any drawing logic itself.
-   **Socket.IO**: When a client sends a drawing event, the server receives it and broadcasts it to all _other_ clients in the same room. This ensures that everyone's canvas stays in sync.

---

## 📁 Folder Structure

The project is organized as a monorepo with two main packages: `client` and `server`.

```
collab-canvas/
├── client/                 # Contains the React frontend application
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── components/     # Reusable React components (Canvas, Toolbar)
│   │   ├── hooks/          # Custom hooks (e.g., useSocket)
│   │   ├── pages/          # Main application pages (HomePage, RoomPage)
│   │   ├── App.jsx         # Main app component and routing
│   │   └── index.js        # Entry point for the React app
│   └── package.json
│
├── server/                 # Contains the Node.js backend
│   ├── models/             # Mongoose schemas (e.g., RoomModel.js)
│   ├── sockets/            # Socket.IO event handlers and logic
│   ├── index.js            # Server entry point (sets up Express & Socket.IO)
│   ├── .env                # Environment variables
│   └── package.json
│
├── .gitignore
├── https://www.google.com/search?q=LICENSE                 # MIT License file
└── README.md               # You are here!

```

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v16 or higher)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/collab-canvas.git
cd collab-canvas
```

### 2. Install Dependencies

Install dependencies for both the client and server.

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the `/server` directory and add the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:3000
```

### 4. Run the Application

You'll need two separate terminals to run the frontend and backend servers.

**Terminal 1: Start the React Client**

```bash
cd client
npm start
```

**Terminal 2: Start the Node.js Server**

```bash
cd server
npm run dev
```

Your application should now be running at [http://localhost:3000](http://localhost:3000) 🎉

## 🗺️ Project Roadmap

Our goal is to build a fully-featured collaborative tool. Here's what's on our radar:

### Phase 1: Core Drawing MVP

-   [ ] Basic freehand drawing
-   [ ] Color and stroke size selection
-   [ ] Real-time broadcasting of drawing data
-   [ ] Room creation and joining

### Phase 2: Enhanced Tools

-   [ ] Shape tools (rectangle, circle, line)
-   [ ] Text insertion tool
-   [ ] Pan and zoom on the infinite canvas
-   [ ] Export canvas as PNG/SVG

### Phase 3: Collaboration & Persistence

-   [ ] User authentication (optional)
-   [ ] Save & load canvas history from the database
-   [ ] User cursor and name display
-   [ ] Undo/Redo functionality

### Phase 4: Future Polish

-   [ ] Touch support for mobile devices
-   [ ] Performance optimizations for large drawings
-   [ ] Image and file uploads

## 🤝 How to Contribute

We ❤️ contributions from the community! Whether you're fixing a bug, adding a new feature, or improving our documentation, your help is welcome.

**Steps to contribute:**

1. **Fork the repository**  
   Click the "Fork" button at the top right of the GitHub page.

2. **Create a new branch**

    ```bash
    git checkout -b feature/your-feature-name
    ```

3. **Make your changes and commit them with a clear message**

    ```bash
    git commit -m "feat: Add shape drawing tool"
    ```

4. **Push your changes to your fork**

    ```bash
    git push origin feature/your-feature-name
    ```

5. **Create a Pull Request**  
   Describe the changes you've made. Please include screenshots if the UI is affected.

For more details, check out our `CONTRIBUTING.md` guide.

---

## 🎯 Project Purpose

This project was built for our College Open Source Event to:

-   **Educate:** Provide a clear, real-world example of how collaborative web apps are built.
-   **Inspire:** Encourage students to dive into web development and open-source.
-   **Collaborate:** Foster teamwork and build a sense of community through code.

---

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.

> "Collaboration is the canvas where creativity paints its best ideas." 🖌️

Made with ❤️ by the open-source community.
