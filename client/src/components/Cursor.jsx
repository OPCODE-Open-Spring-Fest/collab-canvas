export const Cursor = ({ x, y, username, color }) => {
  console.log("🖌️ Cursor component rendering:", { x, y, username, color });
  
  return (
    <div
      className="pointer-events-none fixed z-[9999] transition-transform duration-75"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {/* Simple Mouse Cursor SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <path
          d="M2 2 L2 14 L6 10 L9 16 L11 15 L8 9 L14 9 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Username label */}
      <div
        className="ml-5 -mt-4 px-2 py-1 rounded text-xs font-semibold text-white whitespace-nowrap shadow-lg"
        style={{
          backgroundColor: color,
        }}
      >
        {username}
      </div>
    </div>
  );
};
