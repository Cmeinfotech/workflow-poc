import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FileText, Plane, Ship, Truck, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { ChiaroLogo } from "@/components/brand/ChiaroLogo";
import { isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login", search: { redirect: "/workspace" } });
    }
  },
  component: ShipmentWorkspace,
  head: () => ({
    meta: [
      { title: "S&L OCR Workspace - Chiaro OCR Inventory" },
      { name: "description", content: "Select a shipment type before opening the OCR dashboard." },
    ],
  }),
});

const shipmentTypes = [
  {
    id: "LTL",
    title: "LTL",
    subtitle: "Less Than Truckload",
    icon: Truck,
    color: "blue",
    subtypes: [
      "BOL - Bill of Lading",
      "POD - Proof of Delivery",
      "Freight Bill / Invoice",
      "Delivery Receipt",
      "Rate Confirmation",
      "Pickup Confirmation",
      "Accessorial Charge Document",
    ],
  },
  {
    id: "FTL",
    title: "FTL",
    subtitle: "Full Truckload",
    icon: Warehouse,
    color: "green",
    subtypes: [
      "BOL - Bill of Lading",
      "POD - Proof of Delivery",
      "Rate Confirmation",
      "Delivery Receipt",
      "Freight Invoice",
      "Pickup/Delivery Confirmation",
    ],
  },
  {
    id: "Air",
    title: "Air",
    subtitle: "Air Freight",
    icon: Plane,
    color: "violet",
    subtypes: [
      "AWB - Air Waybill",
      "MAWB - Master Air Waybill",
      "HAWB - House Air Waybill",
      "POD - Proof of Delivery",
      "Commercial Invoice",
      "Packing List",
      "Customs Declaration",
    ],
  },
  {
    id: "Ocean",
    title: "Ocean",
    subtitle: "Ocean Freight",
    icon: Ship,
    color: "cyan",
    subtypes: [
      "MBL - Master B/L",
      "HBL - House B/L",
      "Sea Waybill",
      "Commercial Invoice",
      "Packing List",
      "Arrival Notice",
      "Delivery Order",
      "Customs Declaration",
    ],
  },
] as const;

const tones = {
  blue: {
    card: "border-blue-200 bg-blue-50/35 hover:border-blue-300",
    selected: "border-blue-500 shadow-[0_18px_46px_rgba(37,99,235,0.16)]",
    icon: "bg-blue-100 text-blue-600",
    label: "text-blue-600",
    chip: "bg-blue-100 text-blue-600",
  },
  green: {
    card: "border-emerald-200 bg-emerald-50/35 hover:border-emerald-300",
    selected: "border-emerald-500 shadow-[0_18px_46px_rgba(16,185,129,0.16)]",
    icon: "bg-emerald-100 text-emerald-600",
    label: "text-emerald-600",
    chip: "bg-emerald-100 text-emerald-600",
  },
  violet: {
    card: "border-violet-200 bg-violet-50/35 hover:border-violet-300",
    selected: "border-violet-500 shadow-[0_18px_46px_rgba(124,58,237,0.16)]",
    icon: "bg-violet-100 text-violet-600",
    label: "text-violet-600",
    chip: "bg-violet-100 text-violet-600",
  },
  cyan: {
    card: "border-cyan-200 bg-cyan-50/35 hover:border-cyan-300",
    selected: "border-cyan-500 shadow-[0_18px_46px_rgba(8,145,178,0.16)]",
    icon: "bg-cyan-100 text-cyan-700",
    label: "text-cyan-700",
    chip: "bg-cyan-100 text-cyan-700",
  },
};

function ShipmentWorkspace() {
  const navigate = useNavigate();
  const [selectedShipment, setSelectedShipment] = useState<(typeof shipmentTypes)[number]["id"]>("LTL");

  useEffect(() => {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  }, []);

  const openDashboard = () => {
    navigate({ to: "/", search: { shipmentType: selectedShipment } });
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1480px] flex-col">
        <header className="border-b border-border pb-6">
          <div>
            <ChiaroLogo className="justify-start" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Our system provides OCR processing for every shipment workflow and can handle any type of document within 24-48 hours.
            </p>
          </div>
        </header>

        <section className="mt-6 grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {shipmentTypes.map((shipment) => {
            const Icon = shipment.icon;
            const tone = tones[shipment.color];
            const selected = selectedShipment === shipment.id;

            return (
              <button
                key={shipment.id}
                type="button"
                onClick={() => setSelectedShipment(shipment.id)}
                className={cn(
                  "flex h-full min-h-[460px] flex-col rounded-lg border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  tone.card,
                  selected && tone.selected,
                )}
                aria-pressed={selected}
              >
                <div className="flex flex-col items-center border-b border-slate-200 pb-6 text-center">
                  <div className={cn("grid size-20 place-items-center rounded-full", tone.icon)}>
                    <Icon className="size-9" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold leading-none text-slate-950">{shipment.title}</h2>
                  <p className="mt-3 text-sm font-medium text-slate-600">{shipment.subtitle}</p>
                </div>

                <div className="mt-5">
                  <div className={cn("text-xs font-bold", tone.label)}>Sub Types</div>
                  <ul className="mt-4 space-y-3">
                    {shipment.subtypes.map((subtype) => (
                      <li key={subtype} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                        <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded", tone.chip)}>
                          <FileText className="size-3" />
                        </span>
                        <span className="leading-5">{subtype}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={openDashboard}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Next
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
