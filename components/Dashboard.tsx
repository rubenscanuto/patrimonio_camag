import React, { useEffect, useState } from 'react';
import { Property, Document, AIConfig } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { generatePortfolioReport } from '../services/geminiService';
import { Sparkles, TrendingUp, AlertCircle, Wallet, Clock, Activity } from 'lucide-react';

interface DashboardProps {
  properties: Property[];
  documents: Document[];
  aiConfig?: AIConfig;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const Dashboard: React.FC<DashboardProps> = ({ properties, documents, aiConfig }) => {
  const [report, setReport] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);

  // Calculate Stats
  const totalValue = properties.reduce((acc, curr) => acc + curr.value, 0);
  const occupiedCount = properties.filter(p => p.status === 'Occupied').length;
  const occupancyRate = properties.length > 0 ? (occupiedCount / properties.length) * 100 : 0;
  const highRiskDocs = documents.filter(d => d.aiAnalysis?.riskLevel === 'High').length;

  const statusData = [
    { name: 'Ocupado', value: occupiedCount },
    { name: 'Vago', value: properties.filter(p => p.status === 'Vacant').length },
    { name: 'Manutenção', value: properties.filter(p => p.status === 'Under Maintenance').length },
  ];

  const handleGenerateReport = async () => {
    if (!aiConfig) {
      alert("Configure uma chave de API nas Configurações primeiro.");
      return;
    }
    setLoadingReport(true);
    const result = await generatePortfolioReport(properties, aiConfig.apiKey, aiConfig.provider, aiConfig.modelName);
    setReport(result);
    setLoadingReport(false);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Visão Geral da Holding</h2>
        <button 
          onClick={handleGenerateReport}
          disabled={loadingReport}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {loadingReport ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Sparkles size={18} />
          )}
          Gerar Relatório IA
        </button>
      </div>

      {/* Report Section */}
      {report && (
        <div className="bg-white border border-indigo-100 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={20} /> Insight Estratégico
          </h3>
          <div className="prose prose-sm text-slate-600 max-w-none" dangerouslySetInnerHTML={{ __html: report }} />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Patrimônio Total</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalValue)}
            </h3>
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <TrendingUp size={12} className="mr-1" /> +2.5% vs ano anterior
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Wallet size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Taxa de Ocupação</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {occupancyRate.toFixed(1)}%
            </h3>
            <p className="text-xs text-slate-400 mt-1">Baseado em {properties.length} unidades</p>
          </div>
           <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Docs de Risco Elevado</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {highRiskDocs}
            </h3>
            <p className="text-xs text-red-500 mt-1">Requerem atenção imediata</p>
          </div>
           <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts Area */}
        <div className="lg:col-span-2 space-y-6">
             {/* Occupancy Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Status dos Imóveis</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asset Value Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Valor por Imóvel (Top 5)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...properties].sort((a,b) => b.value - a.value).slice(0, 5)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="lg:col-span-1">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Activity size={20} className="text-indigo-600" />
                Atividade Recente
              </h3>
              
              <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:h-[90%] before:w-0.5 before:bg-slate-100">
                
                <div className="relative pl-8">
                  <div className="absolute left-1 top-1 w-5 h-5 bg-green-100 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-800">Pagamento de Aluguel</p>
                  <p className="text-xs text-slate-500">Edifício Horizon - Ref. Março</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={10} /> Há 2 horas
                  </p>
                </div>

                <div className="relative pl-8">
                  <div className="absolute left-1 top-1 w-5 h-5 bg-indigo-100 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-800">Novo Contrato Arquivado</p>
                  <p className="text-xs text-slate-500">Analisado por IA: Risco Baixo</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={10} /> Há 5 horas
                  </p>
                </div>

                <div className="relative pl-8">
                  <div className="absolute left-1 top-1 w-5 h-5 bg-yellow-100 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-800">Manutenção Solicitada</p>
                  <p className="text-xs text-slate-500">Vazamento - Res. Villa Verde</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={10} /> Ontem
                  </p>
                </div>
                
                 <div className="relative pl-8">
                  <div className="absolute left-1 top-1 w-5 h-5 bg-slate-100 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-800">Reunião de Equipe</p>
                  <p className="text-xs text-slate-500">Planejamento Trimestral</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={10} /> 2 dias atrás
                  </p>
                </div>

              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;