import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import api from './api'; // Asegúrate de que la ruta sea correcta
import './App.css';

const RundeckForm = () => {
  const [formData, setFormData] = useState({ jobId: '', options: {} });
  const [executionId, setExecutionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [iaasLogs, setIaasLogs] = useState([]);
  const [error, setError] = useState(null);
  const [executions, setExecutions] = useState([]);

  const logsEndRef = useRef(null);

  useEffect(() => {
    const storedExecutions = JSON.parse(localStorage.getItem('executions')) || [];
    setExecutions(filterRecentExecutions(storedExecutions));
  }, []);

  const filterRecentExecutions = (executions) => {
    const now = new Date();
    return executions.filter((exec) => {
      const execDate = new Date(exec.date);
      return (now - execDate) / (1000 * 60 * 60 * 24) <= 15;
    });
  };

  const saveExecution = (jobId, executionId, status) => {
    const newExecution = { jobId, executionId, status, date: new Date().toISOString() };
    const updatedExecutions = filterRecentExecutions([newExecution, ...executions]);

    setExecutions(updatedExecutions);
    localStorage.setItem('executions', JSON.stringify(updatedExecutions));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExecutionId(null);
    setStatus(null);
    setIaasLogs([]);

    try {
      const res = await api.post(`/job/${formData.jobId}/run`, { options: formData.options });
      setExecutionId(res.data.id);
      setStatus('RUNNING');
      saveExecution(formData.jobId, res.data.id, 'RUNNING');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container">
      <div className="form-container">
        <h2>Ejecutar Job en Rundeck</h2>
        <form onSubmit={handleSubmit}>
          <label>ID del Job:</label>
          <input
            type="text"
            name="jobId"
            value={formData.jobId}
            onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
            required
          />
          <button type="submit">Ejecutar Job</button>
        </form>
        {executionId && <p className={`status ${status}`}>{status}</p>}
      </div>

      <div className="logs-container">
        <h3>Mensajes -iaas-</h3>
        <div className="logs">
          {iaasLogs.map((log, index) => (
            <p key={index} className="log-entry">{log}</p>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      <div className="executions-container">
        <h3>Últimas Ejecuciones (15 días)</h3>
        <ul>
          {executions.map((exec, index) => (
            <li key={index} className={`status ${exec.status}`}>
              Job: {exec.jobId} - Estado: {exec.status} - Fecha: {new Date(exec.date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RundeckForm;