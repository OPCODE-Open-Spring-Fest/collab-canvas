import { Slider } from "./ui/Slider";
export const StrokeControl = ({ strokeWidth, onStrokeWidthChange }) => {
    return (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50">
            <div className="bg-toolbar border border-toolbar-border rounded-2xl shadow-xl backdrop-blur-sm p-4 w-48">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Stroke Width</span>
                        <span className="text-sm text-muted-foreground">{strokeWidth}px</span>
                    </div>
                    <Slider
                        value={[strokeWidth]}
                        onValueChange={([value]) => onStrokeWidthChange(value)}
                        min={1}
                        max={20}
                        step={1}
                        className="w-full border-2 border-border bg=black"
                    />
                    <div className="flex justify-center pt-2">
                        <div className="relative h-10 flex items-center justify-center">
                        <div
                            className="rounded-full bg-black transition-all duration-200"
                            style={{
                                width: `${strokeWidth * 2}px`,
                                height: `${strokeWidth * 2}px`,
                            }}
                        />
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
