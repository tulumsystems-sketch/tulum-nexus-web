import React from 'react';

export const InventoryMockup: React.FC = () => (
  <div className="w-full flex flex-col space-y-3 font-sans px-2">
    <div className="flex justify-between text-[11px] text-gray-500 pb-2 border-b border-gray-800/60 uppercase tracking-widest font-semibold">
      <span>Producto</span>
      <span>Stock</span>
      <span>Precio</span>
    </div>
    {[1, 2, 3].map((i) => (
      <div 
        key={i} 
        className="flex justify-between items-center py-2 relative hover:-translate-y-0.5 transition-transform duration-300 cursor-default"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-gray-900 border border-dashed border-gray-700 flex items-center justify-center text-[9px] text-gray-600 font-medium">
            IMG
          </div>
          <div className="flex flex-col space-y-1.5">
            <div className={`h-2 rounded bg-gray-300 ${i === 2 ? 'w-20' : 'w-24'}`}></div>
            <div className={`h-1.5 rounded bg-gray-600 ${i === 3 ? 'w-10' : 'w-14'}`}></div>
          </div>
        </div>
        <div className="w-8 h-2.5 bg-emerald-500/80 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
        <div className="w-12 h-2.5 bg-emerald-400/80 rounded shadow-[0_0_8px_rgba(16,185,129,0.2)]"></div>
      </div>
    ))}
  </div>
);

export const CashRegisterMockup: React.FC = () => (
  <div className="w-full flex items-center justify-center">
    <div className="bg-[#10141d] w-full p-5 rounded-2xl border border-gray-800 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-5">
        <span className="text-xs text-gray-400 font-medium tracking-wide">Estado de Caja</span>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
          ● ABIERTA
        </span>
      </div>
      <div className="flex flex-col space-y-1 mb-6">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Balance Actual</span>
        <span className="text-3xl font-extrabold text-white font-mono tracking-tight">$ 4,250.00</span>
      </div>
      <div className="flex space-x-3">
        <button className="flex-1 py-2.5 rounded-lg bg-[#0B0F19] text-gray-400 text-xs font-semibold hover:text-white border border-gray-800 transition-colors">
          CERRAR
        </button>
        <button className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all">
          VENDER
        </button>
      </div>
    </div>
  </div>
);

export const WhatsAppMockup: React.FC = () => (
  <div className="w-full h-full min-h-[160px] flex flex-col justify-end bg-[#0B0F19] relative overflow-hidden rounded-xl">
    {/* Fondo simulando el pattern de chat */}
    <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fff_10px,#fff_20px)] mix-blend-overlay pointer-events-none"></div>
    
    <div className="flex flex-col space-y-4 w-full p-4 relative z-10">
      <div className="self-end bg-[#005c4b] text-white p-3 rounded-l-2xl rounded-tr-2xl text-xs max-w-[85%] shadow-md relative">
        <p className="leading-snug">¡Hola! Me gustaría hacer un pedido. 🛒</p>
        <div className="absolute right-1.5 bottom-1">
          {/* Double check marks - Read status */}
          <svg viewBox="0 0 16 15" width="12" height="12" fill="currentColor" className="text-blue-400">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.064-.512zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51z" />
          </svg>
        </div>
      </div>
      <div className="self-start bg-[#1f2c34] text-gray-200 p-3 rounded-r-2xl rounded-tl-2xl text-xs max-w-[90%] border border-gray-700/50 shadow-md">
        <p className="leading-relaxed">
          ¡Bienvenido a Tulum Systems! 🚀<br/>
          ¿Qué producto buscas hoy? Tenemos el catálogo actualizado.
        </p>
      </div>
    </div>
  </div>
);
