import React from 'react';
import { HeaderSection } from './HeaderSection';
import { FeaturesGrid } from './FeaturesGrid';

/**
 * LaunchAnnouncement
 * 
 * Componente principal para el anuncio de SaaS v1.0.
 * Utiliza Tailwind CSS intensivamente para lograr el diseño Premium, oscuro (Charcoal) o moderno.
 * Diseñado bajo principios de SOLID, donde los sub-componentes manejan sus propias responsabilidades.
 */
export const LaunchAnnouncement: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500/30 selection:text-white relative overflow-hidden">
      
      {/* Background radial gradient to add depth to charcoal background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-800/20 via-[#0B0F19] to-[#0B0F19] pointer-events-none" />
      
      {/* Container Principal */}
      <main className="w-full max-w-7xl relative z-10 flex flex-col space-y-8 sm:space-y-12 pb-20">
        <HeaderSection />
        <FeaturesGrid />
      </main>

    </div>
  );
};
