import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ResponsiveCard = {
  content: ReactNode;
  id: string;
  weight: number;
};

export function ResponsiveCardColumns({ cards }: { cards: ResponsiveCard[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumnCount = () => {
      const width = container.clientWidth;
      setColumnCount(width >= 940 ? 3 : width >= 620 ? 2 : 1);
    };

    updateColumnCount();
    const observer = new ResizeObserver(updateColumnCount);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const columns = useMemo(() => {
    const nextColumns = Array.from({ length: columnCount }, () => [] as ResponsiveCard[]);
    const columnWeights = Array.from({ length: columnCount }, () => 0);

    cards.forEach((card) => {
      const targetColumn = columnWeights.indexOf(Math.min(...columnWeights));
      nextColumns[targetColumn].push(card);
      columnWeights[targetColumn] += card.weight;
    });

    return nextColumns;
  }, [cards, columnCount]);

  return (
    <div
      ref={containerRef}
      className="grid items-start gap-2"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-col gap-2">
          {column.map((card) => (
            <div key={card.id}>{card.content}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
