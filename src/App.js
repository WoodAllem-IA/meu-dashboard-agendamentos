import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, CheckCircle, Clock, Download, Filter, PlusCircle, RefreshCw, Settings, Trash2, TrendingUp, Users } from 'lucide-react';

// Dados simulados para exibição inicial (MOVIDO PARA FORA DO COMPONENTE)
const mockData = [
    { id: 'W', created: '2025-07-12T20:29:56', activity: 'agendadahumano', source: 'whatsapp' },
    { id: 'Kuka', created: '2025-07-12T20:20:00', activity: 'agendadahumano', source: 'whatsapp' },
    { id: 'Maiane', created: '2025-07-12T16:08:12', activity: 'agendadoia', source: 'whatsapp' },
    { id: 'Eduarda', created: '2025-07-12T14:32:04', activity: 'agendadoia', source: 'whatsapp' },
    { id: 'Sirlene', created: '2025-07-12T14:00:30', activity: 'agendadoia', source: 'whatsapp' },
    { id: 'Rol', created: '2025-07-12T16:17:42', activity: 'agendadoia', source: 'whatsapp' },
    // Adicione mais dados simulados se desejar para testar os filtros
    { id: 'TestIA_Manha_Seg', created: '2025-07-14T09:30:00', activity: 'agendadoia', source: 'test' }, // Segunda, Manhã
    { id: 'TestHumano_Noite_Sab', created: '2025-07-12T20:00:00', activity: 'agendadahumano', source: 'test' }, // Sábado, Noite
    { id: 'TestIA_Tarde_Ter', created: '2025-07-15T14:00:00', activity: 'agendadoia', source: 'test' }, // Terça, Tarde
    { id: 'TestHumano_Noite_Dom', created: '2025-07-13T01:00:00', activity: 'agendadahumano', source: 'test' }, // Domingo, Madrugada (Noite)
    { id: 'TestIA_Comercial_Qui', created: '2025-07-17T10:00:00', activity: 'agendadoia', source: 'test' }, // Quinta, Horário Comercial
    { id: 'TestHumano_ForaComercial_Sex', created: '2025-07-18T05:00:00', activity: 'agendadahumano', source: 'test' }, // Sexta, Fora do Horário Comercial (Manhã cedo)
    { id: 'TestIA_ForaComercial_Qua', created: '2025-07-16T19:00:00', activity: 'agendadoia', source: 'test' }, // Quarta, Fora do Horário Comercial (Noite)
];

// --- Componente para um único Grupo de Filtro (NOVO) ---
const FilterRuleGroup = ({ rule, index, updateRule, removeRule }) => {
    const daysOfWeek = [
        { id: 1, name: 'Seg' }, { id: 2, name: 'Ter' }, { id: 3, name: 'Qua' },
        { id: 4, name: 'Qui' }, { id: 5, name: 'Sex' }, { id: 6, name: 'Sáb' }, { id: 0, name: 'Dom' }
    ];

    const handleDayChange = (dayId) => {
        const newDays = rule.daysOfWeek.includes(dayId)
            ? rule.daysOfWeek.filter(d => d !== dayId)
            : [...rule.daysOfWeek, dayId];
        updateRule(index, { ...rule, daysOfWeek: newDays });
    };

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 relative">
            <button onClick={() => removeRule(index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 size={18} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Dias da Semana</label>
                    <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map(day => (
                            <button key={day.id} onClick={() => handleDayChange(day.id)}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${rule.daysOfWeek.includes(day.id) ? 'bg-indigo-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                {day.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Horário (0-23h)</label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" max="23" value={rule.startTime} onChange={(e) => updateRule(index, { ...rule, startTime: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md" placeholder="Início" />
                        <span>às</span>
                        <input type="number" min="0" max="23" value={rule.endTime} onChange={(e) => updateRule(index, { ...rule, endTime: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md" placeholder="Fim" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal do App ---
const App = () => {
    const [data, setData] = useState(mockData); // Inicializa com mockData
    // Estado dos filtros agora é um ARRAY de regras
    const [filterRules, setFilterRules] = useState([]);
    const [globalFilters, setGlobalFilters] = useState({ startDate: '', endDate: '', type: 'all' });
    
    const [isLoading, setIsLoading] = useState(false);
    const [showConfig, setShowConfig] = useState(true);
    const [config, setConfig] = useState(() => {
        // Tenta carregar a configuração salva do localStorage
        const savedConfig = localStorage.getItem('dashboardConfig');
        if (savedConfig) {
            return JSON.parse(savedConfig);
        }
        // Se não houver configuração salva, usa os valores padrão, incluindo o Spreadsheet ID
        return {
            clientId: '43176476138-fc1su71bb11vfjofap8pvrs6srftd7a0.apps.googleusercontent.com',
            spreadsheetId: '1rTeyXyOBe1CfjOPB2hrCjSuob1E9VeYuoJvnMOWD4u4', // ID da planilha pré-preenchido
            sheetName: 'entrada'
        };
    });
    const [authStatus, setAuthStatus] = useState('not_authenticated');
    const [tokenClient, setTokenClient] = useState(null); // Mantido, mas não usado diretamente na lógica final

    // Funções para gerenciar as regras de filtro
    const addFilterRule = () => {
        setFilterRules([...filterRules, { daysOfWeek: [], startTime: '', endTime: '' }]);
    };
    const updateFilterRule = (index, updatedRule) => {
        const newRules = [...filterRules];
        newRules[index] = updatedRule;
        setFilterRules(newRules);
    };
    const removeFilterRule = (index) => {
        setFilterRules(filterRules.filter((_, i) => i !== index));
    };

    // Carrega os scripts do Google (GSI para auth, GAPI para Sheets API)
    useEffect(() => {
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true;
        document.head.appendChild(gsiScript );

        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = ( ) => window.gapi.load('client', () => {});
        document.head.appendChild(gapiScript);
    }, []);

    // Função para inicializar e autenticar com o Google
    const initializeAndSignIn = async () => {
        if (!window.google || !window.gapi) {
            alert("As bibliotecas do Google ainda não carregaram. Tente novamente em alguns segundos.");
            return;
        }
        if (!config.clientId || !config.spreadsheetId) {
            alert('Por favor, preencha o Client ID e o ID da Planilha!');
            return;
        }

        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: config.clientId,
                scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
                callback: async (tokenResponse ) => {
                    if (tokenResponse.error) {
                        throw new Error(tokenResponse.error);
                    }
                    setAuthStatus('authenticated');
                    setShowConfig(false);
                    await window.gapi.client.init({});
                    fetchDataFromSheets();
                },
            });
            client.requestAccessToken();
        } catch (error) {
            console.error('Erro na autenticação ou inicialização:', error);
            setAuthStatus('error');
            alert('Erro na autenticação: ' + error.message);
        }
    };

    // Função para buscar dados da planilha
    const fetchDataFromSheets = async () => {
        setIsLoading(true);
        try {
            await window.gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4' );
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: config.spreadsheetId,
                range: `${config.sheetName}!A:C`,
            });

            const rows = response.result.values;
            if (rows && rows.length > 1) {
                const processedData = rows.slice(1).map((row, index) => {
                    const [contactId, created, lastActivity] = row;
                    if (!lastActivity || !created) return null;

                    const activityLower = lastActivity.toLowerCase();
                    const isIA = activityLower.includes('agendadoia') || activityLower.includes('agendamento ia');
                    const isHumano = activityLower.includes('agendadahumano') || activityLower.includes('agendamento humano');

                    if (isIA || isHumano) {
                        return {
                            id: contactId || `contact_${index}`,
                            created: created,
                            activity: isIA ? 'agendadoia' : 'agendadahumano',
                            source: 'sheets'
                        };
                    }
                    return null;
                }).filter(Boolean);
                setData(processedData);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            setAuthStatus('error');
            alert('Erro ao buscar dados da planilha. Verifique o ID da planilha e as permissões.');
        } finally {
            setIsLoading(false);
        }
    };

    // Efeito para configurar a auto-atualização
    useEffect(() => {
        let intervalId;
        // Só configura o intervalo se estiver autenticado e configurado
        if (authStatus === 'authenticated' && config.spreadsheetId && window.gapi?.client?.sheets) {
            // Limpa qualquer intervalo existente para evitar duplicação
            if (intervalId) clearInterval(intervalId); 
            
            intervalId = setInterval(() => {
                console.log('Atualizando dados automaticamente...');
                fetchDataFromSheets();
            }, 300000); // 300000 ms = 5 minutos
        } else {
            // Se não estiver autenticado/configurado, limpa o intervalo
            if (intervalId) clearInterval(intervalId);
        }

        // Limpa o intervalo quando o componente é desmontado ou as dependências mudam
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [authStatus, config.spreadsheetId]); // Dependências: re-executa se status de auth ou ID da planilha mudar


    // Processamento e filtragem dos dados
    const filteredData = useMemo(() => {
        return data.map(item => ({
            ...item,
            date: new Date(item.created),
            hour: new Date(item.created).getHours(),
            dayOfWeek: new Date(item.created).getDay(), // 0 = Dom, 1 = Seg, ..., 6 = Sáb
            type: item.activity.toLowerCase().includes('ia') ? 'IA' : 'Humano'
        })).filter(item => {
            // Filtros Globais (Data e Tipo)
            const startDate = globalFilters.startDate ? new Date(globalFilters.startDate + 'T00:00:00') : null;
            const endDate = globalFilters.endDate ? new Date(globalFilters.endDate + 'T23:59:59') : null;
            if (startDate && item.date < startDate) return false;
            if (endDate && item.date > endDate) return false;
            if (globalFilters.type !== 'all' && item.type !== globalFilters.type) return false;

            // Se não houver regras de filtro de horário/dia, passa tudo.
            if (filterRules.length === 0) return true;

            // Verifica se o item corresponde a PELO MENOS UMA das regras
            return filterRules.some(rule => {
                const { daysOfWeek, startTime: rawStartTime, endTime: rawEndTime } = rule;

                // Se a regra não tiver dias selecionados, ela não se aplica
                if (daysOfWeek.length === 0) return false;
                if (!daysOfWeek.includes(item.dayOfWeek)) return false;

                const startTime = rawStartTime !== '' ? parseInt(rawStartTime, 10) : null;
                const endTime = rawEndTime !== '' ? parseInt(rawEndTime, 10) : null;

                // Se a regra não tiver horário, mas o dia bateu, é válida (dia todo)
                if (startTime === null || endTime === null) return true;

                if (startTime <= endTime) { // Caso normal (ex: 8-18)
                    return item.hour >= startTime && item.hour <= endTime;
                } else { // Caso invertido (ex: 18-08)
                    return item.hour >= startTime || item.hour <= endTime;
                }
            });
        });
    }, [data, globalFilters, filterRules]);

    // Métricas principais
    const metrics = useMemo(() => {
        const total = filteredData.length;
        const ia = filteredData.filter(item => item.type === 'IA').length;
        const humano = total - ia;
        return {
            total,
            ia,
            humano,
            iaPercentage: total > 0 ? ((ia / total) * 100).toFixed(1) : 0,
            humanoPercentage: total > 0 ? ((humano / total) * 100).toFixed(1) : 0,
        };
    }, [filteredData]);

    // Dados para gráficos
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

    const pieData = [
        { name: 'IA', value: metrics.ia, color: '#3b82f6' },
        { name: 'Humano', value: metrics.humano, color: '#10b981' }
    ];

    const exportData = () => {
        const csv = filteredData.map(item => ({
            ID: item.id,
            Data: item.date.toLocaleDateString(),
            Hora: item.date.toLocaleTimeString(),
            Tipo: item.type,
            Fonte: item.source
        }));
        const csvContent = "data:text/csv;charset=utf-8," +
            Object.keys(csv[0]).join(",") + "\n" +
            csv.map(row => Object.values(row).map(value => `"${value}"`).join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "agendamentos_export.csv");
        link.click();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                            Dashboard de Agendamentos
                        </h1>
                        <p className="text-gray-400">Análise de agendamentos IA vs Humano</p>
                    </div>
                    <button onClick={() => setShowConfig(!showConfig)} className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuração
                    </button>
                </div>

                {/* Config Section */}
                {showConfig && (
                    <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                        <h2 className="text-lg font-semibold mb-4 text-blue-300">Configuração da API</h2>
                        <div className="space-y-4">
                            <input id="spreadsheetId" type="text" value={config.spreadsheetId} onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" placeholder="ID da Planilha"/>
                            <input id="sheetName" type="text" value={config.sheetName} onChange={(e) => setConfig({ ...config, sheetName: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" placeholder="Nome da Aba"/>
                            <button onClick={initializeAndSignIn} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Conectar e Carregar Dados
                            </button>
                        </div>
                    </div>
                )}

                {/* Status Bar */}
                {!showConfig && (
                    <div className={`rounded-lg p-4 mb-6 border flex items-center justify-between ${authStatus === 'authenticated' ? 'bg-green-800 border-green-700' : 'bg-red-800 border-red-700'}`}>
                        <p>{authStatus === 'authenticated' ? 'Conectado!' : 'Erro na conexão.'}</p>
                        {/* Adicionado o botão para Configurar / Autenticar quando não está conectado */}
                        {authStatus !== 'authenticated' && (
                            <button
                                onClick={() => setShowConfig(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                            >
                                Configurar / Autenticar
                            </button>
                        )}
                    </div>
                )}

                {/* Filters Section */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                    <div className="flex items-center mb-4">
                        <Filter className="h-5 w-5 mr-2 text-blue-400" />
                        <h2 className="text-lg font-semibold">Filtros</h2>
                    </div>
                    {/* Global Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <input type="date" value={globalFilters.startDate} onChange={(e) => setGlobalFilters({ ...globalFilters, startDate: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                        <input type="date" value={globalFilters.endDate} onChange={(e) => setGlobalFilters({ ...globalFilters, endDate: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                        <select value={globalFilters.type} onChange={(e) => setGlobalFilters({ ...globalFilters, type: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md">
                            <option value="all">Todos os Tipos</option>
                            <option value="IA">IA</option>
                            <option value="Humano">Humano</option>
                        </select>
                    </div>
                    {/* Filter Rules */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-gray-400">Regras de Horário (o agendamento deve corresponder a pelo menos uma regra)</label>
                        {filterRules.map((rule, index) => (
                            <FilterRuleGroup key={index} index={index} rule={rule} updateRule={updateFilterRule} removeRule={removeRule} />
                        ))}
                        <button onClick={addFilterRule} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
                            <PlusCircle size={16} />
                            Adicionar Regra de Horário
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                    <button onClick={fetchDataFromSheets} disabled={isLoading || authStatus !== 'authenticated'} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Atualizando...' : 'Atualizar Dados'}
                    </button>
                    <button onClick={exportData} className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                    </button>
                </div>

                {/* Cards & Charts */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><Calendar className="h-8 w-8 text-blue-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">Total</p><p className="text-2xl font-bold">{metrics.total}</p></div></div></div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><TrendingUp className="h-8 w-8 text-blue-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">IA</p><p className="text-2xl font-bold text-blue-400">{metrics.ia}</p><p className="text-sm text-gray-400">{metrics.iaPercentage}%</p></div></div></div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><Users className="h-8 w-8 text-green-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">Humano</p><p className="text-2xl font-bold text-green-400">{metrics.humano}</p><p className="text-sm text-gray-400">{metrics.humanoPercentage}%</p></div></div></div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><div className="flex items-center"><Clock className="h-8 w-8 text-purple-400 mr-3" /><div><p className="text-sm font-medium text-gray-400">Média Diária</p><p className="text-2xl font-bold text-purple-400">{dailyData.length > 0 ? Math.round(metrics.total / dailyData.length) : 0}</p></div></div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">Evolução Diária</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={dailyData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="date" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /><Area type="monotone" dataKey="IA" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} /><Area type="monotone" dataKey="Humano" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} /></AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">Distribuição IA vs Humano</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={5} dataKey="value">{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /></PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-4"><div className="flex items-center"><div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div><span>IA ({metrics.ia})</span></div><div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div><span>Humano ({metrics.humano})</span></div></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">Distribuição por Dia da Semana</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="day" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /><Bar dataKey="IA" fill="#3b82f6" /><Bar dataKey="Humano" fill="#10b981" /></BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">Distribuição por Horário</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="hour" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} /><Bar dataKey="IA" fill="#3b82f6" /><Bar dataKey="Humano" fill="#10b981" /></BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;