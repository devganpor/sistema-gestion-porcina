import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
  sexo: string;
  categoria: string;
  madre_id?: number;
  padre_id?: number;
}

const Genealogy: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<number | null>(null);
  const [genealogyTree, setGenealogyTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnimals();
  }, []);

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

  const loadGenealogyTree = async (animalId: number) => {
    try {
      const response = await api.get(`/genealogy/${animalId}`);
      setGenealogyTree(response.data);
    } catch (error) {
      console.error('Error cargando genealogía:', error);
    }
  };

  const handleAnimalSelect = (animalId: number) => {
    setSelectedAnimal(animalId);
    loadGenealogyTree(animalId);
  };

  if (loading) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando datos genealógicos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">
            <i className="fas fa-dna" style={{ marginRight: '10px' }}></i>
            Genealogía y Genética
          </h4>
        </div>

        <div style={{ padding: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            {/* Lista de Animales */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
                  Seleccionar Animal
                </h5>
              </div>
              <div style={{ padding: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                {animals.map(animal => (
                  <div
                    key={animal.id}
                    onClick={() => handleAnimalSelect(animal.id)}
                    style={{
                      padding: '10px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedAnimal === animal.id ? '#1572e8' : '#f8f9fa',
                      color: selectedAnimal === animal.id ? '#ffffff' : '#1a2035',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontWeight: '600' }}>{animal.identificador_unico}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      {animal.nombre || 'Sin nombre'} - {animal.sexo} - {animal.categoria}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Árbol Genealógico */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-sitemap" style={{ marginRight: '8px' }}></i>
                  Árbol Genealógico
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                {selectedAnimal ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      background: '#1572e8',
                      color: '#ffffff',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      display: 'inline-block'
                    }}>
                      <div style={{ fontWeight: '700', fontSize: '16px' }}>
                        {animals.find(a => a.id === selectedAnimal)?.identificador_unico}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Animal Seleccionado</div>
                    </div>

                    {/* Padres */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                      <div style={{
                        background: '#f25961',
                        color: '#ffffff',
                        padding: '12px',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontWeight: '600' }}>Madre</div>
                        <div style={{ fontSize: '14px' }}>
                          {animals.find(a => a.id === animals.find(animal => animal.id === selectedAnimal)?.madre_id)?.identificador_unico || 'No registrada'}
                        </div>
                      </div>
                      <div style={{
                        background: '#31ce36',
                        color: '#ffffff',
                        padding: '12px',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontWeight: '600' }}>Padre</div>
                        <div style={{ fontSize: '14px' }}>
                          {animals.find(a => a.id === animals.find(animal => animal.id === selectedAnimal)?.padre_id)?.identificador_unico || 'No registrado'}
                        </div>
                      </div>
                    </div>

                    {/* Descendientes */}
                    <div className="card" style={{ background: '#f8f9fa' }}>
                      <div style={{ padding: '15px' }}>
                        <h6 style={{ color: '#1a2035', marginBottom: '10px' }}>
                          <i className="fas fa-baby" style={{ marginRight: '8px' }}></i>
                          Descendientes
                        </h6>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                          {animals.filter(a => a.madre_id === selectedAnimal || a.padre_id === selectedAnimal).map(descendant => (
                            <div
                              key={descendant.id}
                              style={{
                                background: '#ffffff',
                                padding: '8px',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontSize: '12px'
                              }}
                            >
                              <div style={{ fontWeight: '600', color: '#1a2035' }}>{descendant.identificador_unico}</div>
                              <div style={{ color: '#6c757d' }}>{descendant.sexo}</div>
                            </div>
                          ))}
                        </div>
                        {animals.filter(a => a.madre_id === selectedAnimal || a.padre_id === selectedAnimal).length === 0 && (
                          <p style={{ color: '#6c757d', textAlign: 'center', margin: 0 }}>Sin descendientes registrados</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <i className="fas fa-dna" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                    <h5>Selecciona un animal</h5>
                    <p>Elige un animal de la lista para ver su árbol genealógico</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Estadísticas Genéticas */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="fas fa-chart-bar" style={{ marginRight: '8px' }}></i>
                Estadísticas Genéticas
              </h5>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1572e8' }}>
                    {animals.filter(a => a.categoria === 'reproductor').length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>REPRODUCTORES ACTIVOS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#31ce36' }}>
                    {animals.filter(a => a.madre_id || a.padre_id).length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>CON GENEALOGÍA</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffad46' }}>
                    {new Set(animals.map(a => a.madre_id).filter(Boolean)).size}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>MADRES ÚNICAS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#f25961' }}>
                    {new Set(animals.map(a => a.padre_id).filter(Boolean)).size}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>PADRES ÚNICOS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Genealogy;