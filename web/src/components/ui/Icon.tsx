"use client";

export type IconName = "leaf" | "house" | "sensor" | "bell" | "settings" | "speaker" | "users" | "history" | "menu" | "close" | "check" | "warning" | "clock" | "wifi" | "calendar" | "shield" | "sliders" | "refresh" | "power" | "play" | "info" | "chart" | "arrow" | "search" | "activity" | "thermo" | "drop" | "database" | "home" | "sound" | "user" | "chevron" | "download" | "filter" | "updown";

export function Icon({ name, size = 21 }: { name: IconName; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (name) {
    case "leaf": return <svg {...props}><path d="M21 3C11 3 4 6 4 15a6 6 0 0 0 6 6c9 0 12-8 11-18Z"/><path d="M3 22c4-8 8-12 15-16"/></svg>;
    case "house": return <svg {...props}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/></svg>;
    case "sensor": return <svg {...props}><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 7h4M10 11h4M10 15h4M3 7h2M3 12h2M3 17h2M19 7h2M19 12h2M19 17h2"/></svg>;
    case "bell": return <svg {...props}><path d="M18 9a6 6 0 1 0-12 0c0 6-3 7-3 9h18c0-2-3-3-3-9ZM10 22h4"/></svg>;
    case "settings": return <svg {...props}><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M18.4 5.6l-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg>;
    case "speaker": return <svg {...props}><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 5a10 10 0 0 1 0 14"/></svg>;
    case "users": return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-4.5 2.5-7 7-7s7 2.5 7 7M16 5a3.5 3.5 0 0 1 0 7M18 15c3 0 4 2 4 6"/></svg>;
    case "history": return <svg {...props}><path d="M3 12a9 9 0 1 0 2-5M3 4v5h5M12 7v5l4 2"/></svg>;
    case "menu": return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case "close": return <svg {...props}><path d="M5 5 19 19M19 5 5 19"/></svg>;
    case "check": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></svg>;
    case "warning": return <svg {...props}><path d="m12 3 10 18H2L12 3Z"/><path d="M12 10v4M12 18h.01"/></svg>;
    case "clock": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg>;
    case "wifi": return <svg {...props}><path d="M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>;
    case "calendar": return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
    case "shield": return <svg {...props}><path d="m12 2 8 4v6c0 5-3.5 8.3-8 10-4.5-1.7-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "sliders": return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="#10252d"/><circle cx="16" cy="12" r="2" fill="#10252d"/><circle cx="10" cy="18" r="2" fill="#10252d"/></svg>;
    case "refresh": return <svg {...props}><path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/></svg>;
    case "power": return <svg {...props}><path d="M12 2v10M7 5a9 9 0 1 0 10 0"/></svg>;
    case "play": return <svg {...props}><path d="m8 5 11 7-11 7V5Z"/></svg>;
    case "info": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
    case "chart": return <svg {...props}><path d="M3 3v18h18"/><path d="m6 16 5-6 4 3 5-7"/></svg>;
    case "arrow": return <svg {...props}><path d="m9 18 6-6-6-6"/></svg>;
    case "search": return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>;
    case "activity": return <svg {...props}><path d="M2 12h4l3-7 5 14 3-7h5"/></svg>;
    case "thermo": return <svg {...props}><path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 9v10"/></svg>;
    case "drop": return <svg {...props}><path d="M12 2C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-13Z"/></svg>;
    case "home": return <svg {...props}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/></svg>;
    case "sound": return <svg {...props}><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 5a10 10 0 0 1 0 14"/></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></svg>;
    case "chevron": return <svg {...props}><path d="m9 18 6-6-6-6"/></svg>;
    case "download": return <svg {...props}><path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/></svg>;
    case "filter": return <svg {...props}><path d="M4 5h16l-6 7v6l-4 3v-9L4 5Z"/></svg>;
    case "updown": return <svg {...props}><path d="m8 8 4-4 4 4M8 16l4 4 4-4"/></svg>;
    case "database": return <svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 12c0 2 4 3 9 3s9-1 9-3"/></svg>;
  }
}

