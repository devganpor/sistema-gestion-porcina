import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface Diet {
  id: number;
  nombre: string;
  categoria_animal: string;
  costo_por_kg: number;
  proteina_porcentaje: number;
  energia_kcal: number;
  descripcion?: string;
}

const emptyForm = {
  nombre: '',
  categoria: 'lechon',
  costo_kg: '',
  proteina: '',
  energia: '',
  descripcion: ''
};

const NutritionComplete: React.FC = () => {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dietas');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/nutrition/diets').catch(() => ({ data: [] }));
      setDiets(res.data);
    } catch (error) {
      console.error('Error cargando dietas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formData.nombre,
        categoria_animal: formData.categoria,
        costo_por_kg: formData.costo_kg ? parseFloat(formData.costo_kg) : 0,
        proteina_porcentaje: formData.proteina ? parseFloat(formData.proteina) : null,
        energia_kcal: formData.energia ? parseFloat(formData.energia) : null,
        descripcion: formData.descripcion
      };
      if (editingId) {
        await api.put(`/nutrition/diets/${editingId}`, payload);
        setSuccess('Dieta actualizada exitosamente');
      } else {
        await api.post('/nutrition/diets', payload);
        setSuccess('Dieta creada exitosamente');
      }
      resetForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      alert('Error guardando dieta');
    }
  };

  const handleEdit = (diet: Diet) => {
    setFormData({
      nombre: diet.nombre,
      categoria: diet.categoria_animal || 'lechon',
      costo_kg: diet.costo_por_kg?.toString() || '',
      proteina: diet.proteina_porcentaje?.toString() || '',
      energia: diet.energia_kcal?.toString() || '',
      descripcion: diet.descripcion || ''
    });
    setEditingId(diet.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar la dieta "${nombre}"?`)) return;
    try {
      await api.delete(`/nutrition/diets/${id}`);
      setSuccess('Dieta eliminada exitosamente');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      alert('Error eliminando dieta');
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const tabBtn = (tab: string, icon: string, label: string) => (
    <button onClick={() => setActiveTab(tab)} style={{
      padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: '600',
      borderRadius: '8px 8px 0 0',
      background: activeTab === tab ? '#1572e8' : 'transparent',
      color: activeTab === tab ? '#fff' : '#6c757d'
    }}>
      <i className={`fas ${icon}`} style={{ marginRight: '8px' }}></i>{label}
    </button>
  );

  if (loading) return (
    <div className="page-inner"><div className="card">
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
        <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando nutrición...</p>
      </div>
    </div></div>
  );

  return (
    <div className="page-inner">
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>{success}
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">
              <i className="fas fa-seedling" style={{ marginRight: '10px' }}></i>
              Nutrición y Alimentación
            </h4>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
              <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
              {showForm ? 'Cancelar' : 'Nueva Dieta'}
            </button>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {showForm && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className={`fas ${editingId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
                  {editingId ? 'Editar Dieta' : 'Nueva Dieta'}
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Nombre *</label>
                      <input type="text" value={formData.nombre} required
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}
                        placeholder="Ej: Iniciador Lechones" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Categoría Animal</label>
                      <select value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                        style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}>
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
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Costo por Kg ($)</label>
                      <input type="number" step="0.01" value={formData.costo_kg}
                        onChange={(e) => setFormData({...formData, costo_kg: e.target.value})}
                        style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}
                        placeholder="1500" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Proteína (%)</label>
                      <input type="number" step="0.1" value={formData.proteina}
                        onChange={(e) => setFormData({...formData, proteina: e.target.value})}
                        style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}
                        placeholder="18.5" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Energía (kcal/kg)</label>
                      <input type="number" step="1" value={formData.energia}
                        onChange={(e) => setFormData({...formData, energia: e.target.value})}
                        style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}
                        placeholder="3200" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Descripción / Ingredientes</label>
                    <textarea value={formData.descripcion} rows={3}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
                      placeholder="Maíz 60%, Soya 25%, Vitaminas 5%..." />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                      {editingId ? 'Actualizar' : 'Guardar'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ebedf2' }}>
            {tabBtn('dietas', 'fa-utensils', 'Dietas')}
            {tabBtn('registros', 'fa-clipboard-list', 'Registros de Alimentación')}
          </div>

          {activeTab === 'dietas' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1572e8' }}>{diets.length}</div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>DIETAS REGISTRADAS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#31ce36' }}>
                    {diets.length > 0 ? (diets.reduce((acc, d) => acc + (parseFloat(d.costo_por_kg as any) || 0), 0) / diets.length).toFixed(0) : 0}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>COSTO PROMEDIO/KG</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffad46' }}>
                    {new Set(diets.map(d => d.categoria_animal)).size}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>CATEGORÍAS</div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Costo/Kg</th>
                      <th>Proteína (%)</th>
                      <th>Energía (kcal/kg)</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diets.map(diet => (
                      <tr key={diet.id}>
                        <td style={{ fontWeight: '600' }}>{diet.nombre}</td>
                        <td>
                          <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: '#6c757d', color: '#fff', textTransform: 'capitalize' }}>
                            {diet.categoria_animal || '-'}
                          </span>
                        </td>
                        <td>${parseFloat(diet.costo_por_kg as any || 0).toLocaleString()}</td>
                        <td>{diet.proteina_porcentaje != null ? `${diet.proteina_porcentaje}%` : '-'}</td>
                        <td>{diet.energia_kcal != null ? diet.energia_kcal : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleEdit(diet)}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleDelete(diet.id, diet.nombre)}>
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
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>Crear Dieta
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'registros' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <i className="fas fa-clipboard-list" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
              <h5>Registros de Alimentación</h5>
              <p>Usa el módulo de dietas para crear dietas y luego registra el suministro diario aquí.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionComplete;
