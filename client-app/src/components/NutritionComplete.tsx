import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface Diet {
  id: number;
  nombre: string;
  categoria: string;
  costo_kg: number;
  proteina: number;
  energia: number;
}

interface FeedingRecord {
  id: number;
  fecha: string;
  ubicacion: string;
  dieta: string;
  cantidad_kg: number;
  costo_total: number;
}

const NutritionComplete: React.FC = () => {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dietas');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'lechon',
    costo_kg: '',
    proteina: '',
    energia: '',
    ingredientes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dietsRes, recordsRes] = await Promise.all([
        api.get('/nutrition/diets').catch(() => ({ data: [] })),
        api.get('/nutrition/feeding-records').catch(() => ({ data: [] }))
      ]);
      setDiets(dietsRes.data);
      setFeedingRecords(recordsRes.data);
    } catch (error) {
      console.error('Error cargando datos de nutrición:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/nutrition/diets', formData);
      alert('Dieta registrada exitosamente');
      setFormData({
        nombre: '',
        categoria: 'lechon',
        costo_kg: '',
        proteina: '',
        energia: '',
        ingredientes: ''
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error guardando dieta:', error);
      alert('Error guardando dieta');
    }
  };

  if (loading) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando datos de nutrición...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">
              <i className="fas fa-seedling" style={{ marginRight: '10px' }}></i>
              Nutrición y Alimentación
            </h4>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
              {showForm ? 'Cancelar' : 'Nueva Dieta'}
            </button>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Formulario */}
          {showForm && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  Nueva Dieta
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Nombre de la Dieta *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        placeholder="Ej: Iniciador Lechones"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Categoría</label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="lechon">Lechón</option>
                        <option value="recria">Recría</option>
                        <option value="desarrollo">Desarrollo</option>
                        <option value="engorde">Engorde</option>
                        <option value="reproductor">Reproductor</option>
                        <option value="gestacion">Gestación</option>
                        <option value="lactancia">Lactancia</option>
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Costo por Kg</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.costo_kg}
                        onChange={(e) => setFormData({...formData, costo_kg: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        placeholder="1500"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Proteína (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.proteina}
                        onChange={(e) => setFormData({...formData, proteina: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        placeholder="18.5"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Energía (Mcal/kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.energia}
                        onChange={(e) => setFormData({...formData, energia: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        placeholder="3.25"
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Ingredientes</label>
                    <textarea
                      value={formData.ingredientes}
                      onChange={(e) => setFormData({...formData, ingredientes: e.target.value})}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ebedf2',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                      placeholder="Maíz 60%, Soya 25%, Vitaminas 5%..."
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                      Guardar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ebedf2' }}>
            <button
              onClick={() => setActiveTab('dietas')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'dietas' ? '#1572e8' : 'transparent',
                color: activeTab === 'dietas' ? '#ffffff' : '#6c757d',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-utensils" style={{ marginRight: '8px' }}></i>
              Dietas
            </button>
            <button
              onClick={() => setActiveTab('registros')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'registros' ? '#1572e8' : 'transparent',
                color: activeTab === 'registros' ? '#ffffff' : '#6c757d',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-clipboard-list" style={{ marginRight: '8px' }}></i>
              Registros de Alimentación
            </button>
          </div>

          {/* Contenido de Tabs */}
          {activeTab === 'dietas' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1572e8' }}>{diets.length}</div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>DIETAS REGISTRADAS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#31ce36' }}>
                    {diets.length > 0 ? Math.round(diets.reduce((acc, d) => acc + (d.costo_kg || 0), 0) / diets.length) : 0}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>COSTO PROMEDIO/KG</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffad46' }}>
                    {new Set(diets.map(d => d.categoria)).size}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>CATEGORÍAS</div>
                </div>
              </div>

              {/* Tabla de Dietas */}
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Costo/Kg</th>
                      <th>Proteína (%)</th>
                      <th>Energía</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diets.map(diet => (
                      <tr key={diet.id}>
                        <td style={{ fontWeight: '600' }}>{diet.nombre}</td>
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
                            {diet.categoria}
                          </span>
                        </td>
                        <td>${diet.costo_kg?.toLocaleString() || 0}</td>
                        <td>{diet.proteina || '-'}%</td>
                        <td>{diet.energia || '-'} Mcal/kg</td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="btn btn-primary btn-sm" title="Ver">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-warning btn-sm" title="Editar">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" title="Eliminar">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {diets.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-seedling" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                  <h5>No hay dietas registradas</h5>
                  <p>Comienza creando tu primera dieta</p>
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                    Crear Dieta
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'registros' && (
            <div>
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <i className="fas fa-clipboard-list" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                <h5>Registros de Alimentación</h5>
                <p>Funcionalidad en desarrollo</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionComplete;