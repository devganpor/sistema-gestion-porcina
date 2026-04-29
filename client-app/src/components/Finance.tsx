import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface Gasto {
  id: number;
  fecha: string;
  categoria: string;
  subcategoria?: string;
  descripcion: string;
  monto: number;
  proveedor?: string;
  factura?: string;
  animal_id?: number;
  animal_identificador?: string;
}

interface Ingreso {
  id: number;
  fecha: string;
  tipo: string;
  descripcion: string;
  monto: number;
  comprador?: string;
  factura?: string;
  animal_id?: number;
  peso_venta?: number;
  precio_kg?: number;
  animal_identificador?: string;
}

interface ResumenFinanciero {
  totales: {
    gastos: number;
    ingresos: number;
    utilidad: number;
    margen: string;
  };
  gastos: Array<{ categoria: string; total: number; cantidad: number }>;
  ingresos: Array<{ tipo: string; total: number; cantidad: number }>;
}

const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null);
  const [animals, setAnimals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('expense');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [expenseForm, setExpenseForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'Alimentación',
    subcategoria: '',
    descripcion: '',
    monto: '',
    proveedor: '',
    factura: '',
    animal_id: ''
  });

  const [incomeForm, setIncomeForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'venta_animal',
    descripcion: '',
    monto: '',
    comprador: '',
    factura: '',
    animal_id: '',
    peso_venta: '',
    precio_kg: ''
  });

  const [dateFilter, setDateFilter] = useState({
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    try {
      const [gastosRes, ingresosRes, resumenRes, animalsRes] = await Promise.all([
        api.get(`/finance/expenses?fecha_inicio=${dateFilter.fecha_inicio}&fecha_fin=${dateFilter.fecha_fin}`),
        api.get(`/finance/income?fecha_inicio=${dateFilter.fecha_inicio}&fecha_fin=${dateFilter.fecha_fin}`),
        api.get(`/finance/summary?fecha_inicio=${dateFilter.fecha_inicio}&fecha_fin=${dateFilter.fecha_fin}`),
        api.get('/animals?estado=activo')
      ]);
      
      setGastos(gastosRes.data);
      setIngresos(ingresosRes.data);
      setResumen(resumenRes.data);
      setAnimals(animalsRes.data);
    } catch (error) {
      console.error('Error cargando datos financieros:', error);
    }
  };

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');
  
  const validateExpenseForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!expenseForm.descripcion || expenseForm.descripcion.trim() === '') {
      newErrors.descripcion = 'La descripción es requerida';
    }
    
    if (!expenseForm.monto || expenseForm.monto === '') {
      newErrors.monto = 'El monto es requerido';
    } else {
      const monto = parseFloat(expenseForm.monto);
      if (isNaN(monto) || monto <= 0) {
        newErrors.monto = 'El monto debe ser mayor a 0';
      } else if (monto > 10000000) {
        newErrors.monto = 'El monto parece demasiado alto';
      }
    }
    
    if (!expenseForm.fecha) {
      newErrors.fecha = 'La fecha es requerida';
    } else {
      const fecha = new Date(expenseForm.fecha);
      const hoy = new Date();
      if (fecha > hoy) {
        newErrors.fecha = 'La fecha no puede ser futura';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateExpenseForm()) {
      console.log('Validación fallida:', errors);
      return;
    }
    
    try {
      const data = {
        ...expenseForm,
        monto: parseFloat(expenseForm.monto),
        animal_id: expenseForm.animal_id ? parseInt(expenseForm.animal_id) : null
      };
      
      if (editingId && formType === 'expense') {
        const response = await api.put(`/finance/expenses/${editingId}`, data);
        console.log('Gasto actualizado:', response.data);
        setSuccess('Gasto actualizado exitosamente');
      } else {
        const response = await api.post('/finance/expenses', data);
        console.log('Gasto creado:', response.data);
        setSuccess('Gasto registrado exitosamente');
      }
      
      resetForms();
      await loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error guardando gasto:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error guardando gasto';
      setErrors({ general: errorMessage });
    }
  };

  const resetForms = () => {
    setShowForm(false);
    setEditingId(null);
    setExpenseForm({
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'Alimentación',
      subcategoria: '',
      descripcion: '',
      monto: '',
      proveedor: '',
      factura: '',
      animal_id: ''
    });
    setIncomeForm({
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'venta_animal',
      descripcion: '',
      monto: '',
      comprador: '',
      factura: '',
      animal_id: '',
      peso_venta: '',
      precio_kg: ''
    });
  };

  const handleEditExpense = (gasto: Gasto) => {
    setExpenseForm({
      fecha: gasto.fecha,
      categoria: gasto.categoria,
      subcategoria: gasto.subcategoria || '',
      descripcion: gasto.descripcion,
      monto: gasto.monto.toString(),
      proveedor: gasto.proveedor || '',
      factura: gasto.factura || '',
      animal_id: gasto.animal_id?.toString() || ''
    });
    setEditingId(gasto.id);
    setFormType('expense');
    setShowForm(true);
  };

  const handleEditIncome = (ingreso: Ingreso) => {
    setIncomeForm({
      fecha: ingreso.fecha,
      tipo: ingreso.tipo,
      descripcion: ingreso.descripcion,
      monto: ingreso.monto.toString(),
      comprador: ingreso.comprador || '',
      factura: ingreso.factura || '',
      animal_id: ingreso.animal_id?.toString() || '',
      peso_venta: ingreso.peso_venta?.toString() || '',
      precio_kg: ingreso.precio_kg?.toString() || ''
    });
    setEditingId(ingreso.id);
    setFormType('income');
    setShowForm(true);
  };
  
  const handleDeleteIncome = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este ingreso?')) {
      try {
        await api.delete(`/finance/income/${id}`);
        setSuccess('Ingreso eliminado exitosamente');
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error: any) {
        console.error('Error eliminando ingreso:', error);
        const errorMessage = error.response?.data?.message || 'Error eliminando ingreso';
        setErrors({ general: errorMessage });
      }
    }
  };
  
  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este gasto?')) {
      try {
        await api.delete(`/finance/expenses/${id}`);
        setSuccess('Gasto eliminado exitosamente');
        await loadData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error: any) {
        console.error('Error eliminando gasto:', error);
        const errorMessage = error.response?.data?.message || 'Error eliminando gasto';
        setErrors({ general: errorMessage });
      }
    }
  };

  const validateIncomeForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!incomeForm.descripcion || incomeForm.descripcion.trim() === '') {
      newErrors.descripcion = 'La descripción es requerida';
    }
    
    if (!incomeForm.monto || incomeForm.monto === '') {
      newErrors.monto = 'El monto es requerido';
    } else {
      const monto = parseFloat(incomeForm.monto);
      if (isNaN(monto) || monto <= 0) {
        newErrors.monto = 'El monto debe ser mayor a 0';
      } else if (monto > 50000000) {
        newErrors.monto = 'El monto parece demasiado alto';
      }
    }
    
    if (!incomeForm.fecha) {
      newErrors.fecha = 'La fecha es requerida';
    } else {
      const fecha = new Date(incomeForm.fecha);
      const hoy = new Date();
      if (fecha > hoy) {
        newErrors.fecha = 'La fecha no puede ser futura';
      }
    }
    
    if (incomeForm.tipo === 'venta_animal' && (!incomeForm.animal_id || incomeForm.animal_id === '')) {
      newErrors.animal_id = 'Debe seleccionar un animal para la venta';
    }
    
    if (incomeForm.peso_venta) {
      const peso = parseFloat(incomeForm.peso_venta);
      if (isNaN(peso) || peso <= 0) {
        newErrors.peso_venta = 'El peso debe ser mayor a 0';
      } else if (peso > 500) {
        newErrors.peso_venta = 'El peso parece demasiado alto';
      }
    }
    
    if (incomeForm.precio_kg) {
      const precio = parseFloat(incomeForm.precio_kg);
      if (isNaN(precio) || precio <= 0) {
        newErrors.precio_kg = 'El precio por kg debe ser mayor a 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateIncomeForm()) {
      console.log('Validación fallida:', errors);
      return;
    }
    
    try {
      const data = {
        ...incomeForm,
        monto: parseFloat(incomeForm.monto),
        animal_id: incomeForm.animal_id ? parseInt(incomeForm.animal_id) : null,
        peso_venta: incomeForm.peso_venta ? parseFloat(incomeForm.peso_venta) : null,
        precio_kg: incomeForm.precio_kg ? parseFloat(incomeForm.precio_kg) : null
      };
      
      if (editingId && formType === 'income') {
        const response = await api.put(`/finance/income/${editingId}`, data);
        console.log('Ingreso actualizado:', response.data);
        setSuccess('Ingreso actualizado exitosamente');
      } else {
        const response = await api.post('/finance/income', data);
        console.log('Ingreso creado:', response.data);
        setSuccess('Ingreso registrado exitosamente');
      }
      
      resetForms();
      await loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error guardando ingreso:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error guardando ingreso';
      setErrors({ general: errorMessage });
    }
  };

  const openForm = (type: string) => {
    setFormType(type);
    setShowForm(true);
  };

  const tabStyle = (tab: string) => ({
    padding: '12px 24px',
    border: 'none',
    backgroundColor: activeTab === tab ? '#17a2b8' : '#f8f9fa',
    color: activeTab === tab ? 'white' : '#333',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: '2px'
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  return (
    <div>
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {success}
        </div>
      )}
      
      {errors.general && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
          {errors.general}
        </div>
      )}
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>💰 Gestión Financiera</h1>
        <div>
          <button 
            className="btn btn-danger"
            onClick={() => openForm('expense')}
            style={{ marginRight: '10px' }}
          >
            Registrar Gasto
          </button>
          <button 
            className="btn btn-success"
            onClick={() => openForm('income')}
          >
            Registrar Ingreso
          </button>
        </div>
      </div>

      {/* Filtro de fechas */}
      <div className="card mb-3">
        <div className="d-flex align-items-center" style={{ gap: '15px' }}>
          <label>Período:</label>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={dateFilter.fecha_inicio}
            onChange={(e) => setDateFilter({...dateFilter, fecha_inicio: e.target.value})}
          />
          <span>hasta</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={dateFilter.fecha_fin}
            onChange={(e) => setDateFilter({...dateFilter, fecha_fin: e.target.value})}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          style={tabStyle('summary')}
          onClick={() => setActiveTab('summary')}
        >
          📊 Resumen
        </button>
        <button 
          style={tabStyle('expenses')}
          onClick={() => setActiveTab('expenses')}
        >
          📉 Gastos
        </button>
        <button 
          style={tabStyle('income')}
          onClick={() => setActiveTab('income')}
        >
          📈 Ingresos
        </button>
      </div>

      {/* Formularios */}
      {showForm && (
        <div className="card mb-3">
          {formType === 'expense' && (
            <div>
              <h3>{editingId && formType === 'expense' ? '✏️ Editar Gasto' : '➕ Registrar Gasto'}</h3>
              {errors.general && (
                <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                  {errors.general}
                </div>
              )}
              <form onSubmit={handleExpenseSubmit}>
                <div className="grid grid-3">
                  <div className="form-group">
                    <label>Fecha:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={expenseForm.fecha}
                      onChange={(e) => setExpenseForm({...expenseForm, fecha: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoría:</label>
                    <select
                      className="form-control"
                      value={expenseForm.categoria}
                      onChange={(e) => setExpenseForm({...expenseForm, categoria: e.target.value})}
                    >
                      <option value="Alimentación">Alimentación</option>
                      <option value="Medicamentos">Medicamentos</option>
                      <option value="Veterinario">Veterinario</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Servicios">Servicios</option>
                      <option value="Mano de Obra">Mano de Obra</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Monto ($):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={expenseForm.monto}
                      onChange={(e) => setExpenseForm({...expenseForm, monto: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={expenseForm.descripcion}
                      onChange={(e) => setExpenseForm({...expenseForm, descripcion: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Proveedor:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={expenseForm.proveedor}
                      onChange={(e) => setExpenseForm({...expenseForm, proveedor: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Animal (opcional):</label>
                    <select
                      className="form-control"
                      value={expenseForm.animal_id}
                      onChange={(e) => setExpenseForm({...expenseForm, animal_id: e.target.value})}
                    >
                      <option value="">Gasto general</option>
                      {animals.filter(a => a.estado === 'activo').map(animal => (
                        <option key={animal.id} value={animal.id}>
                          {animal.identificador_unico} - {animal.nombre || 'Sin nombre'} ({animal.categoria})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <button type="submit" className="btn btn-success">
                    {editingId && formType === 'expense' ? '💾 Actualizar Gasto' : '💾 Registrar Gasto'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                    style={{ marginLeft: '10px' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {formType === 'income' && (
            <div>
              <h3>{editingId && formType === 'income' ? '✏️ Editar Ingreso' : '➕ Registrar Ingreso'}</h3>
              <form onSubmit={handleIncomeSubmit}>
                <div className="grid grid-3">
                  <div className="form-group">
                    <label>Fecha:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={incomeForm.fecha}
                      onChange={(e) => setIncomeForm({...incomeForm, fecha: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo:</label>
                    <select
                      className="form-control"
                      value={incomeForm.tipo}
                      onChange={(e) => setIncomeForm({...incomeForm, tipo: e.target.value})}
                    >
                      <option value="venta_animal">Venta de Animal</option>
                      <option value="venta_reproductor">Venta de Reproductor</option>
                      <option value="otros">Otros Ingresos</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Monto ($):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={incomeForm.monto}
                      onChange={(e) => setIncomeForm({...incomeForm, monto: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={incomeForm.descripcion}
                      onChange={(e) => setIncomeForm({...incomeForm, descripcion: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Comprador:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={incomeForm.comprador}
                      onChange={(e) => setIncomeForm({...incomeForm, comprador: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Animal:</label>
                    <select
                      className="form-control"
                      value={incomeForm.animal_id}
                      onChange={(e) => {
                        const animalId = e.target.value;
                        const animal = animals.find(a => a.id.toString() === animalId);
                        setIncomeForm({
                          ...incomeForm, 
                          animal_id: animalId,
                          descripcion: animal ? `Venta de ${animal.identificador_unico}` : ''
                        });
                      }}
                      required={incomeForm.tipo === 'venta_animal'}
                    >
                      <option value="">Seleccionar animal</option>
                      {animals.filter(a => (a.categoria === 'engorde' || a.categoria === 'desarrollo') && a.estado === 'activo').map(animal => (
                        <option key={animal.id} value={animal.id}>
                          {animal.identificador_unico} - {animal.nombre || 'Sin nombre'} ({animal.categoria})
                        </option>
                      ))}
                    </select>
                  </div>
                  {incomeForm.tipo === 'venta_animal' && (
                    <>
                      <div className="form-group">
                        <label>Peso de Venta (kg):</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          value={incomeForm.peso_venta}
                          onChange={(e) => setIncomeForm({...incomeForm, peso_venta: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Precio por kg ($):</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={incomeForm.precio_kg}
                          onChange={(e) => setIncomeForm({...incomeForm, precio_kg: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-success">
                    {editingId && formType === 'income' ? '💾 Actualizar' : '💾 Registrar'} Ingreso
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={resetForms}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Contenido de las tabs */}
      {activeTab === 'summary' && resumen && (
        <div>
          {/* KPIs Financieros */}
          <div className="grid grid-4 mb-3">
            <div className="card text-center">
              <h3 style={{ color: '#dc3545', fontSize: '32px', marginBottom: '10px' }}>
                {formatCurrency(resumen.totales.gastos)}
              </h3>
              <p style={{ color: '#7f8c8d', fontWeight: '500' }}>Total Gastos</p>
            </div>
            <div className="card text-center">
              <h3 style={{ color: '#28a745', fontSize: '32px', marginBottom: '10px' }}>
                {formatCurrency(resumen.totales.ingresos)}
              </h3>
              <p style={{ color: '#7f8c8d', fontWeight: '500' }}>Total Ingresos</p>
            </div>
            <div className="card text-center">
              <h3 style={{ 
                color: resumen.totales.utilidad >= 0 ? '#28a745' : '#dc3545', 
                fontSize: '32px', 
                marginBottom: '10px' 
              }}>
                {formatCurrency(resumen.totales.utilidad)}
              </h3>
              <p style={{ color: '#7f8c8d', fontWeight: '500' }}>Utilidad</p>
            </div>
            <div className="card text-center">
              <h3 style={{ 
                color: parseFloat(resumen.totales.margen) >= 0 ? '#28a745' : '#dc3545', 
                fontSize: '32px', 
                marginBottom: '10px' 
              }}>
                {resumen.totales.margen}%
              </h3>
              <p style={{ color: '#7f8c8d', fontWeight: '500' }}>Margen</p>
            </div>
          </div>

          {/* Desglose por categorías */}
          <div className="grid grid-2">
            <div className="card">
              <h3>Gastos por Categoría</h3>
              {resumen.gastos.length > 0 ? (
                <div>
                  {resumen.gastos.map((gasto, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: index < resumen.gastos.length - 1 ? '1px solid #ecf0f1' : 'none'
                    }}>
                      <span>{gasto.categoria} ({gasto.cantidad})</span>
                      <span style={{ fontWeight: 'bold', color: '#dc3545' }}>
                        {formatCurrency(gasto.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  No hay gastos en el período
                </p>
              )}
            </div>

            <div className="card">
              <h3>Ingresos por Tipo</h3>
              {resumen.ingresos.length > 0 ? (
                <div>
                  {resumen.ingresos.map((ingreso, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: index < resumen.ingresos.length - 1 ? '1px solid #ecf0f1' : 'none'
                    }}>
                      <span>{ingreso.tipo.replace('_', ' ')} ({ingreso.cantidad})</span>
                      <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                        {formatCurrency(ingreso.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  No hay ingresos en el período
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="card">
          <h3>Registro de Gastos ({gastos.length})</h3>
          {gastos.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Proveedor</th>
                  <th>Animal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map(gasto => (
                  <tr key={gasto.id}>
                    <td>{new Date(gasto.fecha).toLocaleDateString()}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6'
                      }}>
                        {gasto.categoria}
                      </span>
                    </td>
                    <td>{gasto.descripcion}</td>
                    <td style={{ fontWeight: 'bold', color: '#dc3545' }}>
                      {formatCurrency(gasto.monto)}
                    </td>
                    <td>{gasto.proveedor || '-'}</td>
                    <td>{gasto.animal_identificador || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          className="btn btn-warning btn-sm" 
                          title="Editar"
                          onClick={() => handleEditExpense(gasto)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          title="Eliminar"
                          onClick={() => handleDeleteExpense(gasto.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📉</div>
              <p>No hay gastos registrados en el período</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'income' && (
        <div className="card">
          <h3>Registro de Ingresos ({ingresos.length})</h3>
          {ingresos.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Comprador</th>
                  <th>Animal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.map(ingreso => (
                  <tr key={ingreso.id}>
                    <td>{new Date(ingreso.fecha).toLocaleDateString()}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: '#d4edda',
                        color: '#155724'
                      }}>
                        {ingreso.tipo.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{ingreso.descripcion}</td>
                    <td style={{ fontWeight: 'bold', color: '#28a745' }}>
                      {formatCurrency(ingreso.monto)}
                    </td>
                    <td>{ingreso.comprador || '-'}</td>
                    <td>{ingreso.animal_identificador || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          className="btn btn-warning btn-sm" 
                          title="Editar"
                          onClick={() => handleEditIncome(ingreso)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          title="Eliminar"
                          onClick={() => handleDeleteIncome(ingreso.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📈</div>
              <p>No hay ingresos registrados en el período</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Finance;