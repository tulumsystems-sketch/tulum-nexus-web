import React from 'react';
import { LightbulbCircuitIcon } from './LightbulbCircuitIcon';

/**
 * Sección superior (Header): Logo, Icono decorativo y Headline Principal
 */
export const HeaderSection: React.FC = () => {
  return (
    <header className="relative w-full flex flex-col space-y-16 lg:space-y-20 pt-8 pb-4">
      {/* Top Bar: Logo a la izquierda, Decoración a la derecha */}
      <div className="flex justify-between items-start w-full">
        {/* Logo principal real */}
        <div className="flex items-center">
          <img 
            src="/lOGO tuLUM.png" 
            alt="Tulum Systems Logo" 
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          />
        </div>

        {/* Decoración retro/tech superior derecha */}
        <div className="relative group cursor-default hidden sm:block">
          {/* Resplandor animado de fondo */}
          <div className="absolute -inset-4 sm:-inset-6 bg-emerald-500/20 blur-2xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
          <LightbulbCircuitIcon className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400 relative z-10" />
        </div>
      </div>

      {/* Titular Principal - Headline */}
      <div className="max-w-4xl relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold font-sans leading-[1.1] tracking-tight">
          <span className="text-white block mb-2">It's Official: </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 block">
            Tulum Systems v1.0
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Has Launched! 🚀
          </span>
        </h1>
        <p className="mt-8 text-xl sm:text-2xl text-gray-400 font-light tracking-wide max-w-2xl border-l-4 border-emerald-500/50 pl-6">
          Giving Life to <strong className="text-white font-semibold">Smart Commerce.</strong>
        </p>
      </div>

      {/* Efecto decorativo opcional para el fondo principal */}
      <div className="absolute top-1/4 -right-1/4 w-[50rem] h-[50rem] bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
    </header>
  );
};
