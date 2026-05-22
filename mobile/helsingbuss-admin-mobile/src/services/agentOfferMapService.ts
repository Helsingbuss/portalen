import { supabase } from "../lib/supabase";

export type AgentOfferRoutePoint = {
  id: string;
  offerId: string;
  pointType: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  sortOrder: number;
};

export type AgentOfferMapData = {
  offer: {
    id: string;
    reference: string;
    customerName: string;
    departure: string;
    destination: string;
    viaText: string;
    status: string;
  };
  routePoints: AgentOfferRoutePoint[];
  roadPolyline: {
    latitude: number;
    longitude: number;
  }[];
  source: "database" | "geocoded" | "empty";
};

function pick(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function mapOffer(row: any) {
  return {
    id: String(pick(row, ["id", "uuid"]) || ""),
    reference: String(
      pick(row, ["offer_number", "offerNumber", "reference", "synergybus_id", "id"]) || ""
    ),
    customerName: String(
      pick(row, [
        "customer_name",
        "customerName",
        "Namn_efternamn",
        "contact_person",
        "foretag_forening",
      ]) || ""
    ),
    departure: String(
      pick(row, [
        "departure_place",
        "departure",
        "departure_city",
        "from",
        "pickup_place",
      ]) || ""
    ),
    destination: String(
      pick(row, [
        "destination",
        "destination_city",
        "final_destination",
        "to",
        "dropoff_place",
      ]) || ""
    ),
    viaText: String(
      pick(row, [
        "via",
        "stopover_places",
        "stopoverPlaces",
        "stop",
        "extra_stops",
        "stops",
      ]) || ""
    ),
    status: String(pick(row, ["status"]) || "inkommen"),
  };
}

function mapPoint(row: any): AgentOfferRoutePoint {
  return {
    id: String(row?.id || ""),
    offerId: String(row?.offer_id || ""),
    pointType: String(row?.point_type || "stop"),
    label: String(row?.label || row?.address || "Stopp"),
    address: String(row?.address || row?.label || ""),
    latitude: Number(row?.latitude || 0),
    longitude: Number(row?.longitude || 0),
    sortOrder: Number(row?.sort_order || 0),
  };
}

function splitViaStops(value: string) {
  if (!value) return [];

  return value
    .split(/\r?\n|;|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function geocodeAddress(address: string, index: number, pointType: string) {
  const clean = address.trim();

  if (!clean) return null;

  const query = encodeURIComponent(clean + ", Sverige");

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
      {
        headers: {
          "User-Agent": "HelsingbussAdminApp/1.0",
        },
      }
    );

    const result = await response.json();

    if (!Array.isArray(result) || result.length === 0) {
      return null;
    }

    const first = result[0];

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);

    if (!latitude || !longitude) return null;

    return {
      id: `geo-${index}`,
      offerId: "",
      pointType,
      label: clean,
      address: clean,
      latitude,
      longitude,
      sortOrder: index,
    } satisfies AgentOfferRoutePoint;
  } catch (error: any) {
    console.log("geocodeAddress error:", error?.message || error);
    return null;
  }
}

async function buildGeocodedPoints(offer: AgentOfferMapData["offer"]) {
  const labels: { label: string; type: string }[] = [];

  if (offer.departure) {
    labels.push({
      label: offer.departure,
      type: "start",
    });
  }

  for (const stop of splitViaStops(offer.viaText)) {
    labels.push({
      label: stop,
      type: "stop",
    });
  }

  if (offer.destination) {
    labels.push({
      label: offer.destination,
      type: "destination",
    });
  }

  const points: AgentOfferRoutePoint[] = [];

  for (let i = 0; i < labels.length; i++) {
    const point = await geocodeAddress(labels[i].label, i, labels[i].type);

    if (point) {
      points.push(point);
    }
  }

  return points;
}

async function fetchRoadPolyline(points: AgentOfferRoutePoint[]) {
  if (points.length < 2) return [];

  const coordinates = points
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
    );

    const result = await response.json();

    const coords = result?.routes?.[0]?.geometry?.coordinates;

    if (!Array.isArray(coords)) return [];

    return coords
      .map((coord: any) => ({
        longitude: Number(coord[0]),
        latitude: Number(coord[1]),
      }))
      .filter((coord: any) => coord.latitude && coord.longitude);
  } catch (error: any) {
    console.log("fetchRoadPolyline error:", error?.message || error);
    return [];
  }
}

export async function getAgentOfferMapData(offerId: string): Promise<AgentOfferMapData | null> {
  const { data, error } = await supabase.rpc("get_agent_offer_map", {
    p_offer_id: offerId,
  });

  if (error) {
    console.log("get_agent_offer_map error:", error.message);
    return null;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    console.log("get_agent_offer_map response:", raw?.error);
    return null;
  }

  const offer = mapOffer(raw.offer);

  let routePoints: AgentOfferRoutePoint[] = Array.isArray(raw.routePoints)
    ? raw.routePoints
        .map(mapPoint)
        .filter((point: AgentOfferRoutePoint) => point.latitude && point.longitude)
    : [];

  let source: AgentOfferMapData["source"] = routePoints.length >= 2 ? "database" : "empty";

  if (routePoints.length < 2) {
    routePoints = await buildGeocodedPoints(offer);
    source = routePoints.length >= 2 ? "geocoded" : "empty";
  }

  const roadPolyline = await fetchRoadPolyline(routePoints);

  return {
    offer,
    routePoints,
    roadPolyline: roadPolyline.length >= 2 ? roadPolyline : routePoints.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    })),
    source,
  };
}
