import React, { useEffect, useRef } from 'react';
import { Driver, DriverStatus, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface MapViewProps {
  drivers: Driver[];
  lang: Language;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

const MapView: React.FC<MapViewProps> = ({ drivers, lang }) => {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const placemarksRef = useRef<Map<string, any>>(new Map());
  const t = TRANSLATIONS[lang];

  // Initialize Map
  useEffect(() => {
    if (!window.ymaps) {
      console.warn("Yandex Maps API not loaded");
      return;
    }

    window.ymaps.ready(() => {
      if (!mapContainerRef.current) return;

      // If map already exists, don't recreate
      if (mapRef.current) return;

      const map = new window.ymaps.Map(mapContainerRef.current, {
        center: [41.2995, 69.2401], // Tashkent
        zoom: 12,
        controls: ['zoomControl', 'fullscreenControl'],
        type: 'yandex#hybrid' // Satellite view
      }, {
        searchControlProvider: 'yandex#search',
        suppressMapOpenBlock: true
      });

      mapRef.current = map;
    });
  }, []);

  // Update Driver Markers
  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return;

    window.ymaps.ready(() => {
      // Filter to only show ACTIVE drivers
      const activeDrivers = drivers.filter(d => d.status === DriverStatus.ACTIVE);
      const currentDriverIds = new Set(activeDrivers.map(d => d.id));

      // 1. Remove markers for drivers that are no longer in the list
      placemarksRef.current.forEach((placemark, id) => {
        if (!currentDriverIds.has(id)) {
          mapRef.current.geoObjects.remove(placemark);
          placemarksRef.current.delete(id);
        }
      });

      // 2. Add or Update markers
      // Define Custom Layout for the marker
      const AvatarLayout = window.ymaps.templateLayoutFactory.createClass(
        `<div class="driver-marker-root" style="position: relative;">
                <div style="
                    width: 50px; 
                    height: 50px; 
                    border-radius: 50%; 
                    overflow: hidden; 
                    border: 3px solid $[properties.borderColor];
                    box-shadow: 0 4px 10px rgba(0,0,0,0.6);
                    background: #1e293b;
                    position: absolute;
                    left: -25px;
                    top: -25px;
                    transition: transform 0.2s;
                ">
                    <img src="$[properties.avatar]" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div style="
                    position: absolute;
                    top: 25px;
                    left: -50px;
                    width: 100px;
                    text-align: center;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    border-radius: 4px;
                    padding: 2px 4px;
                    font-size: 10px;
                    font-family: sans-serif;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                " class="marker-label">
                    $[properties.name]
                </div>
            </div>`
      );

      activeDrivers.forEach(driver => {
        let placemark = placemarksRef.current.get(driver.id);

        let color = '#94a3b8'; // gray
        if (driver.status === DriverStatus.ACTIVE) color = '#22c55e'; // green
        if (driver.status === DriverStatus.BUSY) color = '#eab308'; // yellow
        if (driver.status === DriverStatus.IDLE) color = '#3b82f6'; // blue
        if (driver.status === DriverStatus.OFFLINE) color = '#ef4444'; // red

        // Status translation for Balloon
        let statusText = t.offline;
        if (driver.status === DriverStatus.ACTIVE) statusText = t.active;
        if (driver.status === DriverStatus.BUSY) statusText = t.busy;
        if (driver.status === DriverStatus.IDLE) statusText = t.idle;

        const balloonContent = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <img src="${driver.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                <b style="font-size:14px;">${driver.name}</b>
            </div>
            <div style="font-size:13px; line-height:1.4;">
                <b>${t.status}:</b> ${statusText}<br>
                <b>${t.car}:</b> ${driver.carModel}<br>
                <b>${t.plate}:</b> ${driver.licensePlate}<br>
                <b>${t.phone}:</b> ${driver.phone}
            </div>
          `;

        if (!placemark) {
          placemark = new window.ymaps.Placemark(
            [driver.location.lat, driver.location.lng],
            {
              name: driver.name,
              avatar: driver.avatar,
              borderColor: color,
              balloonContentBody: balloonContent,
              hintContent: driver.name
            },
            {
              iconLayout: AvatarLayout,
              iconShape: {
                type: 'Circle',
                coordinates: [0, 0],
                radius: 25
              },
              iconContentLayout: AvatarLayout
            }
          );

          mapRef.current.geoObjects.add(placemark);
          placemarksRef.current.set(driver.id, placemark);
        } else {
          // Update position
          placemark.geometry.setCoordinates([driver.location.lat, driver.location.lng]);

          // Update properties
          placemark.properties.set({
            avatar: driver.avatar,
            borderColor: color,
            name: driver.name,
            balloonContentBody: balloonContent,
          });
        }
      });
    });

  }, [drivers, lang, t]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default MapView;