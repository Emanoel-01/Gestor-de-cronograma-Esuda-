'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Download, 
  MessageCircle, 
  Filter, 
  Search, 
  Clock, 
  BookOpen, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Monta o link https://wa.me/55DDDNUMERO?text=... com o telefone do lead
 * e mensagem inicial pré-formatada para facilitar o primeiro contato da equipe.
 */
function buildWhatsAppLink(
  phone: string | undefined, 
  nome: string, 
  cursoInteresse: string, 
  material?: string
): string {
  let digits = (phone || '').replace(/\D/g, '');
  
  if (!digits) {
    return 'https://wa.me/5581991298803';
  }

  if (!digits.startsWith('55') || digits.length <= 11) {
    digits = `55${digits}`;
  }

  const mensagemInicial = `Olá, ${nome}! Sou da equipe de Pós-Graduação da Faculdade ESUDA. Vimos seu interesse no curso de ${cursoInteresse || 'Pós-Graduação'} (${material || 'material acadêmico'}). Como podemos te ajudar?`;
  
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagemInicial)}`;
}

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cursoInteresse: string;
  origem?: string;
  comoConheceu?: string;
  consentimento?: boolean;
  consentimentoEm?: any;
  criadoEm?: any;
  status: 'novo' | 'em contato' | 'matriculado' | 'descartado' | string;
}

interface LeadsManagerProps {
  courses?: any[];
}

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'em contato', label: 'Em Contato', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'matriculado', label: 'Matriculado', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'descartado', label: 'Descartado', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' }
];

export function LeadsManager({ courses = [] }: LeadsManagerProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Filtros
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Escutar leads do Firestore em tempo real
  useEffect(() => {
    setLoading(true);
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, orderBy('criadoEm', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Lead[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          nome: data.nome || 'Sem nome',
          email: data.email || '',
          telefone: data.telefone || '',
          cursoInteresse: data.cursoInteresse || 'Não informado',
          origem: data.origem || 'Material acadêmico',
          comoConheceu: data.comoConheceu || 'Não informado',
          consentimento: data.consentimento,
          consentimentoEm: data.consentimentoEm,
          criadoEm: data.criadoEm,
          status: data.status || 'novo'
        });
      });
      setLeads(items);
      setLoading(false);
    }, (error) => {
      console.warn('Erro ao carregar leads com orderBy, tentando query direta:', error);
      // Fallback sem ordenação caso o índice ainda esteja sincronizando
      onSnapshot(leadsRef, (fallbackSnap) => {
        const items: Lead[] = [];
        fallbackSnap.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            nome: data.nome || 'Sem nome',
            email: data.email || '',
            telefone: data.telefone || '',
            cursoInteresse: data.cursoInteresse || 'Não informado',
            origem: data.origem || 'Material acadêmico',
            comoConheceu: data.comoConheceu || 'Não informado',
            consentimento: data.consentimento,
            consentimentoEm: data.consentimentoEm,
            criadoEm: data.criadoEm,
            status: data.status || 'novo'
          });
        });
        // Ordenar localmente
        items.sort((a, b) => {
          const tA = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
          const tB = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
          return tB - tA;
        });
        setLeads(items);
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  // Formatação de data
  const formatDate = (val: any) => {
    if (!val) return 'Data recente';
    try {
      const date = val.toDate ? val.toDate() : new Date(val);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Três métricas do topo conforme o prompt:
  // 1. Total de leads
  // 2. Leads dos últimos 7 dias
  // 3. Qual curso puxou mais
  const metrics = useMemo(() => {
    const total = leads.length;
    const now = Date.now();
    const seteDiasAtras = now - 7 * 24 * 60 * 60 * 1000;

    let ultimos7Dias = 0;
    const contagemCursos: Record<string, number> = {};

    leads.forEach((l) => {
      const timestamp = l.criadoEm?.toDate ? l.criadoEm.toDate().getTime() : (l.criadoEm ? new Date(l.criadoEm).getTime() : 0);
      if (timestamp >= seteDiasAtras) {
        ultimos7Dias += 1;
      }

      const curso = l.cursoInteresse?.trim() || 'Outro';
      contagemCursos[curso] = (contagemCursos[curso] || 0) + 1;
    });

    let cursoMaisPopular = '—';
    let maxContagem = 0;

    Object.entries(contagemCursos).forEach(([curso, count]) => {
      if (count > maxContagem) {
        maxContagem = count;
        cursoMaisPopular = `${curso} (${count})`;
      }
    });

    return {
      total,
      ultimos7Dias,
      cursoMaisPopular
    };
  }, [leads]);

  // Lista de cursos distintos para o filtro
  const distinctCourses = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    leads.forEach((l) => {
      if (l.cursoInteresse) set.add(l.cursoInteresse);
    });
    return Array.from(set).sort();
  }, [courses, leads]);

  // Leads filtrados
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Filtro por curso
      if (selectedCourse !== 'all' && lead.cursoInteresse !== selectedCourse) {
        return false;
      }
      // Filtro por status
      if (selectedStatus !== 'all' && lead.status !== selectedStatus) {
        return false;
      }
      // Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNome = lead.nome.toLowerCase().includes(term);
        const matchEmail = lead.email.toLowerCase().includes(term);
        const matchTel = (lead.telefone || '').toLowerCase().includes(term);
        const matchCurso = lead.cursoInteresse.toLowerCase().includes(term);
        if (!matchNome && !matchEmail && !matchTel && !matchCurso) {
          return false;
        }
      }
      return true;
    });
  }, [leads, selectedCourse, selectedStatus, searchTerm]);

  // Alterar status do lead
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      setUpdatingId(leadId);
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        status: newStatus,
        atualizadoEm: serverTimestamp()
      });
      // Atualização local imediata para responsividade
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      console.error('Erro ao atualizar status do lead:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Exportar CSV com todos os leads filtrados
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;

    const headers = [
      'Nome',
      'E-mail',
      'Telefone',
      'Curso de Interesse',
      'Material Solicitado',
      'Como Conheceu',
      'Status',
      'Data de Cadastro'
    ];

    const rows = filteredLeads.map((l) => [
      `"${(l.nome || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.telefone || '').replace(/"/g, '""')}"`,
      `"${(l.cursoInteresse || '').replace(/"/g, '""')}"`,
      `"${(l.origem || '').replace(/"/g, '""')}"`,
      `"${(l.comoConheceu || '').replace(/"/g, '""')}"`,
      `"${(l.status || '').replace(/"/g, '""')}"`,
      `"${formatDate(l.criadoEm)}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dataIso = new Date().toISOString().split('T')[0];
    link.download = `leads-esuda-${dataIso}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getBadgeClass = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return opt ? opt.badgeClass : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* 3 Métricas do Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total de Leads */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Total de Leads</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.total}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Interessados cadastrados no portal</p>
          </div>
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Leads dos últimos 7 dias */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Últimos 7 Dias</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{metrics.ultimos7Dias}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Captações recentes na semana</p>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Curso que puxou mais */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Curso Mais Procurado</p>
            <h3 className="text-base font-black text-indigo-900 mt-1 truncate" title={metrics.cursoMaisPopular}>
              {metrics.cursoMaisPopular}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Maior atração de potenciais alunos</p>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Ações */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Busca textual */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Filtro por Curso */}
          <div className="min-w-[180px]">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Todos os cursos</option>
              {distinctCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="min-w-[150px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Todos os status</option>
              <option value="novo">Novo</option>
              <option value="em contato">Em Contato</option>
              <option value="matriculado">Matriculado</option>
              <option value="descartado">Descartado</option>
            </select>
          </div>
        </div>

        {/* Botão Exportar CSV */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <span className="text-xs text-slate-500 font-medium">
            Exibindo <strong>{filteredLeads.length}</strong> de {leads.length}
          </span>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLeads.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Lista de Leads */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-sm font-bold uppercase tracking-wider">Carregando leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
            <h4 className="text-base font-bold text-slate-700">Nenhum lead encontrado</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {leads.length === 0 
                ? 'Nenhum interessado se cadastrou até o momento.' 
                : 'Nenhum lead corresponde aos filtros selecionados acima.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Interessado</th>
                  <th className="py-4 px-6">Curso & Material</th>
                  <th className="py-4 px-6">Origem</th>
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredLeads.map((lead) => {
                  const waUrl = buildWhatsAppLink(lead.telefone, lead.nome, lead.cursoInteresse, lead.origem);
                  const isUpdating = updatingId === lead.id;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nome e Contatos */}
                      <td className="py-4 px-6">
                        <div className="font-black text-slate-900 text-sm">{lead.nome}</div>
                        <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`mailto:${lead.email}`} className="hover:text-indigo-600 transition-colors">
                            {lead.email}
                          </a>
                        </div>
                        {lead.telefone && (
                          <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{lead.telefone}</span>
                          </div>
                        )}
                      </td>

                      {/* Curso e Material */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-indigo-900 max-w-xs">{lead.cursoInteresse}</div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <span className="font-semibold text-slate-700">Material:</span>
                          <span>{lead.origem || 'Ementa do curso'}</span>
                        </div>
                      </td>

                      {/* Como conheceu */}
                      <td className="py-4 px-6 text-slate-600">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                          {lead.comoConheceu || 'Não informado'}
                        </span>
                      </td>

                      {/* Data */}
                      <td className="py-4 px-6 text-slate-500 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(lead.criadoEm)}</span>
                        </div>
                      </td>

                      {/* Status com Seletor para Alteração */}
                      <td className="py-4 px-6">
                        <div className="relative inline-block">
                          <select
                            disabled={isUpdating}
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`pl-3 pr-8 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none ${getBadgeClass(lead.status)}`}
                          >
                            <option value="novo">Novo</option>
                            <option value="em contato">Em Contato</option>
                            <option value="matriculado">Matriculado</option>
                            <option value="descartado">Descartado</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* Ações (WhatsApp) */}
                      <td className="py-4 px-6 text-center">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider transition-all shadow-xs shadow-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Abrir no WhatsApp
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
