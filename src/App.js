import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Calendar, Clock, Download, Filter, Printer, RefreshCw, TrendingUp, Users, Briefcase, Moon, Sun } from 'lucide-react';

// --- Estilos para Impressão (Adicione isso ao seu arquivo CSS principal, como `src/index.css`) ---
/*
@media print {
  body {
    background-color: #ffffff !important;
  }
  #printable-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 20px;
  }
  .no-print {
    display: none !important;
  }
  .bg-gray-800, .bg-gray-900 {
    background-color: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
  }
  h1, h2, h3, p, span, div, text {
    color: #000000 !important;
    fill: #000000 !important;
  }
  .text-transparent {
    -webkit-text-fill-color: initial !important;
  }
  .recharts-surface, .recharts-wrapper {
    width: 100% !important;
    height: auto !important;
    viewBox: none;
  }
}
*/

// --- Componente para Configurar o Horário de Trabalho ---
const WorkHoursConfig = ({ workHours, setWorkHours }) => {
    const daysOfWeek = [
        { id: 1, name: 'Seg' }, { id: 2, name: 'Ter' }, { id: 3, name: 'Qua' },
        { id: 4, name: 'Qui' }, { id: 5, name: 'Sex' }, { id: 6, name: 'Sáb' }, { id: 0, name: 'Dom' }
    ];

    const handleDayToggle = (dayId) => {
        setWorkHours(prev => ({
            ...prev,
            [dayId]: prev[dayId] ? null : { start: '08', end: '18' }
        }));
    };

    const handleTimeChange = (dayId, type, value) => {
        const sanitizedValue = Math.max(0, Math.min(23, parseInt(value, 10) || 0)).toString().padStart(2, '0');
        setWorkHours(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], [type]: sanitizedValue }
        }));
    };

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 space-y-3">
            {daysOfWeek.map(day => (
                <div key={day.id} className="grid grid-cols-3 items-center gap-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id={`day-${day.id}`}
                            checked={!!workHours[day.id]}
                            onChange={() => handleDayToggle(day.id)}
                            className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor={`day-${day.id}`} className="ml-3 text-sm font-medium">{day.name}</label>
                    </div>
                    {workHours[day.id] && (
                        <div className="col-span-2 flex items-center gap-2">
                            <input type="number" min="0" max="23" value={workHours[day.id].start} onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)} className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-center" />
                            <span>às</span>
                            <input type="number" min="0" max="23" value={workHours[day.id].end} onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)} className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-center" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// --- Componente Principal do App ---
const App = () => {
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', type: 'all' });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [workHoursFilter, setWorkHoursFilter] = useState('all');
    const [workHours, setWorkHours] = useState({
        1: { start: '08', end: '18' }, 2: { start: '08', end: '18' }, 3: { start: '08', end: '18' },
        4: { start: '08', end: '18' }, 5: { start: '08', end: '18' }, 6: { start: '08', end: '12' }, 0: null,
    });

    const fetchDataFromApi = () => {
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            const exampleData = Array.from({ length: 500 }, (_, i) => {
                const date = new Date(2025, 6, 1 + Math.floor(i / 25), Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
                return {
                    id: `contact_${i}`, created: date.toISOString(),
                    activity: Math.random() > 0.3 ? 'agendadoia' : 'agendadahumano', source: 'sheets'
                };
            });
            setData(exampleData);
            setIsLoading(false);
        }, 1000);
    };

    useEffect(() => {
        fetchDataFromApi();
    }, []);

    const filteredData = useMemo(() => {
        const isInsideWorkHours = (item) => {
            const dayConfig = workHours[item.dayOfWeek];
            if (!dayConfig) return false;
            const startHour = parseInt(dayConfig.start, 10);
            const endHour = parseInt(dayConfig.end, 10);
            return item.hour >= startHour && item.hour < endHour;
        };

        return data.map(item => ({
            ...item, date: new Date(item.created), hour: new Date(item.created).getHours(),
            dayOfWeek: new Date(item.created).getDay(), type: item.activity.toLowerCase().includes('ia') ? 'IA' : 'Humano'
        })).filter(item => {
            const startDate = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
            const endDate = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;
            if (startDate && item.date < startDate) return false;
            if (endDate && item.date > endDate) return false;
            if (filters.type !== 'all' && item.type !== filters.type) return false;
            if (workHoursFilter === 'inside') return isInsideWorkHours(item);
            if (workHoursFilter === 'outside') return !isInsideWorkHours(item);
            return true;
        });
    }, [data, filters, workHours, workHoursFilter]);

    const metrics = useMemo(() => {
        const total = filteredData.length;
        const ia = filteredData.filter(item => item.type === 'IA').length;
        const humano = total - ia;
        return {
            total, ia, humano,
            iaPercentage: total > 0 ? ((ia / total) * 100).toFixed(1) : 0,
            humanoPercentage: total > 0 ? ((humano / total) * 100).toFixed(1) : 0,
        };
    }, [filteredData]);

    const dailyData = useMemo(() => {
        const grouped = filteredData.reduce((acc, item) => {
            const date = item.date.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = { date, IA: 0, Humano: 0 };
            acc[date][item.type]++;
            return acc;
        }, {});
        return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [filteredData]);

    const hourlyData = useMemo(() => {
        const grouped = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, IA: 0, Humano: 0 }));
        filteredData.forEach(item => grouped[item.hour][item.type]++);
        return grouped;
    }, [filteredData]);

    const weeklyData = useMemo(() => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const grouped = days.map(day => ({ day, IA: 0, Humano: 0 }));
        filteredData.forEach(item => grouped[item.dayOfWeek][item.type]++);
        return grouped;
    }, [filteredData]);

    const pieData = useMemo(() => [
        { name: 'IA', value: metrics.ia, color: '#3b82f6' },
        { name: 'Humano', value: metrics.humano, color: '#10b981' }
    ], [metrics.ia, metrics.humano]);

    const exportData = () => {
        if (filteredData.length === 0) return;
        const csv = filteredData.map(item => ({
            ID: item.id, Data: item.date.toLocaleDateString(), Hora: item.date.toLocaleTimeString(),
            Tipo: item.type, Fonte: item.source
        }));
        const csvContent = "data:text/csv;charset=utf-8," +
            Object.keys(csv[0]).join(",") + "\n" +
            csv.map(row => Object.values(row).map(value => `"${value}"`).join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "agendamentos_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => { window.print(); };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
            <div id="printable-area">
                <div className="mb-8 flex justify-between items-center no-print">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                            Dashboard de Agendamentos
                        </h1>
                        <p className="text-gray-400 text-sm md:text-base">Análise de agendamentos IA vs Humano</p>
                    </div>
                </div>

                {isLoading && <div className="text-center p-8">Carregando dados...</div>}
                {error && <div className="bg-red-800 border-red-700 rounded-lg p-4 mb-6">{error}</div>}

                {!isLoading && !error && (
                    <>
                        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700 no-print">
                            <div className="flex items-center mb-4">
                                <Filter className="h-5 w-5 mr-2 text-blue-400" />
                                <h2 className="text-lg font-semibold">Filtros</h2>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Análise de Expediente</label>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setWorkHoursFilter('all')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${workHoursFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}><Briefcase size={16} /> Todos</button>
                                    <button onClick={() => setWorkHoursFilter('inside')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${workHoursFilter === 'inside' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}><Sun size={16} /> Dentro do Expediente</button>
                                    <button onClick={() => setWorkHoursFilter('outside')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${workHoursFilter === 'outside' ? 'bg-yellow-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}><Moon size={16} /> Fora do Expediente</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Filtros Gerais</label>
                                    <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                        <div>
                                            <label htmlFor="startDate" className="block text-xs font-medium text-gray-400 mb-1">Data de Início</label>
                                            <input id="startDate" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="endDate" className="block text-xs font-medium text-gray-400 mb-1">Data de Fim</label>
                                            <input id="endDate" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="type" className="block text-xs font-medium text-gray-400 mb-1">Tipo de Agendamento</label>
                                            <select id="type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md">
                                                <option value="all">Todos</option><option value="IA">IA</option><option value="Humano">Humano</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Configuração do Horário de Trabalho</label>
                                    <WorkHoursConfig workHours={workHours} setWorkHours={setWorkHours} />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-6 no-print">
                            <button onClick={fetchDataFromApi} disabled={isLoading} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"><RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />{isLoading ? 'Atualizando...' : 'Atualizar'}</button>
                            <button onClick={exportData} disabled={filteredData.length === 0} className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"><Download className="h-4 w-4 mr-2" />Exportar CSV</button>
                            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"><Printer className="h-4 w-4 mr-2" />Imprimir (PDF)</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><Calendar className="h-8 w-8 text-blue-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">Total</p><p className="text-2xl font-bold">{metrics.total}</p></div></div></div>
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><TrendingUp className="h-8 w-8 text-blue-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">IA</p><p className="text-2xl font-bold text-blue-400">{metrics.ia}</p><p className="text-sm text-gray-400">{metrics.iaPercentage}%</p></div></div></div>
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><Users className="h-8 w-8 text-green-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">Humano</p><p className="text-2xl font-bold text-green-400">{metrics.humano}</p><p className="text-sm text-gray-400">{metrics.humanoPercentage}%</p></div></div></div>
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><Clock className="h-8 w-8 text-purple-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">Média Diária</p><p className="text-2xl font-bold text-purple-400">{dailyData.length > 0 ? Math.round(metrics.total / dailyData.length) : 0}</p></div></div></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold mb-4">Evolução Diária</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={dailyData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="date" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /><Legend /><Area type="monotone" dataKey="IA" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} /><Area type="monotone" dataKey="Humano" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} /></AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold mb-4">Distribuição IA vs Humano</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={5} dataKey="value" label>{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Legend /></PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold mb-4">Distribuição por Dia da Semana</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="day" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /><Legend /><Bar dataKey="IA" fill="#3b82f6" /><Bar dataKey="Humano" fill="#10b981" /></BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold mb-4">Distribuição por Horário</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="hour" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /><Legend /><Bar dataKey="IA" fill="#3b82f6" /><Bar dataKey="Humano" fill="#10b981" /></BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default App;