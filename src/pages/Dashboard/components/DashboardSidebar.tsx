import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  Building2,
  CalendarClock,
  ChevronDown,
  ChefHat,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Package,
  PanelLeftClose,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Users,
} from 'lucide-react';
import type { TabType } from '../tabTypes';

const ICON = 20;
const STROKE = 1.75;

type NavDest =
  | { type: 'tab'; tab: TabType }
  | { type: 'pos' }
  | { type: 'turnos' };

interface NavItemDef {
  id: string;
  label: string;
  icon: LucideIcon;
  dest: NavDest;
  show: boolean;
}

interface NavGroupDef {
  id: string;
  label: string;
  pinned?: boolean;
  items: NavItemDef[];
}

export interface DashboardSidebarProps {
  open: boolean;
  nombreEmpresa?: string;
  logoUrl?: string;
  esRestaurante: boolean;
  esAdmin: boolean;
  esPreventista: boolean;
  isOperador: boolean;
  puedeUsarPOS: boolean;
  mesasHabilitado: boolean;
  clientesHabilitado: boolean;
  remitosHabilitado: boolean;
  comprasHabilitado: boolean;
  stockHabilitado: boolean;
  activeTab: TabType;
  turnosOpen: boolean;
  cajaAbierta: boolean;
  onTabChange: (tab: TabType) => void;
  onGoPos: () => void;
  onOpenTurnos: () => void;
  onAbrirCaja: () => void;
  onCerrarCaja: () => void;
  onLogout: () => void;
  onGoHome: () => void;
  onCollapse: () => void;
}

function buildGroups(p: DashboardSidebarProps): NavGroupDef[] {
  if (p.esRestaurante) {
    return [
      {
        id: 'salon',
        label: 'Salón',
        pinned: true,
        items: [
          {
            id: 'mesas',
            label: 'Mesas',
            icon: LayoutGrid,
            dest: { type: 'tab', tab: 'mesas' },
            show: !p.esPreventista && p.mesasHabilitado,
          },
          {
            id: 'pedidos',
            label: 'Pedidos',
            icon: ChefHat,
            dest: { type: 'tab', tab: 'pedidos' },
            show: !p.esPreventista,
          },
          {
            id: 'mostrador',
            label: 'Mostrador',
            icon: ShoppingCart,
            dest: { type: 'pos' },
            show: p.puedeUsarPOS,
          },
          {
            id: 'hojas',
            label: 'Hojas de ruta',
            icon: Truck,
            dest: { type: 'tab', tab: 'remitos' },
            show: p.remitosHabilitado,
          },
        ],
      },
      {
        id: 'carta',
        label: 'Carta',
        pinned: true,
        items: [
          {
            id: 'carta',
            label: 'Carta',
            icon: Package,
            dest: { type: 'tab', tab: 'products' },
            show: true,
          },
          {
            id: 'categorias',
            label: 'Categorías',
            icon: Tags,
            dest: { type: 'tab', tab: 'categories' },
            show: !p.esPreventista,
          },
        ],
      },
      {
        id: 'deposito',
        label: 'Depósito',
        pinned: true,
        items: [
          {
            id: 'stock',
            label: 'Stock',
            icon: Boxes,
            dest: { type: 'tab', tab: 'movimientos' },
            show: !p.esPreventista,
          },
        ],
      },
      {
        id: 'cierre',
        label: 'Turno',
        pinned: true,
        items: [
          {
            id: 'ventas',
            label: 'Ventas',
            icon: Receipt,
            dest: { type: 'tab', tab: 'sales' },
            show: p.esAdmin,
          },
          {
            id: 'turnos',
            label: 'Turnos',
            icon: CalendarClock,
            dest: { type: 'turnos' },
            show: !p.esPreventista,
          },
        ],
      },
      {
        id: 'casa',
        label: 'Casa',
        items: [
          {
            id: 'equipo',
            label: 'Equipo',
            icon: Users,
            dest: { type: 'tab', tab: 'usuarios' },
            show: p.esAdmin,
          },
          {
            id: 'clientes',
            label: 'Clientes',
            icon: Users,
            dest: { type: 'tab', tab: 'clients' },
            show: p.clientesHabilitado,
          },
          {
            id: 'preferencias',
            label: 'Preferencias',
            icon: Settings,
            dest: { type: 'tab', tab: 'settings' },
            show: p.esAdmin,
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'calle',
      label: 'Calle',
      pinned: true,
      items: [
        {
          id: 'hojas',
          label: 'Hojas de ruta',
          icon: Truck,
          dest: { type: 'tab', tab: 'remitos' },
          show: p.remitosHabilitado,
        },
          {
            id: 'mostrador',
            label: 'Mostrador',
            icon: ShoppingCart,
            dest: { type: 'pos' },
            show: p.puedeUsarPOS,
          },
          {
            id: 'hojas',
            label: 'Hojas de ruta',
            icon: Truck,
            dest: { type: 'tab', tab: 'remitos' },
            show: p.remitosHabilitado,
          },
      ],
    },
    {
      id: 'catalogo',
      label: 'Catálogo',
      items: [
        {
          id: 'resumen',
          label: 'Resumen',
          icon: LayoutDashboard,
          dest: { type: 'tab', tab: 'dashboard' },
          show: !p.esPreventista && !p.isOperador,
        },
        {
          id: 'productos',
          label: 'Productos',
          icon: Package,
          dest: { type: 'tab', tab: 'products' },
          show: true,
        },
        {
          id: 'categorias',
          label: 'Categorías',
          icon: Tags,
          dest: { type: 'tab', tab: 'categories' },
          show: !p.esPreventista,
        },
        {
          id: 'stock',
          label: 'Movimientos',
          icon: Boxes,
          dest: { type: 'tab', tab: 'movimientos' },
          show: p.esAdmin && p.stockHabilitado,
        },
      ],
    },
    {
      id: 'cc',
      label: 'Cuenta corriente',
      items: [
        {
          id: 'clientes',
          label: 'Clientes',
          icon: Users,
          dest: { type: 'tab', tab: 'clients' },
          show: p.clientesHabilitado,
        },
        {
          id: 'ventas',
          label: 'Ventas',
          icon: Receipt,
          dest: { type: 'tab', tab: 'sales' },
          show: p.esAdmin,
        },
      ],
    },
    {
      id: 'compras',
      label: 'Compras',
      items: [
        {
          id: 'proveedores',
          label: 'Proveedores',
          icon: Building2,
          dest: { type: 'tab', tab: 'proveedores' },
          show: p.esAdmin && p.comprasHabilitado,
        },
        {
          id: 'ordenes',
          label: 'Órdenes',
          icon: ClipboardList,
          dest: { type: 'tab', tab: 'compras' },
          show: p.esAdmin && p.comprasHabilitado,
        },
      ],
    },
      {
        id: 'casa',
        label: 'Casa',
        items: [
          {
            id: 'equipo',
            label: 'Equipo',
            icon: Users,
            dest: { type: 'tab', tab: 'usuarios' },
            show: p.esAdmin,
          },
          {
            id: 'auditoria',
            label: 'Auditoría',
            icon: FileSearch,
            dest: { type: 'tab', tab: 'auditoria' },
            show: p.esAdmin,
          },
          {
            id: 'turnos',
            label: 'Turnos',
            icon: CalendarClock,
            dest: { type: 'turnos' },
            show: p.esAdmin,
          },
          {
            id: 'preferencias',
            label: 'Preferencias',
            icon: Settings,
            dest: { type: 'tab', tab: 'settings' },
            show: p.esAdmin,
          },
        ],
      },
  ];
}

function destIsActive(dest: NavDest, activeTab: TabType, turnosOpen: boolean): boolean {
  if (turnosOpen) return dest.type === 'turnos';
  if (dest.type === 'tab') return dest.tab === activeTab;
  return false;
}

function groupIdForActive(groups: NavGroupDef[], activeTab: TabType, turnosOpen: boolean): string | null {
  for (const group of groups) {
    if (group.items.some((item) => destIsActive(item.dest, activeTab, turnosOpen))) {
      return group.id;
    }
  }
  return groups[0]?.id ?? null;
}

function rolLabel(esRestaurante: boolean, esAdmin: boolean, esPreventista: boolean): string {
  if (esRestaurante) {
    if (esAdmin) return 'Socio';
    return 'Caja';
  }
  if (esAdmin) return 'Administrador';
  if (esPreventista) return 'Preventista';
  return 'Operador';
}

const itemClass = (active: boolean) =>
  `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
    active
      ? 'bg-tulum-accent text-white'
      : 'text-tulum-muted hover:bg-tulum-elevated hover:text-tulum-bone'
  }`;

export const DashboardSidebar: React.FC<DashboardSidebarProps> = (props) => {
  const {
    open,
    nombreEmpresa,
    logoUrl,
    esRestaurante,
    esAdmin,
    esPreventista,
    puedeUsarPOS,
    activeTab,
    turnosOpen,
    cajaAbierta,
    onTabChange,
    onGoPos,
    onOpenTurnos,
    onAbrirCaja,
    onCerrarCaja,
    onLogout,
    onGoHome,
    onCollapse,
  } = props;

  const groups = useMemo(
    () =>
      buildGroups(props)
        .map((group) => ({ ...group, items: group.items.filter((item) => item.show) }))
        .filter((group) => group.items.length > 0),
    // props se reconstruye cada render; las flags de menú son lo que cambia el nav.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.esRestaurante,
      props.esAdmin,
      props.esPreventista,
      props.isOperador,
      props.puedeUsarPOS,
      props.mesasHabilitado,
      props.clientesHabilitado,
      props.remitosHabilitado,
      props.comprasHabilitado,
      props.stockHabilitado,
    ]
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const activeGroup = groupIdForActive(groups, activeTab, turnosOpen);
    setOpenGroups((prev) => {
      const next = { ...prev };
      groups.forEach((group) => {
        if (next[group.id] === undefined) {
          next[group.id] = group.id === activeGroup;
        }
      });
      if (activeGroup) next[activeGroup] = true;
      return next;
    });
  }, [groups, activeTab, turnosOpen]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activate = (dest: NavDest) => {
    if (dest.type === 'tab') onTabChange(dest.tab);
    if (dest.type === 'pos') onGoPos();
    if (dest.type === 'turnos') onOpenTurnos();
  };

  return (
    <aside
      className={`bg-tulum-surface text-tulum-bone flex flex-col w-64 flex-shrink-0 transition-transform duration-300 ${
        open
          ? 'fixed inset-y-0 left-0 z-40 translate-x-0 lg:static lg:z-auto'
          : 'fixed inset-y-0 left-0 z-40 -translate-x-full pointer-events-none lg:hidden'
      }`}
    >
      <div className="px-3 py-4 border-b border-tulum-border flex items-start gap-2">
      <button
        type="button"
        onClick={onGoHome}
        className="flex-1 min-w-0 flex items-start gap-3 text-left hover:bg-tulum-elevated/40 rounded-lg px-1 py-1"
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="w-12 h-12 rounded-xl object-contain bg-tulum-elevated border border-tulum-border p-1 flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-tulum-accent flex items-center justify-center font-semibold text-2xl text-white flex-shrink-0">
            {(nombreEmpresa || 'T').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-xl font-semibold tracking-tight text-tulum-bone leading-tight line-clamp-2">
            {nombreEmpresa || 'Tulum'}
          </p>
          <p className="mt-1 text-[11px] font-medium text-tulum-muted">Tulum Core</p>
        </div>
      </button>
        <button
          type="button"
          onClick={onCollapse}
          className="mt-1 p-2 rounded-lg text-tulum-muted hover:text-tulum-bone hover:bg-tulum-elevated flex-shrink-0"
          title="Ocultar menú"
          aria-label="Ocultar menú"
        >
          <PanelLeftClose size={18} strokeWidth={STROKE} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {groups.map((group) => {
          const expanded = group.pinned || openGroups[group.id] || group.id === groupIdForActive(groups, activeTab, turnosOpen);
          return (
            <div key={group.id} className="mb-2">
              {group.pinned ? (
                <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-tulum-muted">
                  {group.label}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-tulum-muted hover:text-tulum-bone"
                  aria-expanded={expanded}
                >
                  {group.label}
                  <ChevronDown
                    size={14}
                    strokeWidth={STROKE}
                    className={`transition-transform ${expanded ? '' : '-rotate-90'}`}
                  />
                </button>
              )}
              {expanded && (
                <div className="space-y-0.5 pb-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = destIsActive(item.dest, activeTab, turnosOpen);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => activate(item.dest)}
                        className={itemClass(active)}
                      >
                        <Icon size={ICON} strokeWidth={STROKE} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-tulum-border px-4 py-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-tulum-muted">Sesión</p>
          <p className="mt-0.5 text-sm font-medium text-tulum-bone">{rolLabel(esRestaurante, esAdmin, esPreventista)}</p>
        </div>

        {puedeUsarPOS && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-tulum-muted">Turno</p>
            <p className="mt-0.5 text-sm font-medium text-tulum-bone">
              {cajaAbierta ? 'Turno abierto' : 'Turno cerrado'}
            </p>
            <button
              type="button"
              onClick={cajaAbierta ? onCerrarCaja : onAbrirCaja}
              className="mt-1 text-sm font-medium text-tulum-accent hover:text-tulum-accent-hover"
            >
              {cajaAbierta ? 'Cerrar turno' : 'Abrir turno'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-tulum-danger hover:bg-tulum-elevated"
        >
          <LogOut size={ICON} strokeWidth={STROKE} />
          Salir
        </button>
      </div>
    </aside>
  );
};
