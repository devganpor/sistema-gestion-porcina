import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/authService';
import FormField from './FormField';

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
  sexo: string;
  categoria: string;
  estado: string;
  raza_nombre: string;
  raza_id?: number;
  ubicacion_nombre: string;
  ubicacion_actual_id?: number;
  fecha_nacimiento: string;
  peso_nacimiento?: number;
  valor_compra?: number;
  fecha_ingreso?: string;
  origen?: string;
  observaciones?: string;
}

interface TraceEvent {
  fecha: string;
  tipo: string;
  descripcion: string;
  monto: number;
  icono: string;
  color: string;
  costo_acumulado_momento?: number;
  peso_momento?: number;
  extra?: string;
}

interface Trazabilidad {
  animal: Animal;
  timeline: TraceEvent[];
  resumen: {
    valor_compra: number;
    gastos_directos: number;
    costos_sanitarios: number;
    costo_alimentacion: number;
    kg_alimentacion_total: number;
    costo_total: number;
    ingreso_total: number;
    resultado: number;
    total_pesajes: number;
    peso_inicial: number | null;
    peso_actual: number | null;
    ganancia_diaria_promedio: string | null;
    total_ciclos: number;
    total_movimientos: number;
  };
}

const Animals: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<Animal[]>([]);
  const [razas, setRazas] = useState<{id: number; nombre: string}[]>([]);
  const [ubicaciones, setUbicaciones] = useState<{id: number; nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');

  // Trazabilidad
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [traceData, setTraceData] = useState<Trazabilidad | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveAnimal, setMoveAnimal] = useState<Animal | null>(null);
  const [moveForm, setMoveForm] = useState({ ubicacion_destino_id: '', fecha: new Date().toISOString().split('T')[0], motivo: '', peso_momento: '', observaciones: '' });

  // Carga masiva
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkResults, setBulkResults] = useState<{fila:number;identificador_unico:string;estado:string;errores:string[]}[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    identificador_unico: '',
    nombre: '',
    sexo: 'hembra',
    categoria: 'lechon',
    fecha_nacimiento: '',
    peso_nacimiento: '',
    observaciones: '',
    raza_id: '',
    ubicacion_actual_id: '',
    padre_id: '',
    madre_id: '',
    valor_compra: '',
    fecha_ingreso: '',
    origen: 'nacimiento'
  });

  useEffect(() => {
    loadAnimals();
    api.get('/animals/razas').then(r => setRazas(r.data)).catch(() => {});
    api.get('/locations').then(r => setUbicaciones(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    filterAnimals();
  }, [animals, searchTerm, filterCategory, filterSex]);

  const filterAnimals = () => {
    let filtered = animals;
    
    if (searchTerm) {
      filtered = filtered.filter(animal => 
        animal.identificador_unico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        animal.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        animal.raza_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterCategory) {
      filtered = filtered.filter(animal => animal.categoria === filterCategory);
    }
    
    if (filterSex) {
      filtered = filtered.filter(animal => animal.sexo === filterSex);
    }
    
    setFilteredAnimals(filtered);
  };

  const loadAnimals = async () => {
    try {
      const response = await api.get('/animals');
      setAnimals(response.data);
    } catch (error) {
      console.error('Error cargando animales:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Validar identificador único
    if (!formData.identificador_unico || !formData.identificador_unico.trim()) {
      newErrors.identificador_unico = 'El identificador único es requerido';
    } else if (formData.identificador_unico.length < 3) {
      newErrors.identificador_unico = 'El identificador debe tener al menos 3 caracteres';
    }
    
    // Validar peso de nacimiento
    if (formData.peso_nacimiento) {
      const peso = parseFloat(formData.peso_nacimiento);
      if (isNaN(peso) || peso <= 0) {
        newErrors.peso_nacimiento = 'El peso debe ser un número mayor a 0';
      } else if (peso > 5) {
        newErrors.peso_nacimiento = 'El peso de nacimiento parece demasiado alto';
      }
    }
    
    // Validar fecha de nacimiento
    if (formData.fecha_nacimiento) {
      const fechaNac = new Date(formData.fecha_nacimiento);
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999); // Permitir fecha de hoy
      if (fechaNac > hoy) {
        newErrors.fecha_nacimiento = 'La fecha no puede ser futura';
      }
      
      // Verificar que no sea demasiado antigua (más de 5 años)
      const cincoAnosAtras = new Date();
      cincoAnosAtras.setFullYear(cincoAnosAtras.getFullYear() - 5);
      if (fechaNac < cincoAnosAtras) {
        newErrors.fecha_nacimiento = 'La fecha parece demasiado antigua';
      }
    }
    
    // Validar sexo
    if (!formData.sexo || !['hembra', 'macho'].includes(formData.sexo)) {
      newErrors.sexo = 'Debe seleccionar un sexo válido';
    }
    
    // Validar categoría
    if (!formData.categoria || !['lechon', 'recria', 'desarrollo', 'engorde', 'reproductor'].includes(formData.categoria)) {
      newErrors.categoria = 'Debe seleccionar una categoría válida';
    }
    
    console.log('Errores de validación:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      const submitData = {
        ...formData,
        peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
        raza_id: formData.raza_id ? parseInt(formData.raza_id) : null,
        ubicacion_actual_id: formData.ubicacion_actual_id ? parseInt(formData.ubicacion_actual_id) : null,
        padre_id: formData.padre_id ? parseInt(formData.padre_id) : null,
        madre_id: formData.madre_id ? parseInt(formData.madre_id) : null,
        valor_compra: formData.valor_compra ? parseFloat(formData.valor_compra) : 0,
        fecha_ingreso: formData.fecha_ingreso || null
      };
      
      if (modalType === 'create') {
        await api.post('/animals', submitData);
        setSuccess('Animal registrado exitosamente');
      } else if (modalType === 'edit' && selectedAnimal) {
        await api.put(`/animals/${selectedAnimal.id}`, submitData);
        setSuccess('Animal actualizado exitosamente');
      }
      
      resetForm();
      setShowModal(false);
      await loadAnimals();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error en handleSubmit:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error procesando solicitud';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      identificador_unico: '',
      nombre: '',
      sexo: 'hembra',
      categoria: 'lechon',
      fecha_nacimiento: '',
      peso_nacimiento: '',
      observaciones: '',
      raza_id: '',
      ubicacion_actual_id: '',
      padre_id: '',
      madre_id: '',
      valor_compra: '',
      fecha_ingreso: '',
      origen: 'nacimiento'
    });
    setErrors({});
    setSelectedAnimal(null);
  };

  const handleCreate = () => {
    resetForm();
    setModalType('create');
    setShowModal(true);
  };

  const handleEdit = (animal: Animal) => {
    setFormData({
      identificador_unico: animal.identificador_unico,
      nombre: animal.nombre || '',
      sexo: animal.sexo,
      categoria: animal.categoria,
      fecha_nacimiento: animal.fecha_nacimiento?.split('T')[0] || '',
      peso_nacimiento: animal.peso_nacimiento?.toString() || '',
      observaciones: animal.observaciones || '',
      raza_id: animal.raza_id?.toString() || '',
      ubicacion_actual_id: animal.ubicacion_actual_id?.toString() || '',
      padre_id: '',
      madre_id: '',
      valor_compra: animal.valor_compra?.toString() || '',
      fecha_ingreso: animal.fecha_ingreso?.split('T')[0] || '',
      origen: animal.origen || 'nacimiento'
    });
    setSelectedAnimal(animal);
    setModalType('edit');
    setShowModal(true);
  };

  const handleView = (animal: Animal) => {
    setSelectedAnimal(animal);
    setModalType('view');
    setShowModal(true);
  };

  const handleTrace = async (animal: Animal) => {
    setTraceLoading(true);
    setTraceError('');
    setTraceData(null);
    setShowTraceModal(true);
    try {
      const res = await api.get(`/animals/${animal.id}/trazabilidad`);
      setTraceData(res.data);
    } catch (err: any) {
      setTraceError(err.response?.data?.error || err.message || 'Error cargando trazabilidad');
    } finally {
      setTraceLoading(false);
    }
  };

  const handleOpenMove = (animal: Animal) => {
    setMoveAnimal(animal);
    setMoveForm({ ubicacion_destino_id: '', fecha: new Date().toISOString().split('T')[0], motivo: '', peso_momento: '', observaciones: '' });
    setShowMoveModal(true);
  };

  const handleSubmitMove = async () => {
    if (!moveAnimal || !moveForm.ubicacion_destino_id) return;
    try {
      await api.post(`/animals/${moveAnimal.id}/movimiento`, {
        ...moveForm,
        ubicacion_destino_id: parseInt(moveForm.ubicacion_destino_id),
        peso_momento: moveForm.peso_momento ? parseFloat(moveForm.peso_momento) : null
      });
      setSuccess('Movimiento registrado exitosamente');
      setShowMoveModal(false);
      loadAnimals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error registrando movimiento');
    }
  };

  const handleDelete = async (animal: Animal) => {
    if (!window.confirm(`¿Estás seguro de eliminar el animal ${animal.identificador_unico}?`)) {
      return;
    }
    
    try {
      await api.delete(`/animals/${animal.id}`);
      setSuccess('Animal eliminado exitosamente');
      loadAnimals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error eliminando animal');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      ['identificador_unico','nombre','sexo','categoria','fecha_nacimiento','peso_nacimiento','raza','ubicacion','estado','origen','valor_compra','fecha_ingreso','observaciones']
    ];
    const ejemplos = [
      ['CER001','Bella','hembra','reproductor','2023-05-15','1.4','Yorkshire','Corral 1','activo','compra',350000,'2023-05-15','Cerda de alta produccion'],
      ['CER002','','macho','engorde','2024-01-10','1.6','Duroc','Galpon B','activo','nacimiento',0,'2024-01-10',''],
      ['CER003','','hembra','lechon','2025-03-01','1.2','Landrace','Maternidad','activo','nacimiento',0,'2025-03-01','']
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...ejemplos]);
    ws['!cols'] = [20,15,10,14,18,16,14,14,10,12,14,14,30].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Animales');
    const ref = XLSX.utils.aoa_to_sheet([
      ['CAMPO','REQUERIDO','VALORES VALIDOS / FORMATO'],
      ['identificador_unico','SI','Texto unico, max 50 caracteres'],
      ['nombre','NO','Texto libre'],
      ['sexo','SI','macho | hembra'],
      ['categoria','SI','lechon | recria | desarrollo | engorde | reproductor'],
      ['fecha_nacimiento','NO','YYYY-MM-DD  (ej: 2024-03-15)'],
      ['peso_nacimiento','NO','Numero decimal en kg  (ej: 1.4)'],
      ['raza','NO','Nombre exacto de raza registrada en el sistema'],
      ['ubicacion','NO','Nombre exacto de ubicacion registrada en el sistema'],
      ['estado','NO','activo (default) | vendido | muerto | eliminado'],
      ['origen','NO','nacimiento (default) | compra'],
      ['valor_compra','NO','Numero decimal — costo de compra o valor de ingreso (ej: 350000). 0 si nacio en granja'],
      ['fecha_ingreso','NO','YYYY-MM-DD — fecha en que entro a la granja (ej: 2024-03-15)'],
      ['observaciones','NO','Texto libre']
    ]);
    ref['!cols'] = [22,12,55].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ref, 'Referencia');
    XLSX.writeFile(wb, 'plantilla_carga_animales.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setBulkRows(rows);
      setBulkResults([]);
      setBulkDone(false);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleBulkUpload = async () => {
    if (bulkRows.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await api.post('/animals/bulk', { animales: bulkRows });
      setBulkResults(res.data.resultados);
      setBulkDone(true);
      const ok = res.data.insertados;
      if (ok > 0) { loadAnimals(); setSuccess(`${ok} animales importados exitosamente`); setTimeout(() => setSuccess(''), 4000); }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error en la carga masiva');
    } finally {
      setBulkLoading(false);
    }
  };

  const resetBulk = () => { setBulkRows([]); setBulkResults([]); setBulkDone(false); setShowBulkModal(false); };

  if (loading && animals.length === 0) return (
    <div className="page-inner">
      <div className="card">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
          <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando animales...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-inner">
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {success}
        </div>
      )}
      
      <div className="card">
        <div className="card-header gradient" style={{ 
          background: 'linear-gradient(135deg, #1572e8 0%, #0d47a1 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h4 className="card-title" style={{ margin: 0, color: 'white' }}>
                <i className="fas fa-paw" style={{ marginRight: '10px' }}></i>
                Gestión de Animales ({filteredAnimals.length})
              </h4>
              <p className="card-subtitle" style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.9)' }}>
                Control total de tu ganado porcino
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-outline"
                onClick={() => { setBulkRows([]); setBulkResults([]); setBulkDone(false); setShowBulkModal(true); }}
                style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white' }}
              >
                <i className="fas fa-file-excel" style={{ marginRight: '8px' }}></i>
                Carga Masiva
              </button>
              <button 
                className="btn btn-outline" 
                onClick={handleCreate}
                style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white' }}
              >
                <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                Nuevo Animal
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Filtros */}
          <div className="filter-container" style={{ marginBottom: '25px' }}>
            <div className="filter-group">
              <label>Buscar:</label>
              <input
                type="text"
                className="form-control"
                placeholder="ID, nombre o raza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ minWidth: '200px' }}
              />
            </div>
            
            <div className="filter-group">
              <label>Categoría:</label>
              <select
                className="form-control"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="lechon">Lechón</option>
                <option value="recria">Recría</option>
                <option value="desarrollo">Desarrollo</option>
                <option value="engorde">Engorde</option>
                <option value="reproductor">Reproductor</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sexo:</label>
              <select
                className="form-control"
                value={filterSex}
                onChange={(e) => setFilterSex(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="hembra">Hembra</option>
                <option value="macho">Macho</option>
              </select>
            </div>
            
            <div className="filter-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setFilterSex('');
                }}
              >
                <i className="fas fa-times" style={{ marginRight: '5px' }}></i>
                Limpiar
              </button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div className="stat-card">
              <div className="stat-value">{animals.length}</div>
              <div className="stat-label">Total Animales</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#31ce36' }}>
                {animals.filter(a => a.estado === 'activo').length}
              </div>
              <div className="stat-label">Activos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f25961' }}>
                {animals.filter(a => a.sexo === 'hembra').length}
              </div>
              <div className="stat-label">Hembras</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#1572e8' }}>
                {animals.filter(a => a.sexo === 'macho').length}
              </div>
              <div className="stat-label">Machos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#ffad46' }}>
                {animals.filter(a => a.categoria === 'reproductor').length}
              </div>
              <div className="stat-label">Reproductores</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Sexo</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Raza</th>
                  <th>Ubicación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnimals.map(animal => (
                  <tr key={animal.id}>
                    <td style={{ fontWeight: '600' }}>{animal.identificador_unico}</td>
                    <td>{animal.nombre || '-'}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: animal.sexo === 'hembra' ? '#f25961' : '#1572e8',
                        color: '#ffffff'
                      }}>
                        {animal.sexo === 'hembra' ? 'Hembra' : 'Macho'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: '#6c757d',
                        color: '#ffffff',
                        textTransform: 'capitalize'
                      }}>
                        {animal.categoria}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: animal.estado === 'activo' ? '#31ce36' : 
                                   animal.estado === 'vendido' ? '#ffad46' : '#f25961',
                        color: '#ffffff',
                        textTransform: 'capitalize'
                      }}>
                        {animal.estado}
                      </span>
                    </td>
                    <td>{animal.raza_nombre || '-'}</td>
                    <td>{animal.ubicacion_nombre || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-primary btn-sm" title="Ver detalles" onClick={() => handleView(animal)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleEdit(animal)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm"
                          title="Trazabilidad y costos"
                          style={{ background: '#6f42c1', color: 'white' }}
                          onClick={() => handleTrace(animal)}
                        >
                          <i className="fas fa-route"></i>
                        </button>
                        <button
                          className="btn btn-sm"
                          title="Mover de ubicación"
                          style={{ background: '#17a2b8', color: 'white' }}
                          onClick={() => handleOpenMove(animal)}
                        >
                          <i className="fas fa-exchange-alt"></i>
                        </button>
                        <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleDelete(animal)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAnimals.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🐷</div>
              <h3>{animals.length === 0 ? 'No hay animales registrados' : 'No se encontraron animales'}</h3>
              <p>
                {animals.length === 0 
                  ? 'Comienza registrando tu primer animal en el sistema'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              {animals.length === 0 && (
                <button className="btn btn-primary" onClick={handleCreate}>
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  Registrar Primer Animal
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h5 className="card-title">
                <i className={`fas ${modalType === 'create' ? 'fa-plus' : modalType === 'edit' ? 'fa-edit' : 'fa-eye'}`} style={{ marginRight: '10px' }}></i>
                {modalType === 'create' ? 'Nuevo Animal' : modalType === 'edit' ? 'Editar Animal' : 'Detalles del Animal'}
              </h5>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div style={{ padding: '25px' }}>
              {errors.general && (
                <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                  {errors.general}
                </div>
              )}
              
              {modalType === 'view' && selectedAnimal ? (
                <div className="grid grid-2">
                  <div>
                    <h6 style={{ color: '#1a2035', marginBottom: '15px' }}>Información Básica</h6>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>ID Único:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.identificador_unico}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Nombre:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.nombre || 'Sin nombre'}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Sexo:</strong>
                      <p style={{ margin: '5px 0 0 0', textTransform: 'capitalize' }}>{selectedAnimal.sexo}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Categoría:</strong>
                      <p style={{ margin: '5px 0 0 0', textTransform: 'capitalize' }}>{selectedAnimal.categoria}</p>
                    </div>
                  </div>
                  <div>
                    <h6 style={{ color: '#1a2035', marginBottom: '15px' }}>Detalles Adicionales</h6>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Estado:</strong>
                      <p style={{ margin: '5px 0 0 0', textTransform: 'capitalize' }}>{selectedAnimal.estado}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Raza:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.raza_nombre || 'No especificada'}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Ubicación:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.ubicacion_nombre || 'No asignada'}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Fecha Nacimiento:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>
                        {selectedAnimal.fecha_nacimiento ? new Date(selectedAnimal.fecha_nacimiento).toLocaleDateString() : 'No registrada'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-2">
                    <FormField
                      label="ID Único"
                      value={formData.identificador_unico}
                      onChange={(value) => setFormData({...formData, identificador_unico: value})}
                      error={errors.identificador_unico}
                      required
                      placeholder="Ej: CER001"
                      icon="fa-tag"
                    />
                    
                    <FormField
                      label="Nombre"
                      value={formData.nombre}
                      onChange={(value) => setFormData({...formData, nombre: value})}
                      placeholder="Nombre del animal"
                      icon="fa-signature"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Sexo"
                      type="select"
                      value={formData.sexo}
                      onChange={(value) => setFormData({...formData, sexo: value})}
                      options={[
                        { value: 'hembra', label: 'Hembra' },
                        { value: 'macho', label: 'Macho' }
                      ]}
                      icon="fa-venus-mars"
                    />
                    
                    <FormField
                      label="Categoría"
                      type="select"
                      value={formData.categoria}
                      onChange={(value) => setFormData({...formData, categoria: value})}
                      options={[
                        { value: 'lechon', label: 'Lechón' },
                        { value: 'recria', label: 'Recría' },
                        { value: 'desarrollo', label: 'Desarrollo' },
                        { value: 'engorde', label: 'Engorde' },
                        { value: 'reproductor', label: 'Reproductor' }
                      ]}
                      icon="fa-layer-group"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Fecha Nacimiento"
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={(value) => setFormData({...formData, fecha_nacimiento: value})}
                      error={errors.fecha_nacimiento}
                      icon="fa-calendar"
                    />
                    
                    <FormField
                      label="Peso Nacimiento (kg)"
                      type="number"
                      step="0.1"
                      value={formData.peso_nacimiento}
                      onChange={(value) => setFormData({...formData, peso_nacimiento: value})}
                      error={errors.peso_nacimiento}
                      placeholder="1.5"
                      icon="fa-weight"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Raza"
                      type="select"
                      value={formData.raza_id}
                      onChange={(value) => setFormData({...formData, raza_id: value})}
                      options={[
                        { value: '', label: 'Sin raza' },
                        ...razas.map(r => ({ value: r.id.toString(), label: r.nombre }))
                      ]}
                      icon="fa-dna"
                    />
                    
                    <FormField
                      label="Ubicación"
                      type="select"
                      value={formData.ubicacion_actual_id}
                      onChange={(value) => setFormData({...formData, ubicacion_actual_id: value})}
                      options={[
                        { value: '', label: 'Sin ubicación' },
                        ...ubicaciones.map(u => ({ value: u.id.toString(), label: u.nombre }))
                      ]}
                      icon="fa-map-marker-alt"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Padre"
                      type="select"
                      value={formData.padre_id}
                      onChange={(value) => setFormData({...formData, padre_id: value})}
                      options={[
                        { value: '', label: 'Desconocido' },
                        ...animals.filter(a => a.sexo === 'macho').map(a => ({ value: a.id.toString(), label: `${a.identificador_unico}${a.nombre ? ' - ' + a.nombre : ''}` }))
                      ]}
                      icon="fa-mars"
                    />
                    
                    <FormField
                      label="Madre"
                      type="select"
                      value={formData.madre_id}
                      onChange={(value) => setFormData({...formData, madre_id: value})}
                      options={[
                        { value: '', label: 'Desconocida' },
                        ...animals.filter(a => a.sexo === 'hembra').map(a => ({ value: a.id.toString(), label: `${a.identificador_unico}${a.nombre ? ' - ' + a.nombre : ''}` }))
                      ]}
                      icon="fa-venus"
                    />
                  </div>
                  
                  <FormField
                    label="Observaciones"
                    type="textarea"
                    value={formData.observaciones}
                    onChange={(value) => setFormData({...formData, observaciones: value})}
                    placeholder="Notas adicionales sobre el animal..."
                    rows={3}
                  />

                  {/* Campos de trazabilidad */}
                  <div style={{ background: '#f0f4ff', border: '1px solid #c7d7f8', borderRadius: '8px', padding: '16px', marginBottom: '15px' }}>
                    <div style={{ fontWeight: '700', color: '#1a2035', marginBottom: '12px', fontSize: '13px' }}>
                      <i className="fas fa-route" style={{ marginRight: '8px', color: '#6f42c1' }}></i>
                      Datos de Trazabilidad y Costeo
                    </div>
                    <div className="grid grid-2">
                      <div>
                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Origen del animal</label>
                        <select className="form-control" value={formData.origen} onChange={e => setFormData({ ...formData, origen: e.target.value })}>
                          <option value="nacimiento">Nacimiento en granja</option>
                          <option value="compra">Compra externa</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Valor de compra / ingreso ($)</label>
                        <input type="number" step="0.01" className="form-control" placeholder="0.00" value={formData.valor_compra} onChange={e => setFormData({ ...formData, valor_compra: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Fecha de ingreso a la granja</label>
                      <input type="date" className="form-control" value={formData.fecha_ingreso} onChange={e => setFormData({ ...formData, fecha_ingreso: e.target.value })} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '25px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-success" disabled={loading}>
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: '8px' }}></i>
                      {loading ? 'Guardando...' : (modalType === 'create' ? 'Crear Animal' : 'Actualizar')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal Trazabilidad */}
      {showTraceModal && (
        <div className="modal-overlay" onClick={() => { setShowTraceModal(false); setTraceError(''); }}>
          <div className="modal-content" style={{ maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #6f42c1 0%, #4a148c 100%)', color: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
              <h5 className="card-title" style={{ color: 'white', margin: 0 }}>
                <i className="fas fa-route" style={{ marginRight: '10px' }} />
                Trazabilidad Completa del Animal
              </h5>
              <button onClick={() => { setShowTraceModal(false); setTraceError(''); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div style={{ padding: '25px' }}>
              {traceLoading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#6f42c1' }} />
                  <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando trazabilidad...</p>
                </div>
              )}
              {!traceLoading && traceError && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '40px', color: '#f25961', marginBottom: 12 }} />
                  <p style={{ color: '#f25961', fontWeight: 600 }}>{traceError}</p>
                  <small style={{ color: '#6c757d' }}>Revisa la consola del servidor para más detalles.</small>
                </div>
              )}
              {!traceLoading && traceData && (() => {
                const { animal, timeline, resumen } = traceData;
                const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                const fmtDate = (s: string) => { const [y,m,d] = s.split('T')[0].split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('es-CO'); };

                // Leyenda de tipos
                const TIPOS_LABEL: Record<string, string> = {
                  ingreso: 'Ingreso', gasto: 'Gasto', sanitario: 'Sanidad', vacuna: 'Vacuna',
                  movimiento: 'Traslado', ingreso_venta: 'Venta', alimentacion: 'Alimentación',
                  pesaje: 'Pesaje', reproductivo: 'Reproductivo'
                };

                return (
                  <div>
                    {/* Ficha del animal */}
                    <div style={{ background: 'linear-gradient(135deg,#f8f0ff,#f0f4ff)', border: '1px solid #d4b8ff', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#6f42c1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                            <i className="fas fa-paw" style={{ color: 'white', fontSize: 22 }} />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{animal.identificador_unico}</div>
                          {animal.nombre && <div style={{ color: '#6c757d', fontSize: 13 }}>{animal.nombre}</div>}
                        </div>
                        {[
                          { label: 'Categoría', val: animal.categoria },
                          { label: 'Sexo', val: animal.sexo },
                          { label: 'Raza', val: animal.raza_nombre || '—' },
                          { label: 'Ubicación actual', val: animal.ubicacion_nombre || '—' },
                          { label: 'Estado', val: animal.estado },
                          { label: 'Origen', val: animal.origen || '—' },
                        ].map((f, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</div>
                            <div style={{ fontWeight: 600, textTransform: 'capitalize', marginTop: 2 }}>{f.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPIs en dos filas: financieros + productivos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
                      {[
                        { label: 'Valor compra', value: fmt(resumen.valor_compra), color: '#1572e8' },
                        { label: 'Gastos directos', value: fmt(resumen.gastos_directos), color: '#f25961' },
                        { label: 'Costos sanidad', value: fmt(resumen.costos_sanitarios), color: '#ffad46' },
                        { label: `Alimentación (${resumen.kg_alimentacion_total.toFixed(1)} kg)`, value: fmt(resumen.costo_alimentacion), color: '#20c997' },
                        { label: 'COSTO TOTAL', value: fmt(resumen.costo_total), color: '#1a2035', bold: true },
                        { label: 'Ingresos venta', value: fmt(resumen.ingreso_total), color: '#31ce36' },
                        { label: resumen.resultado >= 0 ? '✓ GANANCIA' : '✗ PÉRDIDA', value: fmt(Math.abs(resumen.resultado)), color: resumen.resultado >= 0 ? '#31ce36' : '#f25961', bold: true },
                      ].map((k, i) => (
                        <div key={i} style={{ background: 'white', border: `2px solid ${k.color}30`, borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6c757d', fontWeight: 600, marginBottom: 3 }}>{k.label}</div>
                          <div style={{ fontSize: k.bold ? 16 : 14, fontWeight: 700, color: k.color }}>{k.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
                      {[
                        { label: 'Pesajes', value: resumen.total_pesajes, color: '#6f42c1', suffix: '' },
                        { label: 'Peso inicial', value: resumen.peso_inicial != null ? `${resumen.peso_inicial} kg` : '—', color: '#6f42c1', suffix: '' },
                        { label: 'Peso actual', value: resumen.peso_actual != null ? `${resumen.peso_actual} kg` : '—', color: '#6f42c1', suffix: '' },
                        { label: 'GDP promedio', value: resumen.ganancia_diaria_promedio ? `${resumen.ganancia_diaria_promedio} kg/d` : '—', color: '#6f42c1', suffix: '' },
                        { label: 'Traslados', value: resumen.total_movimientos, color: '#17a2b8', suffix: '' },
                        { label: 'Ciclos reprod.', value: resumen.total_ciclos, color: '#e83e8c', suffix: '' },
                      ].map((k, i) => (
                        <div key={i} style={{ background: '#f8f9fa', border: `1px solid ${k.color}30`, borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6c757d', fontWeight: 600, marginBottom: 3 }}>{k.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Leyenda */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {Object.entries({
                        ingreso:'#1572e8', gasto:'#f25961', sanitario:'#ffad46', vacuna:'#31ce36',
                        movimiento:'#17a2b8', ingreso_venta:'#28a745', alimentacion:'#20c997',
                        pesaje:'#6f42c1', reproductivo:'#e83e8c'
                      }).map(([tipo, color]) => (
                        <span key={tipo} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#6c757d' }}>
                          <span style={{ width:10, height:10, borderRadius:'50%', background:color, display:'inline-block' }} />
                          {TIPOS_LABEL[tipo]}
                        </span>
                      ))}
                    </div>

                    {/* Línea de tiempo */}
                    <h6 style={{ color: '#1a2035', marginBottom: '14px', fontWeight: '700' }}>
                      <i className="fas fa-history" style={{ marginRight: '8px', color: '#6f42c1' }} />
                      Línea de Vida ({timeline.length} eventos)
                    </h6>
                    {timeline.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>Sin eventos registrados</div>
                    ) : (
                      <div style={{ position: 'relative', paddingLeft: '32px' }}>
                        <div style={{ position: 'absolute', left: '15px', top: 0, bottom: 0, width: '2px', background: '#dee2e6' }} />
                        {timeline.map((ev, i) => (
                          <div key={i} style={{ position: 'relative', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ position: 'absolute', left: '-23px', width: '30px', height: '30px', borderRadius: '50%', background: ev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, boxShadow: `0 2px 6px ${ev.color}55` }}>
                              <i className={`fas ${ev.icono}`} style={{ color: 'white', fontSize: '11px' }} />
                            </div>
                            <div style={{ background: 'white', borderRadius: '8px', padding: '10px 14px', flex: 1, borderLeft: `3px solid ${ev.color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                    <span style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>{fmtDate(ev.fecha)}</span>
                                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: ev.color + '22', color: ev.color, fontWeight: 700 }}>{TIPOS_LABEL[ev.tipo] || ev.tipo}</span>
                                  </div>
                                  <div style={{ fontWeight: 600, color: '#1a2035', fontSize: 13 }}>{ev.descripcion}</div>
                                  {ev.tipo === 'movimiento' && ev.costo_acumulado_momento !== undefined && (
                                    <div style={{ fontSize: 11, color: '#6c757d', marginTop: 3 }}>
                                      <i className="fas fa-coins" style={{ marginRight: 4 }} />
                                      Costo acumulado al traslado: <strong>{fmt(ev.costo_acumulado_momento)}</strong>
                                      {ev.peso_momento ? <span style={{ marginLeft: 8 }}><i className="fas fa-weight" style={{ marginRight: 3 }} />{ev.peso_momento} kg</span> : ''}
                                      {ev.extra ? <span style={{ marginLeft: 8, fontStyle: 'italic' }}>{ev.extra}</span> : ''}
                                    </div>
                                  )}
                                  {ev.tipo === 'pesaje' && ev.peso_momento && (
                                    <div style={{ fontSize: 11, color: '#6f42c1', marginTop: 3, fontWeight: 600 }}>
                                      <i className="fas fa-weight" style={{ marginRight: 4 }} />{ev.peso_momento} kg
                                    </div>
                                  )}
                                </div>
                                {ev.monto > 0 && (
                                  <span style={{ fontWeight: 700, color: ev.tipo === 'ingreso_venta' ? '#28a745' : '#f25961', fontSize: 14, whiteSpace: 'nowrap', marginLeft: 8 }}>
                                    {ev.tipo === 'ingreso_venta' ? '+' : '-'}{fmt(ev.monto)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Mover Animal */}
      {showMoveModal && moveAnimal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #17a2b8 0%, #0d6e7e 100%)', color: 'white' }}>
              <h5 className="card-title" style={{ color: 'white', margin: 0 }}>
                <i className="fas fa-exchange-alt" style={{ marginRight: '10px' }}></i>
                Mover Animal — {moveAnimal.identificador_unico}
              </h5>
              <button onClick={() => setShowMoveModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '25px' }}>
              <div style={{ background: '#e8f4f8', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: '#0d6e7e' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                Ubicación actual: <strong>{moveAnimal.ubicacion_nombre || 'Sin asignar'}</strong>. Se registrará el costo acumulado hasta este momento.
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nueva Ubicación *</label>
                <select className="form-control" value={moveForm.ubicacion_destino_id} onChange={e => setMoveForm({ ...moveForm, ubicacion_destino_id: e.target.value })}>
                  <option value="">Seleccionar ubicación...</option>
                  {ubicaciones.filter(u => u.id !== moveAnimal.ubicacion_actual_id).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Fecha *</label>
                  <input type="date" className="form-control" value={moveForm.fecha} onChange={e => setMoveForm({ ...moveForm, fecha: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Peso actual (kg)</label>
                  <input type="number" step="0.1" className="form-control" placeholder="Ej: 45.5" value={moveForm.peso_momento} onChange={e => setMoveForm({ ...moveForm, peso_momento: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Motivo del traslado</label>
                <input type="text" className="form-control" placeholder="Ej: Cambio de etapa, engorde, maternidad..." value={moveForm.motivo} onChange={e => setMoveForm({ ...moveForm, motivo: e.target.value })} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Observaciones</label>
                <textarea className="form-control" rows={2} placeholder="Notas adicionales..." value={moveForm.observaciones} onChange={e => setMoveForm({ ...moveForm, observaciones: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSubmitMove} disabled={!moveForm.ubicacion_destino_id}>
                  <i className="fas fa-exchange-alt" style={{ marginRight: '8px' }}></i>
                  Registrar Traslado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={resetBulk}>
          <div className="modal-content" style={{ maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="fas fa-file-excel" style={{ marginRight: '10px', color: '#31ce36' }}></i>
                Carga Masiva de Animales
              </h5>
              <button onClick={resetBulk} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '25px' }}>
              {/* Paso 1: Descargar plantilla */}
              <div style={{ background: '#f0f7ff', border: '1px solid #bee3f8', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#1a2035', marginBottom: '4px' }}>
                      <i className="fas fa-download" style={{ marginRight: '8px', color: '#1572e8' }}></i>
                      Paso 1 — Descarga la plantilla Excel
                    </div>
                    <div style={{ fontSize: '13px', color: '#6c757d' }}>Incluye columnas requeridas, ejemplos y hoja de referencia con valores válidos.</div>
                  </div>
                  <button className="btn btn-primary" onClick={downloadTemplate}>
                    <i className="fas fa-file-download" style={{ marginRight: '8px' }}></i>
                    Descargar Plantilla
                  </button>
                </div>
              </div>

              {/* Paso 2: Subir archivo */}
              <div style={{ background: '#f8f9fa', border: '2px dashed #dee2e6', borderRadius: '8px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontWeight: '700', color: '#1a2035', marginBottom: '8px' }}>
                  <i className="fas fa-upload" style={{ marginRight: '8px', color: '#ffad46' }}></i>
                  Paso 2 — Sube tu archivo Excel (.xlsx)
                </div>
                <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>Máximo 500 filas por carga</div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
                <button className="btn btn-warning" onClick={() => fileInputRef.current?.click()}>
                  <i className="fas fa-folder-open" style={{ marginRight: '8px' }}></i>
                  Seleccionar Archivo
                </button>
                {bulkRows.length > 0 && !bulkDone && (
                  <div style={{ marginTop: '12px', padding: '10px', background: '#d4edda', borderRadius: '6px', color: '#155724', fontWeight: '600' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
                    {bulkRows.length} filas detectadas — listas para validar y cargar
                  </div>
                )}
              </div>

              {/* Paso 3: Previsualización y carga */}
              {bulkRows.length > 0 && !bulkDone && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong style={{ color: '#1a2035' }}>Vista previa ({Math.min(bulkRows.length, 5)} de {bulkRows.length} filas)</strong>
                    <button className="btn btn-success" onClick={handleBulkUpload} disabled={bulkLoading}>
                      <i className={`fas ${bulkLoading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`} style={{ marginRight: '8px' }}></i>
                      {bulkLoading ? 'Procesando...' : `Cargar ${bulkRows.length} animales`}
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          {Object.keys(bulkRows[0]).map(k => <th key={k}>{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v: any, j) => <td key={j}>{String(v)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkRows.length > 5 && <div style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>... y {bulkRows.length - 5} filas más</div>}
                </div>
              )}

              {/* Resultados */}
              {bulkDone && bulkResults.length > 0 && (() => {
                const ok = bulkResults.filter(r => r.estado === 'ok');
                const err = bulkResults.filter(r => r.estado === 'error');
                return (
                  <div>
                    {/* Resumen */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#155724' }}>{ok.length}</div>
                        <div style={{ fontWeight: '600', color: '#155724' }}>Importados correctamente</div>
                      </div>
                      <div style={{ background: err.length > 0 ? '#f8d7da' : '#d4edda', border: `1px solid ${err.length > 0 ? '#f5c6cb' : '#c3e6cb'}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: err.length > 0 ? '#721c24' : '#155724' }}>{err.length}</div>
                        <div style={{ fontWeight: '600', color: err.length > 0 ? '#721c24' : '#155724' }}>Con errores</div>
                      </div>
                    </div>

                    {/* Tabla de errores */}
                    {err.length > 0 && (
                      <div>
                        <div style={{ fontWeight: '700', color: '#721c24', marginBottom: '10px' }}>
                          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                          Filas con errores — corrígelas en el Excel y vuelve a cargar
                        </div>
                        <div className="table-responsive">
                          <table className="table" style={{ fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: '#f8d7da' }}>
                                <th>Fila</th>
                                <th>Identificador</th>
                                <th>Errores encontrados</th>
                              </tr>
                            </thead>
                            <tbody>
                              {err.map((r, i) => (
                                <tr key={i} style={{ background: '#fff5f5' }}>
                                  <td style={{ fontWeight: '700', color: '#721c24' }}>{r.fila}</td>
                                  <td style={{ fontWeight: '600' }}>{r.identificador_unico}</td>
                                  <td>
                                    {r.errores.map((e, j) => (
                                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
                                        <i className="fas fa-times-circle" style={{ color: '#f25961', marginTop: '2px', flexShrink: 0 }}></i>
                                        <span>{e}</span>
                                      </div>
                                    ))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {err.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#155724' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                        <h5>¡Carga completada sin errores!</h5>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                      {err.length > 0 && (
                        <button className="btn btn-warning" onClick={() => { setBulkRows([]); setBulkResults([]); setBulkDone(false); }}>
                          <i className="fas fa-redo" style={{ marginRight: '8px' }}></i>
                          Cargar otro archivo
                        </button>
                      )}
                      <button className="btn btn-secondary" onClick={resetBulk}>Cerrar</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Animals;