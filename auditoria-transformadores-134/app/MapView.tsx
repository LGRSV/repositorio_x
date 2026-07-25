"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type MapPoint = {
  name: string;
  latitude: number;
  longitude: number;
  total: number;
  burned: number;
  damaged: number;
  expurged: number;
};

export default function MapView({ points, onSelect }: {
  points: MapPoint[];
  onSelect: (municipality: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let active = true;
    void import("leaflet").then((leaflet) => {
      if (!active || !element.current || map.current) return;

      const instance = leaflet.map(element.current, {
        center: [-10.25, -48.2],
        zoom: 6,
        minZoom: 5,
        maxZoom: 14,
        zoomControl: true,
      });

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(instance);

      const bounds: [number, number][] = [];
      points.forEach((point) => {
        const radius = Math.max(8, Math.min(23, 7 + point.total * 1.25));
        const marker = leaflet.circleMarker([point.latitude, point.longitude], {
          radius,
          color: "#fff",
          weight: 2,
          fillColor: point.expurged ? "#b42318" : "#16212b",
          fillOpacity: 0.86,
        }).addTo(instance);
        marker.bindTooltip(
          `<strong>${point.name}</strong><br>${point.total} casos · ${point.burned} queimados · ${point.damaged} avariados`,
          { direction: "top", offset: [0, -6] },
        );
        marker.on("click", () => onSelect(point.name));
        bounds.push([point.latitude, point.longitude]);
      });

      if (bounds.length) instance.fitBounds(bounds, { padding: [24, 24], maxZoom: 7 });
      map.current = instance;
    });

    return () => {
      active = false;
      map.current?.remove();
      map.current = null;
    };
  }, [points, onSelect]);

  return <div className="transformer-map" ref={element} aria-label="Mapa aproximado dos transformadores por município" />;
}
