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

  // Wrap children to automatically close on click
  const enhancedChildren = 
    children && 
    Array.isArray(children)
      ? children.map((child) =>
          child.props && child.props.onClick
            ? {
                ...child,
                props: {
                  ...child.props,
                  onClick: (e) => {
                    child.props.onClick(e);
                    setIsOpen(false); // close dropdown
                  },
                },
              }
            : child
        )
      : children;

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-toolbar-border rounded-lg shadow-xl backdrop-blur-sm min-w-[160px] z-50 overflow-hidden">
          {enhancedChildren}
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
        "w-full px-4 py-2 text-left text-sm flex items-center gap-2 rounded-md transition-all duration-150",
        "hover:bg-secondary/20 hover:scale-105",
        "focus:outline-none focus:bg-secondary/30",
        className
      )}
    >
      {/* If there is an SVG (stroke preview), change stroke color on hover */}
      {children && (
        <div className="flex items-center gap-2 group">
          {children}
        </div>
      )}
    </button>
  );
};

