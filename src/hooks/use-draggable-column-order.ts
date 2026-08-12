import { useState, type DragEvent } from "react";

export function useDraggableColumnOrder<T extends string>(initialOrder: readonly T[]) {
  const [columnOrder, setColumnOrder] = useState<T[]>(() => [...initialOrder]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (event: DragEvent, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (event: DragEvent, targetIndex: number) => {
    event.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setColumnOrder((currentOrder) => {
      const nextOrder = [...currentOrder];
      const draggedItem = nextOrder[draggedIndex];
      nextOrder.splice(draggedIndex, 1);
      nextOrder.splice(targetIndex, 0, draggedItem);
      return nextOrder;
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getDragProps = (index: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => handleDragStart(event, index),
    onDragOver: (event: DragEvent) => handleDragOver(event, index),
    onDrop: (event: DragEvent) => handleDrop(event, index),
    onDragEnd: handleDragEnd,
  });

  const getDragClassName = (index: number) =>
    [
      draggedIndex === index ? "opacity-30" : "",
      dragOverIndex === index ? "border-l-2 border-primary bg-primary/5" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return {
    columnOrder,
    draggedIndex,
    dragOverIndex,
    getDragClassName,
    getDragProps,
  };
}

