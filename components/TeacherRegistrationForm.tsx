'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Mail,
  Phone,
  CreditCard,
  Linkedin,
  Instagram,
  Link as LinkIcon,
  GraduationCap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '@/lib/firebase';

interface TeacherRegistrationFormProps {
  teachers: any[];
  onClose: () => void;
}

export function TeacherRegistrationForm({ teachers, onClose }: TeacherRegistrationFormProps) {
  const [step, setStep] = useState(1); // 1: Validação de Identidade e Código, 2: Formulário, 3: Sucesso
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulacao: '',
    email: '',
    cpf: '',
    phone: '',
    linkedin: '',
    lattes: '',
    instagram: ''
  });

  const availableTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const handleValidateAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInputCode = accessCodeInput.trim().toUpperCase();
    if (!cleanInputCode) {
      setError('Por favor, informe o seu código de acesso individual.');
      return;
    }

    let matchedTeacher: any = null;

    // Se o professor selecionou o nome no dropdown
    if (selectedTeacherId) {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      const teacherCode = (teacher?.accessCode || '').trim().toUpperCase();
      
      if (teacherCode && teacherCode === cleanInputCode) {
        matchedTeacher = teacher;
      } else {
        setError('Código de acesso incorreto para o professor selecionado. Em caso de dúvidas, contate a coordenação.');
        return;
      }
    } else {
      // Se não selecionou no dropdown, tenta localizar o professor diretamente pelo accessCode digitado
      matchedTeacher = teachers.find(t => (t.accessCode || '').trim().toUpperCase() === cleanInputCode);
      if (!matchedTeacher) {
        setError('Código de acesso não encontrado. Selecione seu nome na lista ou confira com a coordenação.');
        return;
      }
      setSelectedTeacherId(matchedTeacher.id);
    }

    // Pré-preenche o formulário com dados existentes do professor
    setFormData({
      titulacao: matchedTeacher.titulacao || '',
      email: matchedTeacher.email || '',
      cpf: matchedTeacher.cpf || '',
      phone: matchedTeacher.phone || '',
      linkedin: matchedTeacher.linkedin || '',
      lattes: matchedTeacher.lattes || '',
      instagram: matchedTeacher.instagram || ''
    });

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    if (!formData.titulacao.trim()) {
      setError('Por favor, informe sua Titulação / Grau acadêmico.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submissionData = {
        teacherId: selectedTeacher.id,
        name: selectedTeacher.name,
        titulacao: formData.titulacao.trim(),
        email: formData.email.trim(),
        cpf: formData.cpf.trim(),
        phone: formData.phone.trim(),
        photoUrl: selectedTeacher.photoUrl || '',
        linkedin: formData.linkedin.trim(),
        lattes: formData.lattes.trim(),
        instagram: formData.instagram.trim(),
        status: 'pendente',
        submittedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'submissoes_professores'), submissionData);
      setStep(3);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissoes_professores');
      setError('Erro ao enviar informações. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative border border-slate-100"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 sm:p-10">
          <div className="mb-6 text-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              Cadastro de Professor
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Atualização de Perfil Docente ESUDA
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleValidateAccess}
                className="space-y-5"
              >
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed font-medium">
                  Selecione seu nome na lista e digite o seu <strong className="text-indigo-700 font-black">Código de Acesso Individual</strong> (fornecido pela coordenação).
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> Seu Nome Completo
                  </label>
                  <select 
                    value={selectedTeacherId}
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value);
                      setError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Selecione seu nome na lista...</option>
                    {availableTeachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" /> Código de Acesso Individual (6 dígitos)
                  </label>
                  <input 
                    type="text"
                    required
                    value={accessCodeInput}
                    onChange={(e) => {
                      setAccessCodeInput(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    placeholder="Ex: HWH2QP"
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-black text-base text-slate-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all uppercase placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    * Se ainda não recebeu seu código, solicite à coordenação do Prof. Emanoel Amorim.
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 text-red-600 text-xs font-bold bg-red-50 p-3.5 rounded-xl border border-red-100"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Validar e Prosseguir</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"
              >
                <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">
                      Docente Autenticado
                    </span>
                    <p className="text-base font-black text-indigo-950">{selectedTeacher?.name}</p>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-indigo-600 shrink-0" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Titulação / Grau Acadêmico *
                  </label>
                  <input 
                    required
                    value={formData.titulacao}
                    onChange={(e) => setFormData({...formData, titulacao: e.target.value})}
                    placeholder="Ex: Mestre em Engenharia de Estruturas"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" /> E-mail
                    </label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="professor@esuda.edu.br"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-600" /> Telefone / WhatsApp
                    </label>
                    <input 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(81) 99999-9999"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> CPF (Opcional)
                  </label>
                  <input 
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-600" /> Currículo Lattes
                  </label>
                  <input 
                    value={formData.lattes}
                    onChange={(e) => setFormData({...formData, lattes: e.target.value})}
                    placeholder="http://lattes.cnpq.br/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Linkedin className="w-3.5 h-3.5 text-indigo-600" /> LinkedIn
                    </label>
                    <input 
                      value={formData.linkedin}
                      onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                      placeholder="linkedin.com/in/perfil"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-indigo-600" /> Instagram
                    </label>
                    <input 
                      value={formData.instagram}
                      onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                      placeholder="@perfil"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="w-1/3 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Dados p/ Revisão'
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5 py-4"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Dados Enviados com Sucesso!</h3>
                  <p className="text-slate-600 text-xs font-medium leading-relaxed max-w-sm mx-auto">
                    Suas informações foram recebidas e serão revisadas pela coordenação. Assim que aprovadas, seu perfil e titulação serão exibidos nos cronogramas e ementas.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Concluir
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
