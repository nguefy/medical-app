import { useState, useEffect } from 'react';
import { api } from './api';
import './App.css';

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(username, password);
      localStorage.setItem('token', token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Connexion</h2>
      {error && <p className="error">{error}</p>}
      <label>
        Nom d'utilisateur
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label>
        Mot de passe
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}

function PatientForm({ onCreated }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: '', phone: '', email: '', bloodType: '', allergies: '',
  });
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createPatient(form);
      setForm({ firstName: '', lastName: '', dateOfBirth: '', gender: '', phone: '', email: '', bloodType: '', allergies: '' });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Ajouter un patient</h3>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        <label>
          Prénom
          <input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
        </label>
        <label>
          Nom
          <input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
        </label>
        <label>
          Date de naissance
          <input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} required />
        </label>
        <label>
          Genre
          <input value={form.gender} onChange={(e) => update('gender', e.target.value)} />
        </label>
        <label>
          Téléphone
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </label>
        <label>
          Groupe sanguin
          <input value={form.bloodType} onChange={(e) => update('bloodType', e.target.value)} placeholder="A+, O-, ..." />
        </label>
        <label>
          Allergies
          <input value={form.allergies} onChange={(e) => update('allergies', e.target.value)} />
        </label>
      </div>
      <button type="submit">Ajouter</button>
    </form>
  );
}

function PatientList({ patients, onDelete }) {
  if (patients.length === 0) {
    return <p>Aucun patient enregistré pour l'instant.</p>;
  }
  return (
    <table className="patients-table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Date de naissance</th>
          <th>Téléphone</th>
          <th>Groupe sanguin</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {patients.map((p) => (
          <tr key={p.id}>
            <td>{p.first_name} {p.last_name}</td>
            <td>{new Date(p.date_of_birth).toLocaleDateString()}</td>
            <td>{p.phone || '—'}</td>
            <td>{p.blood_type || '—'}</td>
            <td>
              <button className="danger" onClick={() => onDelete(p.id)}>Supprimer</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Dashboard({ onLogout }) {
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');

  async function loadPatients() {
    try {
      const data = await api.getPatients();
      setPatients(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function handleDelete(id) {
    try {
      await api.deletePatient(id);
      loadPatients();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="topbar">
        <h1>Gestion des patients</h1>
        <button onClick={onLogout}>Se déconnecter</button>
      </header>
      {error && <p className="error">{error}</p>}
      <PatientForm onCreated={loadPatients} />
      <PatientList patients={patients} onDelete={handleDelete} />
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  function handleLogout() {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  }

  return (
    <div className="app">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;
