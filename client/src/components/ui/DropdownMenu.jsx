import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

export const DropdownMenu = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-toolbar-border rounded-lg shadow-xl backdrop-blur-sm min-w-[160px] z-50 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownMenuItem = ({ onClick, children, className }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors duration-150 flex items-center gap-2",
        className
      )}
    >
      {children}
    </button>
  );
};
