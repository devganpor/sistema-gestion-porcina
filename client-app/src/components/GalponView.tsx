import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/authService';

interface Ubicacion {
  id: number;
  nombre: string;
  tipo: string;
  capacidad_maxima: number;
  animales_actuales: number;
  secuencia: number | null;
  etiqueta: string | null;
  galpon_id: number | null;
}

interface AnimalCorral {
  id: number;
  identificador_unico: string;
  nombre: string;
  categoria: string;
  sexo: string;
  estado: string;
  observaciones: string | null;
  peso_nacimiento: number | null;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  origen: string | null;
  valor_compra: number | null;
  raza_nombre: string | null;
}

interface Props {
  galpon: Ubicacion;
  corrales: Ubicacion[];
  onClose: () => void;
}

const HEALTH_COLOR: Record<string, string> = {
  activo:   '#31ce36',
  vendido:  '#ffad46',
  muerto:   '#f25961',
  default:  '#adb5bd',
};

// Tamaño visual basado en peso real (kg): mínimo 8px, máximo 20px
const pigSizeByWeight = (peso: number | null, categoria: string): number => {
  if (peso && peso > 0) {
    // Escala logarítmica: lechón ~1kg=8px, cerdo adulto ~120kg=20px
    const size = 8 + Math.log1p(peso) / Math.log1p(120) * 12;
    return Math.round(Math.min(Math.max(size, 8), 20));
  }
  const fallback: Record<string, number> = { lechon: 8, recria: 10, desarrollo: 12, engorde: 14, reproductor: 16 };
  return fallback[categoria] || 11;
};

// SVG minimalista de cerdo en vista cenital
const PigSVG: React.FC<{ size: number; color: string; dotColor: string; hasObs: boolean }> = ({ size, color, dotColor, hasObs }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ overflow: 'visible', cursor: 'pointer' }}>
    {/* Cuerpo */}
    <ellipse cx="10" cy="11" rx="7" ry="6" fill={color} stroke="#c9a0a0" strokeWidth="0.8" />
    {/* Cabeza */}
    <circle cx="10" cy="4.5" r="3.5" fill={color} stroke="#c9a0a0" strokeWidth="0.8" />
    {/* Hocico */}
    <ellipse cx="10" cy="5.8" rx="2" ry="1.2" fill="#f8a0a0" />
    {/* Orejas */}
    <ellipse cx="7.2" cy="2.5" rx="1.2" ry="1.6" fill={color} stroke="#c9a0a0" strokeWidth="0.6" transform="rotate(-15 7.2 2.5)" />
    <ellipse cx="12.8" cy="2.5" rx="1.2" ry="1.6" fill={color} stroke="#c9a0a0" strokeWidth="0.6" transform="rotate(15 12.8 2.5)" />
    {/* Cola */}
    <path d="M17 11 Q20 9 19 13" fill="none" stroke="#c9a0a0" strokeWidth="0.8" strokeLinecap="round" />
    {/* Indicador de estado */}
    <circle cx="15" cy="3" r="2.5" fill={dotColor} stroke="white" strokeWidth="0.5" />
    {/* Icono observación */}
    {hasObs && <circle cx="5" cy="3" r="2.5" fill="#ffad46" stroke="white" strokeWidth="0.5" />}
  </svg>
);

const GalponView: React.FC<Props> = ({ galpon, corrales, onClose }) => {
  const [animalesPorCorral, setAnimalesPorCorral] = useState<Record<number, AnimalCorral[]>>({});
  const [loadingCorrales, setLoadingCorrales] = useState<Set<number>>(new Set());
  const [selectedCorral, setSelectedCorral] = useState<Ubicacion | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalCorral | null>(null);
  const [showIds, setShowIds] = useState(true);
  const [showDots, setShowDots] = useState(true);
  const [showObs, setShowObs] = useState(true);
  const [filterSexo, setFilterSexo] = useState<'todos' | 'macho' | 'hembra'>('todos');
  const [hoveredCorral, setHoveredCorral] = useState<number | null>(null);
  const [hoveredAnimal, setHoveredAnimal] = useState<string | null>(null);

  // Cargar animales de todos los corrales al montar
  useEffect(() => {
    corrales.forEach(c => loadAnimalesCorral(c.id));
  }, [corrales]); // eslint-disable-line

  const loadAnimalesCorral = useCallback(async (corralId: number) => {
    if (animalesPorCorral[corralId]) return;
    setLoadingCorrales(prev => new Set(prev).add(corralId));
    try {
      const res = await api.get(`/locations/${corralId}/animals`);
      setAnimalesPorCorral(prev => ({ ...prev, [corralId]: res.data }));
    } catch {
      setAnimalesPorCorral(prev => ({ ...prev, [corralId]: [] }));
    } finally {
      setLoadingCorrales(prev => { const s = new Set(prev); s.delete(corralId); return s; });
    }
  }, [animalesPorCorral]);

  const getOcupPct = (c: Ubicacion) =>
    c.capacidad_maxima > 0 ? Math.round((c.animales_actuales / c.capacidad_maxima) * 100) : 0;

  const getOcupColor = (pct: number) =>
    pct >= 90 ? '#f25961' : pct >= 70 ? '#ffad46' : '#31ce36';

  // Distribuir corrales: izquierda / derecha del pasillo
  const mitad = Math.ceil(corrales.length / 2);
  const izquierda = corrales.slice(0, mitad);
  const derecha = corrales.slice(mitad);

  const renderAnimalGrid = (animales: AnimalCorral[], corralId: number) => {
    if (loadingCorrales.has(corralId)) {
      return <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', padding: '4px' }}>...</div>;
    }
    const animalesFiltrados = filterSexo === 'todos' ? animales : animales.filter(a => a.sexo === filterSexo);
    if (!animalesFiltrados || animalesFiltrados.length === 0) {
      return <div style={{ fontSize: 9, color: '#ccc', textAlign: 'center', padding: '6px' }}>{animales.length > 0 ? 'sin coincidencias' : 'vacío'}</div>;
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '3px', padding: '6px' }}>
        {animalesFiltrados.map(a => {
          const size = Math.max(pigSizeByWeight(a.peso_nacimiento, a.categoria), 18);
          const dotColor = HEALTH_COLOR[a.estado] || HEALTH_COLOR.default;
          const pigColor = a.sexo === 'hembra' ? '#f4829a' : '#5b9bd5';
          const isHovered = hoveredAnimal === a.identificador_unico;
          return (
            <div
              key={a.id}
              title={`${a.identificador_unico}${a.nombre ? ' · ' + a.nombre : ''} · ${a.categoria} · ${a.estado}${a.observaciones ? '\n⚠ ' + a.observaciones : ''}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: isHovered ? 'drop-shadow(0 0 3px #1572e8)' : 'none', transition: 'filter 0.15s', cursor: 'pointer', minWidth: 0, overflow: 'hidden' }}
              onMouseEnter={() => setHoveredAnimal(a.identificador_unico)}
              onMouseLeave={() => setHoveredAnimal(null)}
              onClick={e => { e.stopPropagation(); setSelectedAnimal(a); setSelectedCorral(null); }}
            >
              <PigSVG
                size={size}
                color={pigColor}
                dotColor={showDots ? dotColor : 'transparent'}
                hasObs={showObs && !!a.observaciones}
              />
              {showIds && (
                <div style={{ fontSize: 8, color: '#444', textAlign: 'center', lineHeight: 1, marginTop: 1, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontWeight: 600 }}>
                  {a.identificador_unico}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCorral = (c: Ubicacion, side: 'left' | 'right') => {
    const animales = animalesPorCorral[c.id] || [];
    const pct = getOcupPct(c);
    const isHovered = hoveredCorral === c.id;
    const isSelected = selectedCorral?.id === c.id;
    return (
      <div
        key={c.id}
        onClick={() => { setSelectedCorral(isSelected ? null : c); setSelectedAnimal(null); }}
        onMouseEnter={() => setHoveredCorral(c.id)}
        onMouseLeave={() => setHoveredCorral(null)}
        style={{
          flex: 1,
          minHeight: 160,
          border: isSelected ? '2px solid #1572e8' : isHovered ? '2px solid #6f42c1' : '1.5px solid #adb5bd',
          borderRadius: side === 'left' ? '6px 0 0 6px' : '0 6px 6px 0',
          background: isSelected ? '#f0f4ff' : isHovered ? '#f8f0ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.15s',
          boxShadow: isSelected ? '0 0 0 3px #1572e830' : isHovered ? '0 0 0 2px #6f42c120' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header del corral */}
        <div style={{ background: isSelected ? '#1572e8' : '#e9ecef', padding: '3px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? 'white' : '#1a2035', fontFamily: 'monospace' }}>
            {c.nombre}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'white' : getOcupColor(pct), background: isSelected ? 'rgba(255,255,255,0.2)' : getOcupColor(pct) + '22', border: `1.5px solid ${getOcupColor(pct)}`, borderRadius: 8, padding: '2px 7px' }}>
            {c.animales_actuales}/{c.capacidad_maxima || '∞'}
          </span>
        </div>
        {/* Etiqueta */}
        {c.etiqueta && (
          <div style={{ fontSize: 8, color: '#6f42c1', fontWeight: 600, textAlign: 'center', padding: '1px 4px', background: '#f0e6ff' }}>
            {c.etiqueta}
          </div>
        )}
        {/* Puerta hacia el pasillo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          [side === 'left' ? 'right' : 'left']: -1,
          transform: 'translateY(-50%)',
          width: 4,
          height: 20,
          background: '#6c757d',
          borderRadius: side === 'left' ? '0 3px 3px 0' : '3px 0 0 3px',
        }} />
        {/* Comedero */}
        <div style={{ position: 'absolute', bottom: 6, [side === 'left' ? 'left' : 'right']: 6, fontSize: 10, opacity: 0.5 }} title="Comedero">🍽</div>
        {/* Bebedero */}
        <div style={{ position: 'absolute', bottom: 6, [side === 'left' ? 'right' : 'left']: 18, fontSize: 10, opacity: 0.5 }} title="Bebedero">💧</div>
        {/* Animales */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderAnimalGrid(animales, c.id)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 1100, maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a2035, #2d3a5e)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
              <i className="fas fa-warehouse" style={{ marginRight: 8, color: '#ffad46' }} />
              Vista Galpón — {galpon.nombre}
              {galpon.etiqueta && <span style={{ marginLeft: 8, fontSize: 12, color: '#adb5bd' }}>{galpon.etiqueta}</span>}
            </div>
            <div style={{ color: '#adb5bd', fontSize: 12, marginTop: 2 }}>
              {corrales.length} corrales · {corrales.reduce((s, c) => s + Number(c.animales_actuales), 0)} animales
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Toggles */}
            {[
              { label: 'IDs', active: showIds, toggle: () => setShowIds(v => !v) },
              { label: 'Estado', active: showDots, toggle: () => setShowDots(v => !v) },
              { label: 'Obs.', active: showObs, toggle: () => setShowObs(v => !v) },
            ].map(t => (
              <button key={t.label} onClick={t.toggle} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, background: t.active ? '#1572e8' : 'rgba(255,255,255,0.15)', color: t.active ? 'white' : '#adb5bd', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
            {(['todos', 'hembra', 'macho'] as const).map(s => (
              <button key={s} onClick={() => setFilterSexo(s)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                background: filterSexo === s ? (s === 'hembra' ? '#f4829a' : s === 'macho' ? '#5b9bd5' : '#1572e8') : 'rgba(255,255,255,0.15)',
                color: filterSexo === s ? 'white' : '#adb5bd' }}>
                {s === 'todos' ? 'Todos' : s === 'hembra' ? '♀ Hembras' : '♂ Machos'}
              </button>
            ))}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', borderRadius: 6, padding: '2px 8px', marginLeft: 8 }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Plano del galpón */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {/* Leyenda */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>Estado:</span>
              {[['#31ce36','Activo'],['#ffad46','Vendido'],['#f25961','Muerto']].map(([c,l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6c757d' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
              <span style={{ marginLeft: 8, fontSize: 11, color: '#6c757d', fontWeight: 600 }}>Sexo:</span>
              {[['#f4829a','Hembra'],['#5b9bd5','Macho']].map(([c,l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6c757d' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c, border: '1px solid #ccc', display: 'inline-block' }} />{l}
                </span>
              ))}
              {showObs && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ffad46', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffad46', display: 'inline-block' }} />Con observación</span>}
            </div>

            {/* Estructura del galpón */}
            <div style={{ border: '3px solid #495057', borderRadius: 8, background: '#f1f3f5', padding: 8, position: 'relative' }}>
              {/* Etiqueta galpón */}
              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#495057', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
                ▲ ENTRADA — {galpon.nombre}
              </div>

              {corrales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#adb5bd' }}>
                  <i className="fas fa-door-open" style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                  Este galpón no tiene corrales asignados
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 0 }}>
                  {/* Hilera izquierda */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                    {izquierda.map(c => renderCorral(c, 'left'))}
                  </div>

                  {/* Pasillo central */}
                  <div style={{ width: 36, background: '#dee2e6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderLeft: '2px dashed #adb5bd', borderRight: '2px dashed #adb5bd', position: 'relative' }}>
                    <div style={{ writingMode: 'vertical-rl', fontSize: 10, fontWeight: 700, color: '#6c757d', letterSpacing: 2, textTransform: 'uppercase', transform: 'rotate(180deg)' }}>
                      PASILLO
                    </div>
                    {/* Flechas de circulación */}
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{ fontSize: 14, color: '#adb5bd' }}>↕</div>
                    ))}
                  </div>

                  {/* Hilera derecha */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                    {derecha.map(c => renderCorral(c, 'right'))}
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#495057', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
                ▼ SALIDA
              </div>
            </div>
          </div>

          {/* Panel lateral — detalle corral o animal */}
          {(selectedCorral || selectedAnimal) && (
            <div style={{ width: 280, borderLeft: '1px solid #dee2e6', background: '#f8f9fa', overflow: 'auto', padding: 16 }}>
              {selectedAnimal ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2035' }}>
                      <i className="fas fa-paw" style={{ marginRight: 6, color: '#6f42c1' }} />
                      Ficha Animal
                    </span>
                    <button onClick={() => setSelectedAnimal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16 }}>✕</button>
                  </div>
                  {[
                    ['ID', selectedAnimal.identificador_unico],
                    ['Nombre', selectedAnimal.nombre || '—'],
                    ['Sexo', selectedAnimal.sexo],
                    ['Categoría', selectedAnimal.categoria],
                    ['Estado', selectedAnimal.estado],
                    ['Raza', selectedAnimal.raza_nombre || '—'],
                    ['Origen', selectedAnimal.origen || '—'],
                    ['Peso nac.', selectedAnimal.peso_nacimiento ? `${selectedAnimal.peso_nacimiento} kg` : '—'],
                    ['Nacimiento', selectedAnimal.fecha_nacimiento ? new Date(selectedAnimal.fecha_nacimiento).toLocaleDateString('es-EC') : '—'],
                    ['Ingreso', selectedAnimal.fecha_ingreso ? new Date(selectedAnimal.fecha_ingreso).toLocaleDateString('es-EC') : '—'],
                    ['Valor compra', selectedAnimal.valor_compra ? `$${Number(selectedAnimal.valor_compra).toFixed(3)}` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e9ecef', fontSize: 13 }}>
                      <span style={{ color: '#6c757d', fontWeight: 600 }}>{k}</span>
                      <span style={{ color: '#1a2035', fontWeight: 500, textAlign: 'right', textTransform: 'capitalize', maxWidth: 160, wordBreak: 'break-word' }}>{v}</span>
                    </div>
                  ))}
                  {selectedAnimal.observaciones && (
                    <div style={{ marginTop: 10, background: '#fffbea', border: '1px solid #ffe082', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ffad46', marginBottom: 4 }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} />OBSERVACIONES
                      </div>
                      <div style={{ fontSize: 12, color: '#1a2035', lineHeight: 1.5 }}>{selectedAnimal.observaciones}</div>
                    </div>
                  )}
                </>
              ) : selectedCorral ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2035' }}>
                      <i className="fas fa-door-open" style={{ marginRight: 6, color: '#1572e8' }} />
                      {selectedCorral.nombre}
                    </span>
                    <button onClick={() => setSelectedCorral(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16 }}>✕</button>
                  </div>
                  {selectedCorral.etiqueta && (
                    <div style={{ background: '#f0e6ff', color: '#6f42c1', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block', marginBottom: 10 }}>
                      {selectedCorral.etiqueta}
                    </div>
                  )}
                  {/* Métricas del corral */}
                  {(() => {
                    const animales = animalesPorCorral[selectedCorral.id] || [];
                    const pct = getOcupPct(selectedCorral);
                    const conObs = animales.filter(a => a.observaciones).length;
                    const porCategoria = animales.reduce((acc, a) => { acc[a.categoria] = (acc[a.categoria] || 0) + 1; return acc; }, {} as Record<string, number>);
                    return (
                      <>
                        {[
                          ['Capacidad', `${selectedCorral.animales_actuales} / ${selectedCorral.capacidad_maxima || '∞'}`],
                          ['Ocupación', `${pct}%`],
                          ['Con observaciones', conObs > 0 ? `⚠ ${conObs}` : '0'],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e9ecef', fontSize: 13 }}>
                            <span style={{ color: '#6c757d', fontWeight: 600 }}>{k}</span>
                            <span style={{ color: '#1a2035', fontWeight: 700 }}>{v}</span>
                          </div>
                        ))}
                        {/* Barra de ocupación */}
                        <div style={{ marginTop: 10, marginBottom: 10 }}>
                          <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: getOcupColor(pct), borderRadius: 4, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                        {/* Por categoría */}
                        {Object.keys(porCategoria).length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', marginBottom: 6 }}>Por categoría</div>
                            {Object.entries(porCategoria).map(([cat, cnt]) => (
                              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', textTransform: 'capitalize' }}>
                                <span style={{ color: '#495057' }}>{cat}</span>
                                <span style={{ fontWeight: 700, color: '#1a2035' }}>{cnt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Lista de animales con obs */}
                        {conObs > 0 && (
                          <div style={{ marginTop: 10, background: '#fffbea', border: '1px solid #ffe082', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#ffad46', marginBottom: 6 }}>
                              <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} />ANIMALES CON OBSERVACIONES
                            </div>
                            {animales.filter(a => a.observaciones).map(a => (
                              <div key={a.id} style={{ fontSize: 11, color: '#1a2035', marginBottom: 4, cursor: 'pointer', padding: '3px 0', borderBottom: '1px solid #ffe082' }}
                                onClick={() => setSelectedAnimal(a)}>
                                <strong>{a.identificador_unico}</strong>
                                <div style={{ color: '#6c757d', fontSize: 10, marginTop: 1 }}>{a.observaciones}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalponView;
