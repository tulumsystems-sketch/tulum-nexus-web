import React from 'react';

/**
 * Icono decorativo de la bombilla incandescente conectada a circuitos.
 * Representa la innovación conectada y sistemas retro/modernos.
 */
export const LightbulbCircuitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    stroke="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Patrones de Circuitos */}
    <path d="M50 0 v20 m0 60 v20 M0 50 h20 m60 0 h20" strokeWidth="1" className="text-gray-700" strokeDasharray="2 2" />
    <path d="M20 20 l15 15 M80 20 l-15 15 M20 80 l15 -15 M80 80 l-15 -15" strokeWidth="1" className="text-emerald-500/50" />
    
    <circle cx="35" cy="35" r="2" fill="currentColor" className="text-emerald-400/80" />
    <circle cx="65" cy="35" r="2" fill="currentColor" className="text-emerald-400/80" />
    <circle cx="35" cy="65" r="2" fill="currentColor" className="text-emerald-400/80" />
    <circle cx="65" cy="65" r="2" fill="currentColor" className="text-emerald-400/80" />
    
    <circle cx="50" cy="10" r="1.5" fill="currentColor" className="text-emerald-300" />
    <circle cx="90" cy="50" r="1.5" fill="currentColor" className="text-emerald-300" />
    <circle cx="10" cy="50" r="1.5" fill="currentColor" className="text-emerald-300" />

    {/* Bombilla Retro */}
    <g strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
      {/* Filamento superior e inferior */}
      <path d="M40 65 h20 M42 70 h16 M45 75 h10 M45 75 v4 c0 1 2 1 5 1 c3 0 5 0 5 -1 v-4" className="text-gray-300" />
      {/* Contorno del cristal */}
      <path d="M50 25 a16 16 0 1 0 16 16 c0 6 -4 9 -4 14 h-24 c0 -5 -4 -8 -4 -14 a16 16 0 0 0 16 -16 z" className="fill-emerald-500/10 stroke-current text-emerald-400" />
      {/* Filamentos interiores */}
      <path d="M50 35 v8 M46 38 l2 5 M54 38 l-2 5" strokeWidth="1.5" className="text-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,1)]" />
    </g>
  </svg>
);
