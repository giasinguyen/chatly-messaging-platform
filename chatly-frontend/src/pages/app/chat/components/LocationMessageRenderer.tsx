import { MapPin } from "lucide-react";
import type { LocationPayload } from "@/types/message";

interface LocationMessageRendererProps {
    location: LocationPayload;
}

export function LocationMessageRenderer({ location }: LocationMessageRendererProps) {
    const bbox = `${location.longitude - 0.005}%2C${location.latitude - 0.005}%2C${location.longitude + 0.005}%2C${location.latitude + 0.005}`;
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

    return (
        <button
            type="button"
            onClick={() => window.open(googleMapsUrl, "_blank")}
            className="w-60 rounded-2xl border border-border/60 bg-background dark:bg-zinc-900 shadow-sm overflow-hidden text-left hover:opacity-90 transition-opacity"
        >
            <div className="w-full h-[120px] bg-muted/30 relative pointer-events-none">
                <iframe
                    title="Map shared"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={mapUrl}
                    className="w-full h-full pointer-events-none border-0"
                />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 text-sm">
                <MapPin size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground leading-tight line-clamp-2 break-words">
                        {location.address ??
                            `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Open in Map
                    </p>
                </div>
            </div>
        </button>
    );
}
