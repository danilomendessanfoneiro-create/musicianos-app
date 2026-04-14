import { supabase } from './supabaseClient'
import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, LayoutDashboard, Briefcase, DollarSign, Users, Trash2, PlusCircle, Edit2, X, ArrowUpCircle, ArrowDownCircle, Settings, Menu, ChevronLeft, ChevronRight, BarChart3, CheckCircle2, Clock } from 'lucide-react';

type ViewState = 'dashboard' | 'crm' | 'gigs' | 'finance';
const LeadStatus = { NEW: 'novo', NEGOTIATING: 'negociando', BOOKED: 'fechado', LOST: 'perdido' } as const;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [leads, setLeads] = useState<any[]>([]);
  const [gigs, setGigs] = useState<any[]>([]);
  const [finance, setFinance] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState<{ type: string | null, data: any | null }>({ type: null, data: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const currentUserId = user?.id || '';

  useEffect(() => {
    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        await fetchData();
      }
      setLoading(false);
    };
    initApp();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        await fetchData();
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
  };

  const fetchData = async () => {
    const { data: l } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const { data: g } = await supabase.from('gigs').select('*').order('date', { ascending: true });
    const { data: f } = await supabase.from('finance').select('*').order('date', { ascending: false });
    if (l) setLeads(l || []);
    if (g) setGigs(g || []);
    if (f) setFinance(f || []);
  };

  const salvarRegistro = async (type: string, data: any) => {
    const id = modalOpen.data?.id;
    const table = type === 'crm' ? 'leads' : type;
    const payload: any = { ...data, user_id: currentUserId };
    
    // Tratamento de tipos para o banco
    if (payload.value) payload.value = Number(payload.value);
    if (payload.fee) payload.fee = Number(payload.fee);
    if (payload.amount) payload.amount = Number(payload.amount);

    const { error } = await supabase.from(table).upsert(id ? { ...payload, id } : payload);

    if (error) return alert("Erro ao salvar: " + error.message);

    // Automação Show -> Financeiro
    if (type === 'gigs' && data.received === true && !id) {
      await supabase.from('finance').insert([{
        date: data.date,
        description: `Show: ${data.venue}`,
        amount: Number(data.fee),
        type: 'entrada',
        category: 'Show',
        user_id: currentUserId
      }]);
    }

    await fetchData();
    setModalOpen({ type: null, data: null });
  };

  const gerenciarCategoria = async (action: 'add' | 'delete', val: string) => {
    let novas = profile?.categories || ['Show', 'Marketing', 'Manutenção', 'Gasolina'];
    if (action === 'add') novas = [...novas, val];
    if (action === 'delete') novas = novas.filter((c: string) => c !== val);

    const { error } = await supabase.from('profiles').update({ categories: novas }).eq('id', currentUserId);
    if (error) return alert("Erro nas categorias: " + error.message);
    fetchProfile(currentUserId);
  };

  const biData = useMemo(() => {
    const ent = finance.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
    const sai = finance.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
    
    const rankingClientes = finance.filter(t => t.type === 'entrada').reduce((acc: any, curr) => {
      const nome = curr.description.replace('Show: ', '').replace('Cachê: ', '');
      acc[nome] = (acc[nome] || 0) + curr.amount;
      return acc;
    }, {});

    const despesasCat = finance.filter(t => t.type === 'saida').reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

    return { 
      saldo: ent - sai, entries: ent, exits: sai, 
      ranking: Object.entries(rankingClientes).sort((a: any, b: any) => b[1] - a[1]),
      despesas: Object.entries(despesasCat).sort((a: any, b: any) => b[1] - a[1]),
      leadsStatus: leads.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, { novo: 0, negociando: 0, fechado: 0, perdido: 0 })
    };
  }, [finance, leads]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = []; 
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(i);
    return days;
  }, [currentDate]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-indigo-500 font-black italic">CARREGANDO...</div>;
  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-black text-white flex font-sans">
      <aside className={`w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col fixed h-full z-40 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative`}>
        <h1 className="text-2xl font-black text-indigo-500 mb-10 italic">Musicianos</h1>
        <nav className="flex-grow space-y-2">
          <MenuBtn active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <MenuBtn active={currentView === 'gigs'} onClick={() => setCurrentView('gigs')} icon={<Briefcase size={20}/>} label="Agenda" />
          <MenuBtn active={currentView === 'crm'} onClick={() => setCurrentView('crm')} icon={<Users size={20}/>} label="Leads" />
          <MenuBtn active={currentView === 'finance'} onClick={() => setCurrentView('finance')} icon={<DollarSign size={20}/>} label="Financeiro" />
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center mt-auto text-red-500 text-xs font-black uppercase"><LogOut size={14} className="mr-2"/> Sair</button>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {currentView === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <header className="flex justify-between items-end border-b border-indigo-500/20 pb-6">
              <h2 className="text-4xl font-black uppercase italic">BI Engine</h2>
              <p className={`text-3xl font-black italic ${biData.saldo >= 0 ? 'text-teal-400' : 'text-red-500'}`}>R$ {biData.saldo.toLocaleString('pt-BR')}</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InteractiveCard title="Entradas" value={biData.entries} icon={<ArrowUpCircle className="text-teal-400"/>} color="border-teal-500" onClick={() => setModalOpen({type: 'detalhe_entradas', data: null})} />
              <InteractiveCard title="Saídas" value={biData.exits} icon={<ArrowDownCircle className="text-red-400"/>} color="border-red-500" onClick={() => setModalOpen({type: 'detalhe_saidas', data: null})} />
              <div className="bg-zinc-900 p-6 rounded-[32px] border-l-8 border-indigo-500 shadow-2xl">
                 <p className="text-zinc-500 text-[10px] font-black mb-4 uppercase tracking-widest">Funil Leads</p>
                 <div className="flex items-end justify-between h-20 gap-1">
                    {Object.entries(biData.leadsStatus).map(([status, count]: any) => (
                      <div key={status} className="flex-1 bg-indigo-500/10 rounded-t-lg relative h-16 flex items-end">
                        <div className="w-full bg-indigo-500 rounded-t-lg transition-all" style={{ height: `${count > 0 ? (count / (leads.length || 1)) * 100 : 5}%` }}></div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'gigs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase italic">Agenda</h2>
              <button onClick={() => setModalOpen({ type: 'gigs', data: null })} className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase italic tracking-tighter shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Novo Show</button>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black italic uppercase text-indigo-400">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-zinc-800 rounded-lg"><ChevronLeft/></button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-zinc-800 rounded-lg"><ChevronRight/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="text-center text-[10px] font-black text-zinc-600 uppercase">{d}</div>)}
                {calendarDays.map((day, i) => (
                  <div key={i} className={`h-12 md:h-16 border border-zinc-800/50 rounded-xl flex items-center justify-center relative ${day ? 'bg-zinc-800/30' : 'opacity-0'}`}>
                    <span className="text-xs font-bold text-zinc-500">{day}</span>
                    {day && gigs.some(g => g.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`) && <div className="absolute bottom-2 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden">
              <table className="w-full text-left">
                <tbody className="divide-y divide-zinc-800">
                  {gigs.map(g => (
                    <tr key={g.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-5">
                        <div className="font-bold text-sm uppercase">{g.venue}</div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase italic">{new Date(g.date).toLocaleDateString('pt-BR')}</div>
                      </td>
                      <td className="p-5 font-black italic text-teal-400 text-sm">R$ {Number(g.fee).toLocaleString('pt-BR')}</td>
                      <td className="p-5 text-right space-x-3">
                        <button onClick={() => setModalOpen({type: 'gigs', data: g})} className="text-indigo-400"><Edit2 size={16}/></button>
                        <button onClick={async () => { if(confirm("Excluir?")) { await supabase.from('gigs').delete().eq('id', g.id); fetchData(); } }} className="text-red-900"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'finance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase italic">Financeiro</h2>
              <div className="flex gap-2">
                <button onClick={() => setModalOpen({type: 'config_finance', data: null})} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-indigo-400"><Settings size={20}/></button>
                <button onClick={() => setModalOpen({ type: 'finance', data: null })} className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase italic">Novo Registro</button>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden">
              <table className="w-full text-left">
                <tbody className="divide-y divide-zinc-800">
                  {finance.map(t => (
                    <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-5">
                        <div className="font-bold text-sm uppercase">{t.description}</div>
                        <div className="text-[10px] font-black text-zinc-600 uppercase italic">{t.date} | {t.category}</div>
                      </td>
                      <td className={`p-5 text-right font-black italic text-sm ${t.type === 'entrada' ? 'text-teal-400' : 'text-red-500'}`}>
                        R$ {Number(t.amount).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-5 text-right">
                        <button onClick={async () => { if(confirm("Excluir?")) { await supabase.from('finance').delete().eq('id', t.id); fetchData(); } }} className="text-red-900"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'crm' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase italic">Leads</h2>
                <button onClick={() => setModalOpen({ type: 'crm', data: null })} className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase italic">Novo Lead</button>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-zinc-800">
                    {leads.map(l => (
                      <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-5"><div className="font-bold text-sm uppercase">{l.name}</div><div className="text-[10px] font-black text-zinc-600 uppercase italic">{l.venue}</div></td>
                        <td className="p-5 font-black text-xs italic text-indigo-400 text-right uppercase">{l.status}</td>
                        <td className="p-5 text-right">
                           <button onClick={() => setModalOpen({type: 'crm', data: l})} className="text-indigo-400 mr-4"><Edit2 size={16}/></button>
                           <button onClick={async () => { if(confirm("Excluir?")) { await supabase.from('leads').delete().eq('id', l.id); fetchData(); } }} className="text-red-900"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}
      </main>

      {modalOpen.type && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-xl">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] w-full max-w-md shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setModalOpen({type: null, data: null})} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X size={24}/></button>
            <h3 className="text-xl font-black mb-8 text-indigo-400 uppercase italic">{modalOpen.type.replace('_', ' ')}</h3>
            
            {/* Detalhamento BI */}
            {modalOpen.type === 'detalhe_entradas' && (
              <div className="space-y-3">
                {biData.ranking.map(([nome, valor]: any) => (
                  <div key={nome} className="flex justify-between p-4 bg-zinc-800 rounded-2xl border border-zinc-700">
                    <span className="font-bold uppercase italic text-xs">{nome}</span>
                    <span className="font-black text-teal-400">R$ {valor.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}

            {modalOpen.type === 'detalhe_saidas' && (
              <div className="space-y-3">
                {biData.despesas.map(([cat, valor]: any) => (
                  <div key={cat} className="flex justify-between p-4 bg-zinc-800 rounded-2xl border border-zinc-700">
                    <span className="font-bold uppercase italic text-xs">{cat}</span>
                    <span className="font-black text-red-500">R$ {valor.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}

            {modalOpen.type === 'config_finance' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {(profile?.categories || ['Show', 'Manutenção', 'Marketing', 'Gasolina']).map((cat: string) => (
                    <div key={cat} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase">{cat}</span>
                      <button onClick={() => gerenciarCategoria('delete', cat)} className="text-red-500"><X size={12}/></button>
                    </div>
                  ))}
                </div>
                <form onSubmit={(e: any) => { e.preventDefault(); gerenciarCategoria('add', e.target.newCat.value); e.target.reset(); }} className="flex gap-2">
                  <input name="newCat" placeholder="Nova Categoria..." className="flex-1 p-4 bg-zinc-800 rounded-2xl outline-none font-bold text-xs uppercase" required />
                  <button type="submit" className="bg-indigo-600 p-4 rounded-2xl"><PlusCircle/></button>
                </form>
              </div>
            )}

            {!modalOpen.type.includes('detalhe') && modalOpen.type !== 'config_finance' && (
              <form onSubmit={async (e: any) => { 
                e.preventDefault(); 
                const fd = new FormData(e.currentTarget);
                const data: any = {};
                fd.forEach((v, k) => data[k] = v);
                if (modalOpen.type === 'gigs') data.received = fd.get('received') === 'on';
                await salvarRegistro(modalOpen.type!, data); 
              }} className="space-y-4">
                
                {modalOpen.type === 'gigs' && (
                  <>
                    <input name="venue" defaultValue={modalOpen.data?.venue} placeholder="LOCAL" className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs uppercase" required />
                    <input name="date" type="date" defaultValue={modalOpen.data?.date || new Date().toISOString().split('T')[0]} className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs" required />
                    <input name="fee" type="number" defaultValue={modalOpen.data?.fee} placeholder="VALOR CACHÊ" className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs" required />
                    <label className="flex items-center gap-4 p-5 bg-zinc-800 rounded-3xl cursor-pointer">
                      <input name="received" type="checkbox" defaultChecked={modalOpen.data?.received} className="w-6 h-6 accent-indigo-500" />
                      <span className="text-xs font-black uppercase text-zinc-400">Recebido?</span>
                    </label>
                  </>
                )}

                {modalOpen.type === 'finance' && (
                  <>
                    <input name="description" defaultValue={modalOpen.data?.description} placeholder="DESCRIÇÃO" className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs uppercase" required />
                    <input name="amount" type="number" defaultValue={modalOpen.data?.amount} placeholder="VALOR" className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs" required />
                    <input name="date" type="date" defaultValue={modalOpen.data?.date || new Date().toISOString().split('T')[0]} className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs" required />
                    <select name="type" className="w-full p-5 bg-zinc-800 rounded-3xl font-black text-xs uppercase">
                      <option value="saida">DESPESA</option>
                      <option value="entrada">RECEITA</option>
                    </select>
                    <select name="category" className="w-full p-5 bg-zinc-800 rounded-3xl font-black text-xs uppercase">
                      {(profile?.categories || ['Show', 'Manutenção', 'Marketing', 'Gasolina']).map((cat: string) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </>
                )}

                {modalOpen.type === 'crm' && (
                  <>
                    <input name="name" defaultValue={modalOpen.data?.name} placeholder="NOME CONTRATANTE" className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs uppercase" required />
                    <input name="venue" defaultValue={modalOpen.data?.venue} placeholder="LOCAL" className="w-full p-5 bg-zinc-800 rounded-3xl text-white outline-none font-bold text-xs uppercase" />
                    <select name="status" defaultValue={modalOpen.data?.status || 'novo'} className="w-full p-5 bg-zinc-800 rounded-3xl font-black text-xs uppercase">
                      {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </>
                )}

                <button type="submit" className="w-full p-6 bg-indigo-600 rounded-[32px] font-black uppercase text-sm shadow-xl active:scale-95 transition-all">Confirmar Lançamento</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const MenuBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center w-full p-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl italic font-black' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white font-bold'}`}>
    {icon} <span className="ml-4 text-[10px] uppercase tracking-widest">{label}</span>
  </button>
);

const InteractiveCard = ({ title, value, icon, color, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left p-6 bg-zinc-900 rounded-[32px] border-l-8 ${color} shadow-2xl hover:bg-zinc-800/50 transition-all`}>
    <div className="flex justify-between mb-4"><span className="text-zinc-500 text-[10px] font-black uppercase">{title}</span>{icon}</div>
    <p className="text-2xl font-black italic">R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
  </button>
);

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm bg-zinc-900 p-10 rounded-[50px] border border-zinc-800 text-center shadow-2xl">
        <h2 className="text-4xl font-black text-indigo-500 italic mb-10 uppercase tracking-tighter">Musicianos</h2>
        <form className="space-y-4" onSubmit={async (e: any) => {
          e.preventDefault();
          setLoading(true);
          const { error } = await supabase.auth.signInWithPassword({
            email: e.target.email.value,
            password: e.target.password.value,
          });
          if (error) alert("Erro: " + error.message);
          setLoading(false);
        }}>
          <input name="email" type="email" placeholder="E-MAIL" className="w-full p-5 bg-zinc-800 rounded-3xl border border-zinc-700 font-bold text-xs text-center text-white" required />
          <input name="password" type="password" placeholder="SENHA" className="w-full p-5 bg-zinc-800 rounded-3xl border border-zinc-700 font-bold text-xs text-center text-white" required />
          <button disabled={loading} className="w-full p-5 bg-indigo-600 rounded-3xl font-black text-white hover:scale-105 transition-all uppercase">Entrar</button>
        </form>
      </div>
    </div>
  );
};