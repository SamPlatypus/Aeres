import { createFileRoute } from "@tanstack/react-router";
import { AresInstrument } from "@/components/ares-instrument";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AresInstrument />;
}
