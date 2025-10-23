export default function AuthLayout({ children, title }) {
  return (
    <div className="flex items-center justify-center h-screen bg-canvas relative overflow-hidden">
      <div className="bg-white/90 border border-gray-300 rounded-2xl shadow-2xl p-8 w-[90%] sm:w-[400px] text-center backdrop-blur-sm">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">{title}</h1>
        {children}
      </div>
    </div>
  );
}
