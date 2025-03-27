import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import "./App.css";

const RundeckForm = () => {
    const [formData, setFormData] = useState({ jobId: "", options: {} });
    const [executionId, setExecutionId] = useState(null);
    const [status, setStatus] = useState(null);
    const [iaasLogs, setIaasLogs] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isStopping, setIsStopping] = useState(false);

    const RUNDECK_API_URL = "https://tu-rundeck.com/api/41";
    const RUNDECK_TOKEN = "TU_API_TOKEN";

    const logsEndRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({ ...prevState, [name]: value }));
    };

    const handleOptionChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            options: { ...prevState.options, [name]: value },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setExecutionId(null);
        setStatus(null);
        setIaasLogs([]);
        setIsLoading(true);
        setIsStopping(false);

        try {
            const res = await fetch(`${RUNDECK_API_URL}/job/${formData.jobId}/run`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Rundeck-Auth-Token": RUNDECK_TOKEN,
                },
                body: JSON.stringify({ options: formData.options }),
            });

            if (!res.ok) throw new Error(`Error al ejecutar el job: ${res.statusText}`);

            const data = await res.json();
            setExecutionId(data.id);
            setStatus("RUNNING");
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleStopExecution = async () => {
        if (!executionId) return;

        const result = await Swal.fire({
            title: "¿Estás seguro?",
            text: "Esta acción detendrá la ejecución del job en Rundeck.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sí, detener",
            cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;

        setIsStopping(true);
        setError(null);

        try {
            const res = await fetch(`${RUNDECK_API_URL}/execution/${executionId}`, {
                method: "DELETE",
                headers: { "X-Rundeck-Auth-Token": RUNDECK_TOKEN },
            });

            if (!res.ok) throw new Error(`Error al detener el job: ${res.statusText}`);

            setStatus("ABORTED");
            setIsLoading(false);
            setIsStopping(false);

            Swal.fire({
                title: "Job detenido",
                text: "El job ha sido cancelado exitosamente.",
                icon: "success",
            });
        } catch (err) {
            setError(err.message);
            setIsStopping(false);
            Swal.fire({
                title: "Error",
                text: "No se pudo detener el job.",
                icon: "error",
            });
        }
    };

    useEffect(() => {
        if (!executionId) return;

        const interval = setInterval(async () => {
            try {
                const statusRes = await fetch(`${RUNDECK_API_URL}/execution/${executionId}`, {
                    headers: { "X-Rundeck-Auth-Token": RUNDECK_TOKEN },
                });

                if (!statusRes.ok) throw new Error("Error al obtener el estado del job");

                const statusData = await statusRes.json();
                setStatus(statusData.status);

                const logRes = await fetch(`${RUNDECK_API_URL}/execution/${executionId}/output`, {
                    headers: { "X-Rundeck-Auth-Token": RUNDECK_TOKEN },
                });

                if (!logRes.ok) throw new Error("Error al obtener logs");

                const logData = await logRes.json();

                if (logData.entries) {
                    const filteredLogs = logData.entries
                        .map((entry) => entry.log)
                        .filter((log) => log.includes("-iaas-"));

                    setIaasLogs(filteredLogs);
                }

                if (statusData.status !== "RUNNING") {
                    clearInterval(interval);
                    setIsLoading(false);
                }
            } catch (err) {
                setError(err.message);
                clearInterval(interval);
                setIsLoading(false);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [executionId]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [iaasLogs]);

    return (
        <div className="container">
            <div className="form-container">
                <h2>Ejecutar Job en Rundeck</h2>
                <form onSubmit={handleSubmit}>
                    <label>ID del Job:</label>
                    <input type="text" name="jobId" value={formData.jobId} onChange={handleChange} required />

                    <label>Opción 1:</label>
                    <input type="text" name="option1" onChange={handleOptionChange} />

                    <label>Opción 2:</label>
                    <input type="text" name="option2" onChange={handleOptionChange} />

                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Ejecutando..." : "Ejecutar Job"}
                    </button>
                </form>

                {executionId && <p className={`status ${status}`}>{status}</p>}
                {executionId && status === "RUNNING" && (
                    <button onClick={handleStopExecution} disabled={isStopping}>
                        {isStopping ? "Deteniendo..." : "Detener Job"}
                    </button>
                )}
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
        </div>
    );
};

export default RundeckForm;