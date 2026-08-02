"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

export type PontoAtivo = {
  ss: string;
  trafo: string;
  lat: number;
  lon: number;
  localidade: string;
  decisao: string;
  cascata: string;
  categoria: string;
  abertura: string;
};

// Um ponto por transformador, na coordenada do próprio ativo. A cor é a decisão da
// esteira, para o mapa responder de longe onde estão os casos que não fecharam.
const COR: Record<string, string> = {
  INCLUIR: "#35634b",
  REVISÃO: "#8b6428",
  EXCLUIR: "#a52a34",
};

export default function MapaAtivos({ pontos, aoEscolher }: {
  pontos: PontoAtivo[];
  aoEscolher: (ss: string) => void;
}) {
  const elemento = useRef<HTMLDivElement>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const camada = useRef<LayerGroup | null>(null);
  const escolher = useRef(aoEscolher);
  escolher.current = aoEscolher;

  useEffect(() => {
    let vivo = true;
    void import("leaflet").then((L) => {
      if (!vivo || !elemento.current) return;
      if (!mapa.current) {
        mapa.current = L.map(elemento.current, {
          center: [-10.25, -48.2], zoom: 6, minZoom: 5, maxZoom: 16, zoomControl: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap", maxZoom: 19,
        }).addTo(mapa.current);
        camada.current = L.layerGroup().addTo(mapa.current);
      }
      const grupo = camada.current;
      if (!grupo) return;
      grupo.clearLayers();
      pontos.forEach((p) => {
        L.circleMarker([p.lat, p.lon], {
          radius: 3.4,
          color: COR[p.decisao] || "#6c6f74",
          weight: 1,
          fillColor: COR[p.decisao] || "#6c6f74",
          fillOpacity: 0.75,
        })
          .bindTooltip(
            `<b>${p.ss}</b><br/>trafo ${p.trafo} · ${p.localidade}<br/>${p.categoria || "sem categoria"} · ${p.decisao}<br/><i>${p.cascata}</i>`,
            { direction: "top", opacity: 0.95 },
          )
          .on("click", () => escolher.current(p.ss))
          .addTo(grupo);
      });
    });
    return () => { vivo = false; };
  }, [pontos]);

  useEffect(() => () => { mapa.current?.remove(); mapa.current = null; }, []);

  return <div ref={elemento} className="mapa-ativos" />;
}
