"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { EventCard } from "@/components/EventCard";
import type { EventItem } from "@/lib/types";

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="text-kanio-muted">Chargement...</p>}>
      <EventsPageContent />
    </Suspense>
  );
}

function EventsPageContent() {
  const searchParams = useSearchParams();
  const sport = searchParams.get("sport");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = sport ? `?sport=${encodeURIComponent(sport)}` : "";
    api
      .get<{ events: EventItem[] }>(`/api/events${qs}`)
      .then((res) => setEvents(res.events))
      .finally(() => setLoading(false));
  }, [sport]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Evenements{sport ? ` - ${sport}` : ""}</h1>
      {loading && <p className="text-kanio-muted">Chargement...</p>}
      <div className="space-y-4">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
      {!loading && events.length === 0 && <p className="text-kanio-muted">Aucun evenement disponible pour le moment.</p>}
    </div>
  );
}
