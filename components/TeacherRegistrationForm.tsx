'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Lock, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Mail,
  Phone,
  CreditCard,
  Linkedin,
  Instagram,
  Link as LinkIcon,
  GraduationCap
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface TeacherRegistrationFormProps {
  teachers: any[];
  onClose: () => void;
}

export function TeacherRegistrationForm({ teachers, onClose }: TeacherRegistrationFormProps) {
  const [step, setStep] = useState(1); // 1: Security, 2: Selection, 3: Form, 4: Success
  const [pin, setPin] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
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

  const availableTeachers = teachers.filter(t => !t.hasSubmitted);
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = process.env.NEXT_PUBLIC_TEACHER_PIN || 'Esuda*2026';
    if (pin === correctPin) {
      setStep(2);
      setError(null);
    } else {
      setError('Código de segurança incorreto.');
    }
  };

  const handleTeacherSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeacherId) {
      setStep(3);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submissionData = {
        teacher_id: selectedTeacherId,
        name: selectedTeacher?.name || '',
        titulacao: formData.titulacao,
        email: formData.email,
        cpf: formData.cpf,
        phone: formData.phone,
        photo_url: '',
        linkedin: formData.linkedin,
        lattes: formData.lattes,
        instagram: formData.instagram,
        status: 'pendente',
        submitted_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase.from('teacher_submissions').insert(submissionData);
      if (insertError) {
        console.error('Submission error:', insertError);
        setError('Erro ao enviar formulário. Tente novamente.');
      } else {
        setStep(4);
      }
    } catch (err: any) {
      console.error('Submission catch error:', err);
      setError('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 sm:p-12">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Cadastro de Professor</h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Atualização de Perfil Docente</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePinSubmit}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Código de Segurança
                  </label>
                  <input 
                    type="password"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Digite o código da instituição"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Validar Código
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleTeacherSelect}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" /> Selecione seu Nome
                  </label>
                  <select 
                    required
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Selecione na lista...</option>
                    {availableTeachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    * Se seu nome não estiver na lista, entre em contato com a coordenação.
                  </p>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Iniciar Preenchimento
                </button>
              </motion.form>
            )}

            {step === 3 && (
              <motion.form 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
              >
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-6">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Professor Selecionado</p>
                  <p className="text-lg font-black text-indigo-900">{selectedTeacher?.name}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <GraduationCap className="w-3 h-3" /> Titulação / Grau
                    </label>
                    <input 
                      required
                      value={formData.titulacao}
                      onChange={(e) => setFormData({...formData, titulacao: e.target.value})}
                      placeholder="Ex: Mestre em Engenharia Civil"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="w-3 h-3" /> E-mail (Opcional)
                    </label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard className="w-3 h-3" /> CPF (Opcional)
                      </label>
                      <input 
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Phone className="w-3 h-3" /> Telefone (Opcional)
                      </label>
                      <input 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Linkedin className="w-3 h-3" /> LinkedIn (Opcional)
                    </label>
                    <input 
                      value={formData.linkedin}
                      onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                      placeholder="https://linkedin.com/in/seu-perfil"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <LinkIcon className="w-3 h-3" /> Currículo Lattes (Opcional)
                    </label>
                    <input 
                      value={formData.lattes}
                      onChange={(e) => setFormData({...formData, lattes: e.target.value})}
                      placeholder="http://lattes.cnpq.br/..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Instagram className="w-3 h-3" /> Instagram (Opcional)
                    </label>
                    <input 
                      value={formData.instagram}
                      onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                      placeholder="@seu_perfil"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar para Revisão'
                  )}
                </button>
              </motion.form>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-8"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Sucesso!</h3>
                  <p className="text-slate-500 font-medium">
                    Seus dados foram enviados para a coordenação. Após a revisão, seu perfil será atualizado automaticamente no portal.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Fechar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
