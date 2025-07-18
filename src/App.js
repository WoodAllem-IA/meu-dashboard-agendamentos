import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Clock, Download, Filter, Printer, RefreshCw, TrendingUp, Users, Briefcase, Moon, Sun } from 'lucide-react';

// --- Estilos para Impressão (Coloque no seu CSS) ---
/*
@media print { ... } // Mesmos estilos da resposta anterior
*/

// --- NOVO: Componente para Configurar o Horário de Trabalho ---
const WorkHoursConfig = ({ workHours, setWorkHours }) => {
    const daysOfWeek = [
        { id: 1, name: 'Seg' }, { id: 2, name: 'Ter' }, { id: 3, name: 'Qua' },
        { id: 4, name: 'Qui' }, { id: 5, name: 'Sex' }, { id: 6, name: 'Sáb' }, { id: 0, name: 'Dom' }
    ];

    const handleDayToggle = (dayId) => {
        setWorkHours(prev => ({
            ...prev,
            [dayId]: prev[dayId] ? null : { start: '08', end: '18' } // Adiciona um horário padrão ao ativar
        }));
    };

    const handleTimeChange = (dayId, type, value) => {
        // Garante que o valor esteja entre 0 e 23
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
                            <input type="number" value={workHours[day.id].start} onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)} className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-center" />
                            <span>às</span>
                            <input type="number" value={workHours[day.id].end} onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)} className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded-md text-center" />
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // NOVO: Estado para o filtro de expediente (dentro/fora)
    const [workHoursFilter, setWorkHoursFilter] = useState('all'); // 'all', 'inside', 'outside'

    // NOVO: Estado para a configuração do horário de trabalho
    const [workHours, setWorkHours] = useState({
        1: { start: '08', end: '18' }, // Seg
        2: { start: '08', end: '18' }, // Ter
        3: { start: '08', end: '18' }, // Qua
        4: { start: '08', end: '18' }, // Qui
        5: { start: '08', end: '18' }, // Sex
        6: { start: '08', end: '12' }, // Sáb
        0: null, // Dom (sem expediente)
    });

    // Função para buscar dados (preparada para o backend)
    const fetchDataFromApi = async () => {
        setIsLoading(true);
        setError(null);
        // Simulação de chamada de API para testes locais
        // Remova ou comente esta parte quando o backend estiver pronto
        setTimeout(() => {
            // Dados de exemplo para visualização
            const exampleData = Array.from({ length: 500 }, (_, i) => {
                const date = new Date(2025, 6, 1 + Math.floor(i / 25), Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
                return {
                    id: `contact_${i}`,
                    created: date.toISOString(),
                    activity: Math.random() > 0.3 ? 'agendadoia' : 'agendadahumano',
                    source: 'sheets'
                };
            });
            setData(exampleData);
            setIsLoading(false);
        }, 1000);
        // Descomente a linha abaixo quando o backend estiver no ar
        // await fetch('/api/sheets-data')...
    };

    useEffect(() => {
        fetchDataFromApi();
    }, []);

    // --- LÓGICA DE FILTRAGEM PRINCIPAL (AGORA COM ANÁLISE DE EXPEDIENTE) ---
    const filteredData = useMemo(() => {
        // Função auxiliar para verificar se um agendamento está DENTRO do expediente
        const isInsideWorkHours = (item) => {
            const dayConfig = workHours[item.dayOfWeek];
            if (!dayConfig) return false; // Dia sem expediente

            const startHour = parseInt(dayConfig.start, 10);
            const endHour = parseInt(dayConfig.end, 10);
            
            // A lógica aqui considera que o fim do expediente é o último minuto da hora. Ex: 18h vai até 18:59.
            return item.hour >= startHour && item.hour < endHour;
        };

        return data.map(item => ({
            ...item,
            date: new Date(item.created),
            hour: new Date(item.created).getHours(),
            dayOfWeek: new Date(item.created).getDay(), // 0 = Dom, 1 = Seg, ...
            type: item.activity.toLowerCase().includes('ia') ? 'IA' : 'Humano'
        })).filter(item => {
            // 1. Filtros Globais (Data e Tipo)
            const startDate = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
            const endDate = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;
            if (startDate && item.date < startDate) return false;
            if (endDate && item.date > endDate) return false;
            if (filters.type !== 'all' && item.type !== filters.type) return false;

            // 2. NOVO: Filtro de Expediente
            if (workHoursFilter === 'inside') {
                return isInsideWorkHours(item);
            }
            if (workHoursFilter === 'outside') {
                return !isInsideWorkHours(item);
            }

            // Se o filtro for 'all', não aplica filtro de expediente
            return true;
        });
    }, [data, filters, workHours, workHoursFilter]);

    // O resto do código para métricas e gráficos permanece o mesmo,
    // pois eles já são reativos a `filteredData`.
    const metrics = useMemo(() => { /* ... */ }, [filteredData]);
    const dailyData = useMemo(() => { /* ... */ }, [filteredData]);
    const hourlyData = useMemo(() => { /* ... */ }, [filteredData]);
    const weeklyData = useMemo(() => { /* ... */ }, [filteredData]);
    const pieData = useMemo(() => { /* ... */ }, [metrics]);
    const exportData = () => { /* ... */ };
    const handlePrint = () => { window.print(); };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div id="printable-area">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center no-print">
                    {/* ... Header ... */}
                </div>

                {/* Status Bar */}
                {isLoading && <div className="bg-blue-800 ...">Carregando dados...</div>}
                {error && <div className="bg-red-800 ...">{error}</div>}

                {/* Filters Section */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700 no-print">
                    <div className="flex items-center mb-4">
                        <Filter className="h-5 w-5 mr-2 text-blue-400" />
                        <h2 className="text-lg font-semibold">Filtros</h2>
                    </div>

                    {/* --- NOVOS BOTÕES DE FILTRO RÁPIDO --- */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Análise de Expediente</label>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setWorkHoursFilter('all')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${workHoursFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                <Briefcase size={16} /> Todos
                            </button>
                            <button onClick={() => setWorkHoursFilter('inside')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${workHoursFilter === 'inside' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                <Sun size={16} /> Dentro do Expediente
                            </button>
                            <button onClick={() => setWorkHoursFilter('outside')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${workHoursFilter === 'outside' ? 'bg-yellow-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                <Moon size={16} /> Fora do Expediente
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Coluna 1: Filtros Gerais */}
                        <div className="space-y-4">
                            <div>
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
                                            <option value="all">Todos</option>
                                            <option value="IA">IA</option>
                                            <option value="Humano">Humano</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna 2: Configuração de Horário */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Configuração do Horário de Trabalho</label>
                            <WorkHoursConfig workHours={workHours} setWorkHours={setWorkHours} />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6 no-print">
                    {/* ... Botões de Ação (Atualizar, Exportar, Imprimir) ... */}
                </div>

                {/* Cards & Charts */}
                {/* ... Seus cards e gráficos aqui (sem alterações) ... */}
            </div>
        </div>
    );
};

export default App;