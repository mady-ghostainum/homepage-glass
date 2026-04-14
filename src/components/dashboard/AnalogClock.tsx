import { useState, useEffect } from 'react';

export default function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        {/* Clock face */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Outer ring */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <circle cx="50" cy="50" r="46" fill="rgba(255,255,255,0.08)" />

          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const isMain = i % 3 === 0;
            const r1 = isMain ? 38 : 40;
            const r2 = 44;
            return (
              <line
                key={i}
                x1={50 + r1 * Math.cos(angle)}
                y1={50 + r1 * Math.sin(angle)}
                x2={50 + r2 * Math.cos(angle)}
                y2={50 + r2 * Math.sin(angle)}
                stroke={isMain ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"}
                strokeWidth={isMain ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Minute dots */}
          {Array.from({ length: 60 }).map((_, i) => {
            if (i % 5 === 0) return null;
            const angle = (i * 6 - 90) * (Math.PI / 180);
            return (
              <circle
                key={i}
                cx={50 + 43 * Math.cos(angle)}
                cy={50 + 43 * Math.sin(angle)}
                r="0.5"
                fill="rgba(255,255,255,0.2)"
              />
            );
          })}

          {/* Hour hand */}
          <line
            x1="50" y1="50"
            x2="50" y2="24"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform={`rotate(${hourDeg}, 50, 50)`}
            style={{ transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          />

          {/* Minute hand */}
          <line
            x1="50" y1="50"
            x2="50" y2="16"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${minuteDeg}, 50, 50)`}
            style={{ transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          />

          {/* Second hand */}
          <line
            x1="50" y1="56"
            x2="50" y2="14"
            stroke="rgba(147,197,253,0.8)"
            strokeWidth="0.8"
            strokeLinecap="round"
            transform={`rotate(${secondDeg}, 50, 50)`}
          />

          {/* Center dot */}
          <circle cx="50" cy="50" r="2.5" fill="rgba(255,255,255,0.9)" />
          <circle cx="50" cy="50" r="1" fill="rgba(147,197,253,0.9)" />
        </svg>
      </div>
      {/* Digital time below */}
      <div className="glass-text text-xs font-light tracking-[0.3em] opacity-70">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>
    </div>
  );
}
