import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface Dieta {
  id: number;
  nombre: string;
  categoria: string;
  ingredientes: string;
  costo_kg: number;
  proteina: number;
  energia: number;
}

interface RegistroAlimentacion {
  id: number;
  fecha: string;
  ubicacion_nombre: string;
  tipo_alimento: string;
  cantidad_kg: number;
  costo_total: number;
}

const Nutrition: React.FC = () => {
  const [activeTab, setActiveTab] = useState('diets');
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [registros, setRegistros] = useState<RegistroAlimentacion[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('diet');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [dietForm, setDietForm] = useState({
    nombre: '',
    categoria: 'lechon',
    ingredientes: '',
    costo_kg: '',
    proteina: '',
    energia: ''
  });

  const [feedingForm, setFeedingForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    ubicacion_id: '',
    tipo_alimento: '',
    cantidad_kg: '',
    costo_total: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ubicacionesRes] = await Promise.all([
        api.get('/locations')
      ]);
      setUbicaciones(ubicacionesRes.data.filter((u: any) => u.tipo === 'corral'));
    } catch (error) {
      console.error('Error cargando datos de nutrición:', error);
    }
  };

  const resetForms = () => {
    setShowForm(false);
    setEditingId(null);
    setDietForm({
      nombre: '',
      categoria: 'lechon',
      ingredientes: '',
      costo_kg: '',
      proteina: '',
      energia: ''
    });
    setFeedingForm({
      fecha: new Date().toISOString().split('T')[0],
      ubicacion_id: '',
      tipo_alimento: '',
      cantidad_kg: '',
      costo_total: ''
    });
  };

  const openForm = (type: string) => {
    setFormType(type);
    setShowForm(true);
  };

  const tabStyle = (tab: string) => ({
    padding: '12px 24px',
    border: 'none',
    backgroundColor: activeTab === tab ? '#28a745' : '#f8f9fa',
    color: activeTab === tab ? 'white' : '#333',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: '2px'
  });

  return (
    <div className="fade-in">
      <div className="card-header">
        <div>
          <h1 className="card-title">🌾 Nutrición y Alimentación</h1>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Control de dietas, alimentación e inventarios</p>
        </div>
        <div>
          <button 
            className="btn btn-success"
            onClick={() => openForm('diet')}
            style={{ marginRight: '10px' }}
          >
            ➕ Nueva Dieta
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => openForm('feeding')}
          >
            📝 Registrar Alimentación
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === 'diets' ? 'active' : ''}`}
          onClick={() => setActiveTab('diets')}
        >
          🍽️ Dietas
        </button>
        <button 
          className={`tab-button ${activeTab === 'feeding' ? 'active' : ''}`}
          onClick={() => setActiveTab('feeding')}
        >
          📊 Alimentación
        </button>
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventario
        </button>
      </div>

      {/* Formularios */}
      {showForm && (
        <div className="card mb-4 fade-in">
          {formType === 'diet' && (
            <div>
              <div className="card-header">
                <h3 className="card-title">
                  {editingId ? '✏️ Editar Dieta' : '➕ Nueva Dieta'}
                </h3>
              </div>
              <form>
                <div className="grid grid-3">
                  <div className="form-group">
                    <label>Nombre de la Dieta:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={dietForm.nombre}
                      onChange={(e) => setDietForm({...dietForm, nombre: e.target.value})}
                      placeholder="Ej: Dieta Lechones Iniciación"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoría:</label>
                    <select
                      className="form-control"
                      value={dietForm.categoria}
                      onChange={(e) => setDietForm({...dietForm, categoria: e.target.value})}
                    >
                      <option value="lechon">Lechón</option>
                      <option value="recria">Recría</option>
                      <option value="desarrollo">Desarrollo</option>
                      <option value="engorde">Engorde</option>
                      <option value="gestacion">Gestación</option>
                      <option value="lactancia">Lactancia</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Costo por kg ($):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={dietForm.costo_kg}
                      onChange={(e) => setDietForm({...dietForm, costo_kg: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Proteína (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={dietForm.proteina}
                      onChange={(e) => setDietForm({...dietForm, proteina: e.target.value})}
                      placeholder="Ej: 18.5"
                    />
                  </div>
                  <div className="form-group">
                    <label>Energía (Mcal/kg):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={dietForm.energia}
                      onChange={(e) => setDietForm({...dietForm, energia: e.target.value})}
                      placeholder="Ej: 3.25"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Ingredientes y Composición:</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={dietForm.ingredientes}
                      onChange={(e) => setDietForm({...dietForm, ingredientes: e.target.value})}
                      placeholder="Ej: Maíz 60%, Soya 25%, Salvado 10%, Vitaminas 5%"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-success">
                    {editingId ? '💾 Actualizar' : '💾 Crear'} Dieta
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={resetForms}>
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {formType === 'feeding' && (
            <div>
              <div className="card-header">
                <h3 className="card-title">📝 Registrar Alimentación</h3>
              </div>
              <form>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label>Fecha:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={feedingForm.fecha}
                      onChange={(e) => setFeedingForm({...feedingForm, fecha: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Ubicación (Corral):</label>
                    <select
                      className="form-control"
                      value={feedingForm.ubicacion_id}
                      onChange={(e) => setFeedingForm({...feedingForm, ubicacion_id: e.target.value})}
                      required
                    >
                      <option value="">Seleccionar corral</option>
                      {ubicaciones.map(ubicacion => (
                        <option key={ubicacion.id} value={ubicacion.id}>
                          {ubicacion.nombre} ({ubicacion.animales_actuales} animales)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de Alimento:</label>
                    <select
                      className="form-control"
                      value={feedingForm.tipo_alimento}
                      onChange={(e) => setFeedingForm({...feedingForm, tipo_alimento: e.target.value})}
                      required
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="Concentrado Lechones">Concentrado Lechones</option>
                      <option value="Concentrado Recría">Concentrado Recría</option>
                      <option value="Concentrado Engorde">Concentrado Engorde</option>
                      <option value="Concentrado Gestación">Concentrado Gestación</option>
                      <option value="Concentrado Lactancia">Concentrado Lactancia</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cantidad (kg):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={feedingForm.cantidad_kg}
                      onChange={(e) => setFeedingForm({...feedingForm, cantidad_kg: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Costo Total ($):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={feedingForm.costo_total}
                      onChange={(e) => setFeedingForm({...feedingForm, costo_total: e.target.value})}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-success">
                    💾 Registrar Alimentación
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={resetForms}>
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Contenido de tabs */}
      {activeTab === 'diets' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🍽️ Dietas Formuladas</h3>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">🌾</div>
            <h3>Módulo de Dietas</h3>
            <p>Formulación de dietas por etapa productiva en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === 'feeding' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Registro de Alimentación</h3>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>Registro Diario</h3>
            <p>Control de alimentación diaria por corral en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📦 Inventario de Alimentos</h3>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>Control de Stock</h3>
            <p>Inventario de alimentos y alertas de bajo stock en desarrollo...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nutrition;