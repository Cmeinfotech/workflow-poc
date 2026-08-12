import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

const minZoom = 0.5;
const maxZoom = 4;
const zoomStep = 0.25;

export function ZoomableDocumentImage({
  src,
  alt,
  className,
  highlight,
}: {
  src: string;
  alt: string;
  className?: string;
  highlight?: {
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function setClampedZoom(nextZoom: number) {
    const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
    setZoom(clamped);
    if (clamped < 0.75) setPosition({ x: 0, y: 0 });
  }

  function resetView() {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden rounded-md border border-border bg-zinc-200/60">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => setClampedZoom(zoom - zoomStep)}
          disabled={zoom <= minZoom}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-35"
          aria-label="Zoom out document"
          title="Zoom out"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="min-w-14 rounded-md px-2 py-1.5 text-[11px] font-semibold tabular-nums text-foreground transition hover:bg-accent"
          aria-label="Reset document zoom"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setClampedZoom(zoom + zoomStep)}
          disabled={zoom >= maxZoom}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-35"
          aria-label="Zoom in document"
          title="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={resetView}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Fit document to view"
          title="Fit to view"
        >
          <Maximize2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Reset document position"
          title="Reset position"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div
        className={`flex h-full min-h-0 w-full p-4 cursor-grab active:cursor-grabbing ${
          zoom > 1 ? "items-start justify-start" : "items-center justify-center"
        } ${zoom > 1 ? "overflow-auto" : "overflow-hidden"}`}
        onWheel={(event) => {
          event.preventDefault();
          const delta = -event.deltaY * 0.0012;
          setClampedZoom(zoom + delta);
        }}
        onDoubleClick={() => setClampedZoom(zoom === 1 ? 2 : 1)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          setPosition({
            x: drag.originX + event.clientX - drag.startX,
            y: drag.originY + event.clientY - drag.startY,
          });
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return;
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <div
          className="relative shrink-0"
          style={{
            width: zoom > 1 ? `${zoom * 100}%` : "auto",
            height: "auto",
            maxWidth: zoom > 1 ? "none" : `${zoom * 100}%`,
            maxHeight: zoom > 1 ? "none" : `${zoom * 100}%`,
            transform: `translate(${position.x}px, ${position.y}px)`,
            transformOrigin: "top center",
            transition: dragRef.current ? "none" : "transform 160ms ease-out",
          }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={className}
            style={{
              display: "block",
              width: zoom > 1 ? "100%" : "auto",
              height: "auto",
              maxWidth: zoom > 1 ? "none" : "100%",
              maxHeight: zoom > 1 ? "none" : "100%",
              objectFit: "contain",
            }}
          />
          {highlight && (
            <div
              className="pointer-events-none absolute rounded-sm border-2 border-red-600 bg-red-500/10 shadow-[0_0_0_9999px_rgba(127,29,29,0.03)]"
              style={{
                left: `${highlight.x}%`,
                top: `${highlight.y}%`,
                width: `${highlight.width}%`,
                height: `${highlight.height}%`,
              }}
              aria-label={`${highlight.label} field highlight`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
