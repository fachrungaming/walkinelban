import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  Compass,
  MapPin,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ELECTRONIC_COMPONENTS,
  EQUIPMENT_SYSTEMS,
  SUBSYSTEM_LAYER_LABELS,
  SUBSYSTEM_LAYERS,
  SYSTEM_MAP,
} from '../data/curriculum';
import { ZONE_MAP } from '../data/zones';
import { ElectronicComponent, Language, SubsystemLayer, SystemId } from '../types/elban';

interface DirectoryViewProps {
  lang: Language;
  loggedComponentIds: string[];
  onBackTo3D: () => void;
  onInspectComponent: (systemId: SystemId, componentId: string) => void;
  onLocateIn3D: (component: ElectronicComponent) => void;
  onQuickLogComponent: (componentId: string) => void;
}

type SortOrder = 'curriculum' | 'unlogged' | 'logged';

// Crisp technical schematic preview graphic per ElBan system (zero broken images)
const SystemSchematicArt: React.FC<{ systemId: SystemId; accent: string }> = ({ systemId, accent }) => {
  return (
    <div className="h-32 w-full bg-[#242424] relative overflow-hidden flex items-center justify-center border-b border-[#454545]">
      <svg viewBox="0 0 280 120" className="w-full h-full">
        <defs>
          <pattern id={`grid-${systemId}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,219,0,0.09)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="280" height="120" fill={`url(#grid-${systemId})`} />

        {systemId === 'sys-xray' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <rect x="78" y="24" width="124" height="62" rx="4" fill="rgba(2,132,199,0.14)" />
            <rect x="24" y="64" width="232" height="14" rx="2" stroke="#94a3b8" />
            <line x1="140" y1="78" x2="108" y2="30" stroke="#f59e0b" strokeDasharray="3 3" />
            <line x1="140" y1="78" x2="172" y2="30" stroke="#f59e0b" strokeDasharray="3 3" />
            <path d="M98 30 L182 30 L182 62" stroke="#38bdf8" strokeWidth="3" />
            <rect x="122" y="78" width="36" height="18" rx="2" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" />
          </g>
        )}

        {systemId === 'sys-wtmd' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <path d="M96 100 L96 22 L184 22 L184 100" strokeWidth="5" stroke="#cbd5e1" />
            <path d="M108 38 C 128 38, 128 84, 108 84" stroke="#f59e0b" strokeDasharray="3 3" />
            <path d="M172 38 C 152 38, 152 84, 172 84" stroke="#38bdf8" strokeDasharray="3 3" />
            <circle cx="140" cy="60" r="10" stroke="#ef4444" fill="rgba(239,68,68,0.2)" />
            <rect x="206" y="48" width="36" height="10" rx="3" stroke="#f59e0b" />
          </g>
        )}

        {systemId === 'sys-cctv-pids' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <line x1="60" y1="22" x2="60" y2="102" stroke="#94a3b8" strokeWidth="3" />
            <circle cx="88" cy="36" r="12" fill="rgba(13,148,136,0.2)" />
            <path d="M100 36 L175 18 L175 56 Z" fill="rgba(45,212,191,0.14)" strokeDasharray="3 3" />
            <path d="M110 82 Q 145 64, 180 82 T 248 82" stroke="#facc15" strokeWidth="2" />
            <rect x="195" y="44" width="54" height="30" rx="3" stroke="#cbd5e1" />
          </g>
        )}

        {systemId === 'sys-access-fire' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <rect x="52" y="24" width="58" height="72" rx="4" stroke="#cbd5e1" />
            <rect x="66" y="42" width="30" height="22" rx="2" stroke="#38bdf8" fill="rgba(56,189,248,0.18)" />
            <line x1="110" y1="60" x2="156" y2="60" stroke="#94a3b8" strokeDasharray="4 3" />
            <rect x="158" y="26" width="68" height="68" rx="4" stroke="#ef4444" fill="rgba(220,38,38,0.18)" />
            <circle cx="192" cy="48" r="10" stroke="#facc15" />
            <line x1="172" y1="74" x2="212" y2="74" stroke="#f87171" />
          </g>
        )}

        {systemId === 'sys-fids-pas' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <rect x="78" y="16" width="66" height="88" rx="10" stroke="#818cf8" fill="rgba(79,70,229,0.18)" />
            <rect x="86" y="34" width="50" height="58" rx="2" stroke="#cbd5e1" />
            <line x1="92" y1="46" x2="130" y2="46" stroke="#facc15" />
            <line x1="92" y1="58" x2="124" y2="58" stroke="#cbd5e1" />
            <line x1="92" y1="70" x2="128" y2="70" stroke="#38bdf8" />
            <rect x="164" y="24" width="62" height="24" rx="3" stroke="#ef4444" fill="rgba(239,68,68,0.14)" />
            <rect x="168" y="68" width="54" height="20" rx="3" stroke="#38bdf8" />
            <path d="M144 78 L168 78" stroke="#38bdf8" strokeDasharray="3 3" />
            <path d="M195 68 L195 48" stroke="#f59e0b" strokeDasharray="3 3" />
          </g>
        )}

        {systemId === 'sys-bids' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <rect x="54" y="20" width="172" height="68" rx="4" stroke="#f59e0b" fill="rgba(217,119,6,0.18)" />
            <rect x="64" y="28" width="152" height="14" rx="2" fill="rgba(245,158,11,0.28)" stroke="none" />
            <line x1="68" y1="54" x2="196" y2="54" stroke="#f8fafc" />
            <line x1="68" y1="68" x2="178" y2="68" stroke="#fde68a" />
            <line x1="126" y1="88" x2="126" y2="104" stroke="#94a3b8" strokeWidth="3" />
            <line x1="154" y1="88" x2="154" y2="104" stroke="#94a3b8" strokeWidth="3" />
            <line x1="102" y1="104" x2="178" y2="104" stroke="#cbd5e1" strokeWidth="3" />
          </g>
        )}

        {systemId === 'sys-pas' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <rect x="48" y="18" width="54" height="84" rx="3" stroke="#38bdf8" fill="rgba(2,132,199,0.18)" />
            <line x1="56" y1="32" x2="94" y2="32" stroke="#4ade80" />
            <line x1="56" y1="46" x2="94" y2="46" stroke="#38bdf8" />
            <line x1="56" y1="60" x2="94" y2="60" stroke="#cbd5e1" />
            <line x1="56" y1="74" x2="94" y2="74" stroke="#cbd5e1" />
            <line x1="56" y1="88" x2="94" y2="88" stroke="#cbd5e1" />
            <path d="M126 78 L168 78 L164 62 L130 62 Z" stroke="#cbd5e1" fill="rgba(148,163,184,0.16)" />
            <path d="M142 62 C 142 36, 162 32, 170 40" stroke="#f8fafc" />
            <path d="M196 66 L216 50 L216 82 Z" stroke="#cbd5e1" />
            <path d="M224 56 Q 236 66, 224 76" stroke="#38bdf8" />
            <path d="M232 48 Q 248 66, 232 84" stroke="#38bdf8" />
          </g>
        )}

        {systemId === 'sys-radio-igcs' && (
          <g stroke={accent} strokeWidth="2" fill="none">
            <rect x="58" y="42" width="34" height="54" rx="4" stroke="#34d399" fill="rgba(5,150,105,0.2)" />
            <line x1="84" y1="42" x2="84" y2="18" stroke="#cbd5e1" strokeWidth="2.5" />
            <path d="M98 30 Q 112 22, 112 42" stroke="#34d399" />
            <path d="M106 22 Q 126 16, 126 48" stroke="#34d399" />
            <line x1="128" y1="54" x2="176" y2="54" stroke="#38bdf8" strokeDasharray="4 3" />
            <rect x="180" y="26" width="52" height="70" rx="3" stroke="#cbd5e1" />
            <line x1="190" y1="42" x2="222" y2="42" stroke="#34d399" />
            <line x1="190" y1="58" x2="222" y2="58" stroke="#34d399" />
            <line x1="190" y1="74" x2="222" y2="74" stroke="#34d399" />
          </g>
        )}
      </svg>
    </div>
  );
};

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  lang,
  loggedComponentIds,
  onBackTo3D,
  onInspectComponent,
  onLocateIn3D,
  onQuickLogComponent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<SystemId | 'ALL'>('ALL');
  const [selectedLayer, setSelectedLayer] = useState<SubsystemLayer | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('curriculum');

  const loggedSet = useMemo(() => new Set(loggedComponentIds), [loggedComponentIds]);

  const filteredComponents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = ELECTRONIC_COMPONENTS.filter((comp) => {
      if (selectedSystem !== 'ALL' && comp.systemId !== selectedSystem) return false;
      if (selectedLayer !== 'ALL' && comp.subsystemLayer !== selectedLayer) return false;
      if (!q) return true;
      const sys = SYSTEM_MAP[comp.systemId];
      const haystack = [
        comp.code,
        comp.name_id,
        comp.name_en,
        comp.summary_id,
        comp.summary_en,
        comp.description_id,
        comp.description_en,
        ...comp.subElements_id,
        ...comp.subElements_en,
        sys.name_id,
        sys.name_en,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    if (sortOrder === 'unlogged') {
      return [...list].sort((a, b) => Number(loggedSet.has(a.id)) - Number(loggedSet.has(b.id)));
    }
    if (sortOrder === 'logged') {
      return [...list].sort((a, b) => Number(loggedSet.has(b.id)) - Number(loggedSet.has(a.id)));
    }
    return list;
  }, [searchQuery, selectedSystem, selectedLayer, sortOrder, loggedSet]);

  return (
    <div className="fixed inset-0 top-16 z-20 bg-[#262626] text-[#F5F3EE] overflow-y-auto elban-scroll">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Directory Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#454545]">
          <div>
            <div className="text-xs font-semibold text-[#FFDB00] font-mono-tech">
              {ELECTRONIC_COMPONENTS.length} {lang === 'id' ? 'komponen' : 'components'} · {EQUIPMENT_SYSTEMS.length}{' '}
              {lang === 'id' ? 'sistem utama ElBan' : 'core ElBan systems'} ·{' '}
              {loggedComponentIds.length}/{ELECTRONIC_COMPONENTS.length}{' '}
              {lang === 'id' ? 'tercatat' : 'logged'}
            </div>
            <h1 className="font-charm text-3xl sm:text-4xl font-bold text-[#FFDB00] mt-1">
              {lang === 'id' ? 'Mode Direktori Teknis ElBan' : 'ElBan Technical Equipment Directory'}
            </h1>
            <p className="text-sm sm:text-base text-[#D6D3CB] mt-1 max-w-2xl">
              {lang === 'id'
                ? 'Telusuri spesifikasi elektronika, prinsip kerja, dan lompat langsung ke posisi unit di terminal 3D.'
                : 'Search electronic specifications, working principles, and jump straight to the unit location inside the 3D airport.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onBackTo3D}
            className="h-10 px-4 rounded-lg bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-sm font-bold flex items-center gap-2 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#242424]" />
            <span>{lang === 'id' ? 'Kembali ke bandara 3D' : 'Back to 3D airport'}</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="py-5 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#FFDB00] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'id'
                    ? 'Cari komponen, sistem, atau prinsip kerja (mis. Scintillator, VFD, MCFA, Optical Fiber)...'
                    : 'Search components, systems, or principles (e.g., Scintillator, VFD, MCFA, Optical Fiber)...'
                }
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#323232] border border-[#4A4A4A] text-sm text-[#F5F3EE] placeholder:text-[#9A978F] focus:outline-none focus:ring-2 focus:ring-[#FFDB00]"
              />
            </div>

            {/* Subsystem Role & Sort Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
              <div className="relative flex items-center">
                <SlidersHorizontal className="w-4 h-4 text-[#FFDB00] absolute left-3 pointer-events-none" />
                <select
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(e.target.value as SubsystemLayer | 'ALL')}
                  aria-label="Filter subsystem role"
                  className="h-11 pl-9 pr-8 rounded-lg bg-[#323232] border border-[#4A4A4A] text-xs sm:text-sm font-medium text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#FFDB00] cursor-pointer"
                >
                  <option value="ALL">{lang === 'id' ? 'Fungsi: Semua' : 'Role: All'}</option>
                  {SUBSYSTEM_LAYERS.map((layer) => (
                    <option key={layer} value={layer}>
                      {lang === 'id' ? SUBSYSTEM_LAYER_LABELS[layer].id : SUBSYSTEM_LAYER_LABELS[layer].en}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                aria-label="Sort order"
                className="h-11 px-3.5 rounded-lg bg-[#323232] border border-[#4A4A4A] text-xs sm:text-sm font-medium text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#FFDB00] cursor-pointer"
              >
                <option value="curriculum">{lang === 'id' ? 'Urutan Kurikulum' : 'Curriculum Order'}</option>
                <option value="unlogged">{lang === 'id' ? 'Belum Dipelajari' : 'Not Yet Logged'}</option>
                <option value="logged">{lang === 'id' ? 'Sudah Dipelajari' : 'Already Logged'}</option>
              </select>
            </div>
          </div>

          {/* 6-System Quick Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 elban-scroll">
            <button
              type="button"
              onClick={() => setSelectedSystem('ALL')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors border ${
                selectedSystem === 'ALL'
                  ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                  : 'bg-[#323232] border-[#4A4A4A] text-[#E6E3DC] hover:bg-[#3D3D3D]'
              }`}
            >
              {lang === 'id' ? 'Semua Sistem' : 'All Systems'} ({ELECTRONIC_COMPONENTS.length})
            </button>
            {EQUIPMENT_SYSTEMS.map((sys) => {
              const count = ELECTRONIC_COMPONENTS.filter((c) => c.systemId === sys.id).length;
              const active = selectedSystem === sys.id;
              return (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => setSelectedSystem(sys.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors border ${
                    active
                      ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                      : 'bg-[#323232] border-[#4A4A4A] text-[#E6E3DC] hover:bg-[#3D3D3D]'
                  }`}
                >
                  {sys.shortLabel} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Component Cards Grid */}
        {filteredComponents.length === 0 ? (
          <div className="bg-[#323232] border border-[#4A4A4A] rounded-xl p-12 text-center my-6">
            <Compass className="w-8 h-8 text-[#FFDB00] mx-auto mb-3" />
            <div className="font-charm text-xl font-bold text-[#F5F3EE]">
              {lang === 'id' ? 'Komponen tidak ditemukan' : 'No matching components found'}
            </div>
            <p className="text-sm text-[#BDBAB2] mt-1">
              {lang === 'id'
                ? 'Coba kata kunci lain seperti Scintillator, Photocell, MCFA, atau reset filter.'
                : 'Try another keyword such as Scintillator, Photocell, MCFA, or reset filters.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSystem('ALL');
                setSelectedLayer('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-xs font-bold cursor-pointer"
            >
              {lang === 'id' ? 'Reset Pencarian' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-14">
            {filteredComponents.map((comp) => {
              const sys = SYSTEM_MAP[comp.systemId];
              const zone = ZONE_MAP[comp.zoneId];
              const isDone = loggedSet.has(comp.id);
              const layerMeta = SUBSYSTEM_LAYER_LABELS[comp.subsystemLayer];

              return (
                <article
                  key={comp.id}
                  className="bg-[#323232] border border-[#4A4A4A] rounded-xl overflow-hidden flex flex-col hover:border-[#FFDB00]/60 transition-colors"
                >
                  <SystemSchematicArt systemId={comp.systemId} accent="#FFDB00" />

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Quiet unboxed metadata line */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#BDBAB2]">
                      <span className="font-mono-tech font-semibold text-[#FFDB00]">{comp.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sys.shortLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className={isDone ? 'text-emerald-400 font-semibold' : comp.priorityTag === 'Kritis/Tegangan Tinggi' ? 'text-rose-400 font-semibold' : 'text-[#E6E3DC] font-medium'}>
                        {isDone
                          ? lang === 'id' ? 'Selesai' : 'Logged'
                          : comp.priorityTag ?? (lang === 'id' ? 'Kurikulum ElBan' : 'ElBan Module')}
                      </span>
                    </div>

                    <h2 className="font-charm text-xl font-bold text-[#F5F3EE] mt-2 leading-snug">
                      {lang === 'id' ? comp.name_id : comp.name_en}
                    </h2>

                    <p className="text-sm text-[#D6D3CB] mt-1.5 leading-relaxed line-clamp-2 flex-1">
                      {lang === 'id' ? comp.summary_id : comp.summary_en}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#454545] flex items-center justify-between text-xs text-[#BDBAB2]">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#FFDB00] shrink-0" />
                        <span className="truncate">{lang === 'id' ? zone.shortName_id : zone.shortName_en}</span>
                      </span>
                      <span className="font-semibold text-[#FFDB00] truncate ml-2">
                        {lang === 'id' ? layerMeta.id : layerMeta.en}
                      </span>
                    </div>

                    {/* Action Row */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onQuickLogComponent(comp.id);
                          onInspectComponent(comp.systemId, comp.id);
                        }}
                        className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          isDone
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                            : 'bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424]'
                        }`}
                      >
                        {isDone ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5 text-[#242424]" />}
                        <span className="truncate">
                          {lang === 'id' ? 'Pelajari / Catat' : 'Inspect & Log'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onLocateIn3D(comp)}
                        className="h-9 px-3 rounded-lg bg-[#262626] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#F5F3EE] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#FFDB00]" />
                        <span className="truncate">{lang === 'id' ? 'Lihat di lokasi' : 'View in 3D'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
