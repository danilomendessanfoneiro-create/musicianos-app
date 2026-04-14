import { supabase } from './supabaseClient'
import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, LayoutDashboard, Briefcase, DollarSign, Users, Trash2, PlusCircle, UserCheck, Edit2, X, ArrowUpCircle, ArrowDownCircle, Calendar as CalendarIcon, Settings, Menu } from 'lucide-react';

// --- Tipagem e Configurações ---
type ViewState = 'dashboard' | 'crm' | 'gigs' | 'finance' | 'userManagement';
const LeadStatus = { NEW: 'novo', NEGOTIATING: 'negociando', BOOKED: 'fechado', LOST: 'perdido' } as const;
type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

interface Lead { id: string; name: string; venue: string; value: number; status: LeadStatus; userId: string; date: string; }
interface Gig { id: string; date: string; venue: string; fee: number; received: boolean; userId: string; }
interface Transaction { id: string; date: string; description: string; amount: number; type: 'entrada' | 'saida'; userId: string; category: string; }
interface User { id: string; name: string; role: 'admin' | 'usuario'; loginName: string; password?: string; categories?: string[]; }

export default function App() {
  const [allUsers, setAllUsers] = useState<User[]>([
    { id: 'admin-id', name: 'Administrador', role: 'admin', loginName: 'admin', password: 'admin123', categories: ['Gasolina', 'Marketing', 'Manutenção', 'Cordas'] },
    { id: 'joao-id', name: 'João Músico', role: 'usuario', loginName: 'joao', password: 'mypass', categories: ['Gasolina', 'Equipamento', 'Alimentação'] }
  ]);
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [finance, setFinance] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState<{ type: string | null, data: any | null }>({ type: null, data: null });
  
  // ESTADO PARA CONTROLE DO MENU NO CELULAR
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentUserId = user?.id || '';
  const isAdmin = user?.role === 'admin';

  // BUSCAR DADOS DA NUVEM (SUPABASE)
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const { data: leadsData } = await supabase.from('leads').select('*');
        const { data: gigsData } = await supabase.from('gigs').select('*');
        const { data: financeData } = await supabase.from('finance').select('*');
        
        if (leadsData) setLeads(leadsData);
        if (gigsData) setGigs(gigsData);
        if (financeData) setFinance(financeData);
      };
      fetchData();
    }
  }, [user]);

  const fLeads = useMemo(() => leads.filter(l => l.userId === currentUserId || isAdmin), [leads, currentUserId, isAdmin]);
  const fGigs = useMemo(() => gigs.filter(g => g.userId === currentUserId || isAdmin), [gigs, currentUserId, isAdmin]);
  const fFinance = useMemo(() => finance.filter(f => f.userId === currentUserId || isAdmin), [finance, currentUserId, isAdmin]);
  
  const userCategories = useMemo(() => {
    return allUsers.find(u => u.id === currentUserId)?.categories || ['Geral'];
  }, [allUsers, currentUserId]);

  const biData = useMemo(() => {
    const rankingClientes = fFinance.filter(t => t.type === 'entrada').reduce((acc: any, curr) => {
      const nome = curr.description.replace('Cachê: ', '').replace('Show: ', '');
      acc[nome] = (acc[nome] || 0) + curr.amount;
      return acc;
    }, {});

    const despesasPorCategoria = fFinance.filter(t => t.type === 'saida').reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

    const historico = Array.from({length: 6}, (_, i) => {
      const d = new Date(2026, 3 - i, 1);
      const total = fFinance.filter(t => t.type === 'entrada' && new Date(t.date).getMonth() === d.getMonth()).reduce((s, t) => s + t.amount, 0);
      return { mes: d.toLocaleString('pt-BR', { month: 'short' }), total };
    }).reverse();

    const entradasTotal = fFinance.filter(t => t.type === 'entrada').reduce((s,t)=>s+t.amount,0);
    const saidasTotal = fFinance.filter(t => t.type === 'saida').reduce((s,t)=>s+t.amount,0);

    return { 
      clientes: Object.entries(rankingClientes).sort((a:any, b:any) => b[1] - a[1]),
      despesas: Object.entries(despesasPorCategoria).sort((a:any, b:any) => b[1] - a[1]),
      historico,
      saldoGeral: entradasTotal - saidasTotal,
      entradasTotal,
      saidasTotal
    };
  }, [fFinance]);

  // SALVAR NO SUPABASE
  const salvarRegistro = async (type: string, data: any) => {
    const id = modalOpen.data?.id || undefined;
    const novoItem = { 
      ...data, 
      user_id: currentUserId,
      amount: Number(data.amount || 0), 
      fee: Number(data.fee || 0), 
      value: Number(data.value || 0) 
    };

    if (type === 'crm') {
      const { data: saved } = await supabase.from('leads').upsert({ ...novoItem, id }).select();
      if (saved) setLeads(prev => id ? prev.map(l => l.id === id ? saved[0] : l) : [...prev, saved[0]]);
    }
    
    if (type === 'gigs') {
      const { data: savedGig } = await supabase.from('gigs').upsert({ ...novoItem, id }).select();
      if (savedGig) {
        setGigs(prev => id ? prev.map(g => g.id === id ? savedGig[0] : g) : [...prev, savedGig[0]]);
        if (data.received && !id) {
          const trans = { date: data.date, description: `Cachê: ${data.venue}`, amount: Number(data.fee), type: 'entrada', user_id: currentUserId, category: 'Show' };
          const { data: savedFin } = await supabase.from('finance').insert([trans]).select();
          if (savedFin) setFinance(prev => [...prev, savedFin[0]]);
        }
      }
    }

    if (type === 'finance') {
      const { data: saved } = await supabase.from('finance').upsert({ ...novoItem, id }).select();
      if (saved) setFinance(prev => id ? prev.map(t => t.id === id ? saved[0] : t) : [...prev, saved[0]]);
    }

    if (type === 'userManagement') setAllUsers(prev => [...prev, { ...data, id: `u-${Date.now()}`, role: data.role || 'usuario', categories: ['Geral'] }]);
    
    if (type === 'categories') {
      const lista = data.categories.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
      setAllUsers(prev => prev.map(u => u.id === currentUserId ? { ...u, categories: lista } : u));
    }

    setModalOpen({ type: null, data: null });
  };

  if (!user) return <LoginPage onLogin={(u: any, p: any) => {
    const achado = allUsers.find(x => x.loginName === u && x.password === p);
    if (achado) { setUser(achado); return true; }
    return false;
  }} />;

  return (
    <div className="min-h-screen bg-black text-white flex font-sans selection:bg-indigo-500/30">
      
      {/* BOTÃO HAMBÚRGUER PARA CELULAR */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-indigo-400 shadow-2xl"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* MENU LATERAL RESPONSIVO */}
      <aside className={`
        w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col fixed h-full z-40 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:relative
      `}>
        <h1 className="text-2xl font-bold text-indigo-400 mb-10 tracking-tighter italic">Musicianos</h1>
        <nav className="flex-grow space-y-1">
          <MenuBtn active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <MenuBtn active={currentView === 'gigs'} onClick={() => { setCurrentView('gigs'); setIsSidebarOpen(false); }} icon={<Briefcase size={20}/>} label="Shows / Agenda" />
          <MenuBtn active={currentView === 'crm'} onClick={() => { setCurrentView('crm'); setIsSidebarOpen(false); }} icon={<Users size={20}/>} label="CRM / Leads" />
          <MenuBtn active={currentView === 'finance'} onClick={() => { setCurrentView('finance'); setIsSidebarOpen(false); }} icon={<DollarSign size={20}/>} label="Financeiro" />
          {isAdmin && <MenuBtn active={currentView === 'userManagement'} onClick={() => { setCurrentView('userManagement'); setIsSidebarOpen(false); }} icon={<UserCheck size={20}/>} label="Painel Admin" />}
        </nav>
        <div className="mt-auto pt-6 border-t border-zinc-800 text-sm">
          <p className="text-zinc-500 uppercase text-[10px] font-black">Músico Logado</p>
          <p className="font-bold text-indigo-300 truncate">{user.name}</p>
          <button onClick={() => setUser(null)} className="flex items-center mt-4 text-red-400 hover:text-red-300 transition-colors"><LogOut size={16} className="mr-2"/> Sair</button>
        </div>
      </aside>

      {/* OVERLAY PARA FECHAR MENU AO CLICAR FORA (MOBILE) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {currentView === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500 mt-10 md:mt-0">
            <header className="flex justify-between items-end border-b border-indigo-500/30 pb-4">
              <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">Dashboard BI</h2>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-black uppercase">Saldo Total</p>
                <p className={`text-2xl md:text-3xl font-black ${biData.saldoGeral >= 0 ? 'text-teal-400' : 'text-red-500'}`}>R$ {biData.saldoGeral.toLocaleString('pt-BR')}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InteractiveCard title="Entradas Totais" value={biData.entradasTotal} icon={<ArrowUpCircle className="text-teal-400" size={24}/>} color="border-teal-500" onClick={() => setModalOpen({type: 'detail_in', data: null})} />
              <InteractiveCard title="Saídas Totais" value={biData.saidasTotal} icon={<ArrowDownCircle className="text-red-400" size={24}/>} color="border-red-500" onClick={() => setModalOpen({type: 'detail_out', data: null})} />
              <div className="p-8 bg-zinc-900 rounded-[32px] border-l-8 border-indigo-500 shadow-2xl">
                <p className="text-zinc-500 text-[10px] font-black uppercase mb-4">Despesas por Categoria</p>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                  {biData.despesas.map(([cat, val]: any) => (
                    <div key={cat} className="flex justify-between text-xs border-b border-zinc-800 pb-1">
                      <span className="text-zinc-400 uppercase font-bold">{cat}</span>
                      <span className="font-black text-red-400">R$ {val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-8">Funil de Negociação</h3>
              <div className="flex gap-4 h-24 items-end">
                <MiniBar label="Novos" val={fLeads.filter(l=>l.status==='novo').length} color="bg-yellow-500" total={fLeads.length} />
                <MiniBar label="Negociando" val={fLeads.filter(l=>l.status==='negociando').length} color="bg-indigo-500" total={fLeads.length} />
                <MiniBar label="Fechados" val={fLeads.filter(l=>l.status==='fechado').length} color="bg-teal-500" total={fLeads.length} />
              </div>
            </div>
          </div>
        )}

        {currentView === 'gigs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2 duration-300 mt-10 md:mt-0">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-indigo-500/30 pb-4 gap-4">
                <h2 className="text-3xl font-black uppercase italic">Meus Shows</h2>
                <button onClick={() => setModalOpen({ type: 'gigs', data: null })} className="bg-indigo-600 w-full md:w-auto px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all font-bold">
                  <PlusCircle size={20} className="mr-2"/> Novo Show
                </button>
              </div>
              <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-x-auto shadow-2xl">
                <table className="w-full text-left text-sm min-w-[400px]">
                  <tbody className="divide-y divide-zinc-800">
                    {fGigs.map(g => (
                      <tr key={g.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                        <td className="p-5"><div>{g.venue}</div><div className="text-[10px] text-zinc-600 uppercase font-black">{g.date}</div></td>
                        <td className="p-5 text-right font-black italic text-teal-400">R$ {g.fee.toFixed(2)}</td>
                        <td className="p-5 text-center space-x-3">
                          <button onClick={() => setModalOpen({ type: 'gigs', data: g })} className="text-indigo-400"><Edit2 size={16}/></button>
                          <button onClick={async () => {if(confirm("Excluir?")) { await supabase.from('gigs').delete().eq('id', g.id); setGigs(gigs.filter(x=>x.id!==g.id))}}} className="text-red-900"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl h-fit">
              <div className="flex items-center mb-6 text-indigo-400">
                <CalendarIcon className="mr-3" size={24} />
                <h3 className="text-xl font-black italic uppercase">Calendário de Agenda</h3>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-center text-[10px] font-black text-zinc-600 pb-2">{d}</div>)}
                {Array.from({length: 31}, (_, i) => {
                  const dataStr = `2026-04-${String(i+1).padStart(2, '0')}`;
                  const temShow = fGigs.some(g => g.date === dataStr);
                  return (
                    <div key={i} className={`h-8 md:h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${temShow ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(currentView === 'finance' || currentView === 'crm' || currentView === 'userManagement') && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300 mt-10 md:mt-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-indigo-500/30 pb-4 gap-4">
              <h2 className="text-3xl font-black uppercase italic">{currentView === 'crm' ? 'CRM' : currentView === 'finance' ? 'Financeiro' : 'Painel Admin'}</h2>
              <div className="flex gap-2 w-full md:w-auto">
                {currentView === 'finance' && (
                  <button onClick={() => setModalOpen({type: 'categories', data: null})} className="bg-zinc-800 flex-1 md:flex-none px-4 py-2 rounded-xl flex items-center justify-center hover:bg-zinc-700 text-xs font-bold border border-zinc-700 transition-all">
                    <Settings size={16} className="mr-2"/> Categorias
                  </button>
                )}
                <button onClick={() => setModalOpen({ type: currentView, data: null })} className="bg-indigo-600 flex-1 md:flex-none px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all font-bold">
                  <PlusCircle size={20} className="mr-2"/> Novo
                </button>
              </div>
            </div>
            <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-x-auto shadow-2xl">
              <table className="w-full text-left text-sm min-w-[450px]">
                <tbody className="divide-y divide-zinc-800">
                  {currentView === 'crm' && fLeads.map(l => (
                    <DataRow key={l.id} title={l.name} sub={l.venue} val={l.status.toUpperCase()} onEdit={() => setModalOpen({ type: 'crm', data: l })} onDelete={async () => {if(confirm("Excluir?")) { await supabase.from('leads').delete().eq('id', l.id); setLeads(leads.filter(x=>x.id!==l.id))}}} />
                  ))}
                  {currentView === 'finance' && fFinance.map(t => (
                    <DataRow key={t.id} title={t.description} sub={`${t.date} | ${t.category}`} val={`R$ ${t.amount.toFixed(2)}`} isPositive={t.type === 'entrada'} onDelete={async () => {if(confirm("Excluir?")) { await supabase.from('finance').delete().eq('id', t.id); setFinance(finance.filter(x=>x.id!==t.id))}}} hideEdit />
                  ))}
                  {currentView === 'userManagement' && allUsers.map(u => (
                    <DataRow key={u.id} title={u.name} sub={u.role.toUpperCase()} val={u.loginName} onDelete={() => {if(u.id !== user?.id && confirm("Excluir?")) setAllUsers(allUsers.filter(x=>x.id!==u.id))}} hideEdit />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL UNIFICADO */}
      {modalOpen.type && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className={`bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-[40px] w-full shadow-2xl relative overflow-y-auto max-h-[90vh] ${modalOpen.type.startsWith('detail_') ? 'max-w-2xl' : 'max-w-md'}`}>
            <button onClick={() => setModalOpen({type: null, data: null})} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24}/></button>
            <h3 className="text-xl md:text-2xl font-black mb-8 text-indigo-400 uppercase italic">
              {modalOpen.type === 'categories' ? 'Minhas Categorias' : 
               modalOpen.type === 'detail_in' ? 'Maiores Clientes' : 
               modalOpen.type === 'detail_out' ? 'Distribuição de Custos' :
               `${modalOpen.data ? 'Editar' : 'Novo'} ${modalOpen.type}`}
            </h3>

            {modalOpen.type === 'categories' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                salvarRegistro('categories', Object.fromEntries(new FormData(e.currentTarget)));
              }} className="space-y-4">
                <p className="text-[10px] text-zinc-500 uppercase font-black mb-2 italic">Separe as categorias por vírgula:</p>
                <textarea name="categories" defaultValue={userCategories.join(', ')} className="w-full p-5 bg-zinc-800 rounded-3xl border border-zinc-700 outline-none h-32 focus:border-indigo-500 text-white" required />
                <button type="submit" className="w-full p-5 bg-indigo-600 rounded-3xl font-black uppercase">Salvar Categorias</button>
              </form>
            )}

            {modalOpen.type === 'detail_in' && (
              <div className="space-y-3 pr-2">
                {biData.clientes.map(([nome, valor]: any) => (
                  <div key={nome} className="flex justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                    <span className="font-bold text-sm">{nome}</span>
                    <span className="text-teal-400 font-black text-sm">R$ {valor.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {modalOpen.type === 'detail_out' && (
              <div className="space-y-3 pr-2">
                {biData.despesas.map(([cat, valor]: any) => (
                  <div key={cat} className="flex justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                    <span className="font-bold uppercase text-xs">{cat}</span>
                    <span className="text-red-400 font-black text-sm">R$ {valor.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {!modalOpen.type.startsWith('detail_') && modalOpen.type !== 'categories' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                await salvarRegistro(modalOpen.type!, Object.fromEntries(new FormData(e.currentTarget)));
              }} className="space-y-4">
                {modalOpen.type === 'crm' && (
                  <>
                    <input name="name" defaultValue={modalOpen.data?.name} placeholder="Nome do Lead" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <input name="venue" defaultValue={modalOpen.data?.venue} placeholder="Local Provável" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" />
                    <input name="date" type="date" defaultValue={modalOpen.data?.date || '2026-04-13'} className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <select name="status" defaultValue={modalOpen.data?.status || 'novo'} className="w-full p-4 bg-zinc-800 rounded-2xl uppercase font-black text-xs text-white outline-none">
                      {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </>
                )}
                {modalOpen.type === 'gigs' && (
                  <>
                    <input name="venue" defaultValue={modalOpen.data?.venue} placeholder="Casa de Show" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <input name="date" type="date" defaultValue={modalOpen.data?.date || '2026-04-13'} className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <input name="fee" type="number" defaultValue={modalOpen.data?.fee} placeholder="Cachê R$" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <label className="flex items-center space-x-3 p-4 bg-zinc-800 rounded-2xl cursor-pointer">
                      <input name="received" type="checkbox" defaultChecked={modalOpen.data?.received} className="w-6 h-6 accent-indigo-600" />
                      <span className="text-[10px] md:text-sm font-bold uppercase italic">Cachê Recebido? (Lança em Finanças)</span>
                    </label>
                  </>
                )}
                {modalOpen.type === 'finance' && (
                  <>
                    <input name="description" defaultValue={modalOpen.data?.description} placeholder="Descrição" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <input name="amount" type="number" defaultValue={modalOpen.data?.amount} placeholder="Valor R$" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <select name="category" className="w-full p-4 bg-zinc-800 rounded-2xl uppercase font-black text-xs text-white outline-none">
                      {userCategories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                    </select>
                    <select name="type" defaultValue={modalOpen.data?.type || 'entrada'} className="w-full p-4 bg-zinc-800 rounded-2xl uppercase font-black text-xs text-white outline-none">
                      <option value="entrada">ENTRADA (+)</option>
                      <option value="saida">SAÍDA (-)</option>
                    </select>
                    <input name="date" type="date" defaultValue={modalOpen.data?.date || '2026-04-13'} className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                  </>
                )}
                {modalOpen.type === 'userManagement' && (
                  <>
                    <input name="name" placeholder="Nome do Músico" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <input name="loginName" placeholder="Usuário" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <input name="password" type="password" placeholder="Senha" className="w-full p-4 bg-zinc-800 rounded-2xl text-white outline-none" required />
                    <select name="role" className="w-full p-4 bg-zinc-800 rounded-2xl uppercase font-black text-xs text-white outline-none"><option value="usuario">MÚSICO</option><option value="admin">ADMIN</option></select>
                  </>
                )}
                <button type="submit" className="w-full p-5 bg-indigo-600 rounded-[30px] font-black uppercase tracking-widest hover:scale-105 transition-all text-white">Salvar Registro</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Componentes Reutilizáveis ---
const MenuBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center w-full p-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl italic font-black' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white font-bold'}`}>
    {icon} <span className="ml-4 text-sm">{label}</span>
  </button>
);

const InteractiveCard = ({ title, value, icon, color, onClick, isHistory }: any) => (
  <button onClick={onClick} className={`text-left p-6 md:p-8 bg-zinc-900 rounded-[32px] border-l-8 ${color} shadow-2xl hover:scale-[1.02] transition-all group relative overflow-hidden`}>
    <div className="flex justify-between mb-4">
      <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{title}</span>
      {icon}
    </div>
    <p className="text-xl md:text-3xl font-black italic">
      {isHistory ? 'Último Mês' : 'Total'} <br/>
      <span className="text-white">R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
    </p>
    <div className="mt-4 text-[10px] text-indigo-500 font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Detalhes →</div>
  </button>
);

const MiniBar = ({ label, val, total, color }: any) => (
  <div className="flex-1 flex flex-col justify-end">
    <div className="flex justify-between items-end mb-1"><span className="text-[10px] font-black text-zinc-400">{val}</span></div>
    <div className={`w-full ${color} rounded-t-md transition-all`} style={{ height: `${(val/(total||1))*100}%`, minHeight: '4px' }}></div>
    <span className="text-[8px] text-zinc-600 font-black uppercase mt-2 text-center leading-tight">{label}</span>
  </div>
);

const DataRow = ({ title, sub, val, isPositive, onEdit, onDelete, hideEdit }: any) => (
  <tr className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
    <td className="p-5">
      <div className="font-bold text-zinc-200 text-sm md:text-base">{title}</div>
      <div className="text-[10px] text-zinc-600 uppercase font-black">{sub}</div>
    </td>
    <td className={`p-5 text-right font-black italic text-xs md:text-sm ${isPositive ? 'text-teal-400' : 'text-zinc-400'}`}>{val}</td>
    <td className="p-5 text-center space-x-4">
      {!hideEdit && <button onClick={onEdit} className="text-indigo-500 hover:text-white transition-colors"><Edit2 size={18}/></button>}
      <button onClick={onDelete} className="text-red-900 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
    </td>
  </tr>
);

const LoginPage = ({ onLogin }: any) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm bg-zinc-900 p-8 md:p-12 rounded-[50px] border border-zinc-800 shadow-2xl">
        <h2 className="text-3xl md:text-4xl font-black text-center text-indigo-500 italic mb-10 tracking-tighter uppercase">Musicianos</h2>
        <div className="space-y-4 text-center">
          <input placeholder="USUÁRIO" className="w-full p-5 bg-zinc-800 rounded-3xl border border-zinc-700 focus:border-indigo-500 outline-none font-bold text-center text-white" onChange={e => setU(e.target.value)} />
          <input type="password" placeholder="SENHA" className="w-full p-5 bg-zinc-800 rounded-3xl border border-zinc-700 focus:border-indigo-500 outline-none font-bold text-center text-white" onChange={e => setP(e.target.value)} />
          <button onClick={() => onLogin(u, p)} className="w-full p-5 bg-indigo-600 rounded-3xl font-black text-white shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all uppercase mt-4">Entrar</button>
        </div>
      </div>
    </div>
  );
};