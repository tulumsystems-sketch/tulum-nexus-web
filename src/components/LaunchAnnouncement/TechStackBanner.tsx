import React from 'react';

/**
 * Componente que representa un placeholder para un logo de tecnología.
 * Está diseñado para ser reemplazado fácilmente más adelante.
 */
interface LogoPlaceholderProps {
  name: string;
}

const LogoPlaceholder: React.FC<LogoPlaceholderProps> = ({ name }) => (
  <div 
    className="h-16 flex-1 min-w-[140px] max-w-[200px] border-2 border-dashed border-gray-700 rounded-xl 
               flex items-center justify-center bg-[#151a25]/50 backdrop-blur-sm
               text-xs md:text-sm font-semibold tracking-widest text-gray-500 
               hover:text-emerald-400 hover:border-emerald-500/70 hover:bg-emerald-500/5 
               transition-all duration-300 cursor-pointer shadow-sm shadow-black/20"
  >
    UPLOAD {name}
  </div>
);

/**
 * Banner horizontal que muestra el stack tecnológico del proyecto.
 * Mantiene el estilo oscuro premium solicitado.
 */
export const TechStackBanner: React.FC = () => {
  return (
    <div className="w-full mt-24 pt-12 border-t border-gray-800/80 bg-gradient-to-b from-transparent to-[#05080f]/50 rounded-b-3xl">
      <div className="flex flex-col items-center justify-center">
        <h4 className="text-center text-gray-500 text-xs font-bold tracking-[0.2em] uppercase mb-10">
          Built with Cutting-Edge Tech
        </h4>
        <div className="flex flex-wrap justify-center gap-6 px-4 w-full max-w-5xl pb-12">
          <LogoPlaceholder name="SPRING BOOT" />
          <LogoPlaceholder name="REACT" />
          <LogoPlaceholder name="NEON.TECH" />
          <LogoPlaceholder name="CLOUDINARY" />
        </div>
      </div>
    </div>
  );
};
