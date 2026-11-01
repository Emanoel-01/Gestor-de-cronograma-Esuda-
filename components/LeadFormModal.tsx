'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Download, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from './../lib/firebase';
import { sendNewLeadNotification } from '../lib/mail-notifications';

interface CourseOption {
  id: string;
  name: string;
}

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses?: CourseOption[];
  defaultCourseName?: string;
  origem: string;
  onSuccess: () => void;
}

export function LeadFormModal({
  isOpen,
  onClose,
  courses: initialCourses = [],
  defaultCourseName = '',
  origem,
  onSuccess,
}: LeadFormModalProps) {
  const [coursesList, setCoursesList] = useState<CourseOption[]>(initialCourses);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cursoInteresse, setCursoInteresse] = useState(defaultCourseName);
  const [comoConheceu, setComoConheceu] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Sync course options if not provided
  useEffect(() => {
    if (initialCourses && initialCourses.length > 0) {
      setCoursesList(initialCourses);
      setCursoInteresse(prev => prev || defaultCourseName || initialCourses[0].name);
    } else {
      const fetchCourses = async () => {
        try {
          const snap = await getDocs(collection(db, 'courses'));
          const list: CourseOption[] = [];
          snap.forEach(docSnap => {
            const data = docSnap.data();
            list.push({ id: docSnap.id, name: data.name || docSnap.id });
          });
          setCoursesList(list);
          setCursoInteresse(prev => prev || defaultCourseName || (list.length > 0 ? list[0].name : ''));
        } catch (e) {
          console.warn('Erro ao carregar cursos:', e);
        }
      };
      fetchCourses();
    }
  }, [initialCourses, defaultCourseName]);

  useEffect(() => {
    if (defaultCourseName) {
      setCursoInteresse(defaultCourseName);
    }
  }, [defaultCourseName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentimento) {
      setError('É necessário autorizar o envio de informações para continuar.');
      return;
    }
    if (!nome.trim() || !email.trim()) {
      setError('Por favor preencha nome e e-mail.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const leadData = {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        cursoInteresse: cursoInteresse || defaultCourseName || 'Não informado',
        origem: origem || 'Material acadêmico',
        comoConheceu: comoConheceu.trim() || 'Não informado',
        consentimento: true,
        consentimentoEm: serverTimestamp(),
        criadoEm: serverTimestamp(),
        status: 'novo',
      };

      await addDoc(collection(db, 'leads'), leadData);

      // Notificação da equipe via Trigger Email na coleção 'mail'
      try {
        await sendNewLeadNotification(leadData);
      } catch (mailErr) {
        console.warn('Aviso: Erro ao enfileirar notificação na coleção mail:', mailErr);
      }

      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSubmitted(false);
        setNome('');
        setEmail('');
        setTelefone('');
        setConsentimento(false);
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao registrar lead:', err);
      setError('Não foi possível registrar seus dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10"
      >
        {/* Header */}
        <div className="bg-indigo-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-amber-500/30">
              Download de Material
            </span>
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-white leading-tight">
            {origem || 'Baixar Material'}
          </h3>
          <p className="text-indigo-200 text-xs mt-1">
            Preencha seus dados para liberar o download imediato do documento.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="py-12 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Download Autorizado!
              </h4>
              <p className="text-sm text-slate-600 max-w-xs">
                Seu documento está sendo baixado automaticamente agora. Agradecemos seu interesse na Faculdade ESUDA!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(81) 99999-9999"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              {/* Curso de Interesse */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Curso de Interesse
                </label>
                <select
                  value={cursoInteresse}
                  onChange={(e) => setCursoInteresse(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                >
                  {defaultCourseName && (
                    <option value={defaultCourseName}>{defaultCourseName}</option>
                  )}
                  {coursesList
                    .filter((c) => c.name !== defaultCourseName)
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  {!defaultCourseName && coursesList.length === 0 && (
                    <option value="">Selecione um curso...</option>
                  )}
                </select>
              </div>

              {/* Como conheceu o curso */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Como conheceu o curso?
                </label>
                <select
                  value={comoConheceu}
                  onChange={(e) => setComoConheceu(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                >
                  <option value="">Selecione uma opção...</option>
                  <option value="Instagram">Instagram</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Google / Pesquisa">Google / Pesquisa na Web</option>
                  <option value="Indicação de Colegas / Amigos">Indicação de Colegas / Amigos</option>
                  <option value="Site da Faculdade ESUDA">Site da Faculdade ESUDA</option>
                  <option value="E-mail ou WhatsApp">E-mail ou WhatsApp</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              {/* LGPD Consent Checkbox - Obrigatório */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <input
                    id="lgpd-consent-checkbox"
                    type="checkbox"
                    checked={consentimento}
                    onChange={(e) => setConsentimento(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs text-slate-600 leading-snug">
                    <label htmlFor="lgpd-consent-checkbox" className="cursor-pointer select-none">
                      Autorizo a Faculdade ESUDA a utilizar meus dados para enviar informações sobre este e outros cursos de pós-graduação. Posso solicitar a exclusão a qualquer momento.
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyPolicy(!showPrivacyPolicy)}
                      className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 inline" />
                      Como tratamos seus dados
                    </button>
                  </div>
                </div>

                {/* Explicação LGPD */}
                <AnimatePresence>
                  {showPrivacyPolicy && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed overflow-hidden"
                    >
                      <p className="font-bold text-slate-800 mb-1">
                        Proteção de Dados Pessoais (LGPD — Lei 13.709/2018):
                      </p>
                      Seus dados (nome, e-mail e telefone) são armazenados em ambiente seguro e utilizados exclusivamente pela Faculdade ESUDA para disponibilizar os materiais acadêmicos e comunicações oficiais de pós-graduação. Nunca compartilhamos seus dados com terceiros para fins comerciais. Você pode solicitar acesso, alteração ou exclusão definitiva a qualquer momento pelo e-mail emanoel@esuda.edu.br.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!consentimento || !nome.trim() || !email.trim() || loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Liberar Download
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
