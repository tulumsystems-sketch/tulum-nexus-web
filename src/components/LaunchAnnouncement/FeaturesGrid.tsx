import React from 'react';
import { InventoryMockup, CashRegisterMockup, WhatsAppMockup } from './Mockups';

interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Tarjeta individual del feature grid. 
 * Estilizada de forma minimalista y premium con bordes dorados en hover.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, children }) => (
  <div 
    className="flex flex-col h-full border border-gray-800 hover:border-emerald-500/40 rounded-3xl bg-[#111622]/40 
               backdrop-blur-md p-6 lg:p-8 transition-all duration-500 ease-out 
               shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)] 
               hover:-translate-y-1 group relative overflow-hidden"
  >
    {/* Glow de fondo superior */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

    {/* Contenedor del Mockup */}
    <div className="flex-1 mb-8 overflow-hidden rounded-2xl bg-[#090C15] border border-gray-800/80 flex items-center justify-center p-5 relative min-h-[180px]">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {children}
    </div>
    
    {/* Textos */}
    <div className="relative z-10">
      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-wide">{title}</h3>
      <p className="text-sm md:text-base text-gray-400 leading-relaxed font-light">{description}</p>
    </div>
  </div>
);

/**
 * Grid de los 3 features principales según especificaciones del usuario.
 */
export const FeaturesGrid: React.FC = () => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full mt-12">
      <FeatureCard 
        title="Multi-Tenant Inventory" 
        description="Arquitectura cloud unificada con bases de datos aisladas. Control total multimarca con distribución de stock y trazabilidad en tiempo real."
      >
        <InventoryMockup />
      </FeatureCard>
      
      <FeatureCard 
        title="Real-time Cash Register" 
        description="Gestión de caja de grado empresarial. Monitoreo en vivo de transacciones, control estricto de estados y auditoría inmutable."
      >
        <CashRegisterMockup />
      </FeatureCard>

      <FeatureCard 
        title="Premium WhatsApp Bot" 
        description="Automatización conversacional inteligente. Vende, asiste y fideliza 24/7 de forma ininterrumpida a través de WhatsApp."
      >
        <WhatsAppMockup />
      </FeatureCard>
    </section>
  );
};
