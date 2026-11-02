'use client';
import { useRef, useState } from 'react';

type Outcome={resultado:string; avisos?:string[]; usage?:{input_tokens?:number;output_tokens?:number;total_tokens?:number}; modelo?:string};
export default function Home(){
 const [file,setFile]=useState<File|null>(null);
 const fileInput=useRef<HTMLInputElement|null>(null);
 const [text,setText]=useState('');
 const [access,setAccess]=useState('');
 const [loggedIn,setLoggedIn]=useState(false);
 const [authBusy,setAuthBusy]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [out,setOut]=useState<Outcome|null>(null);
 const [authError,setAuthError]=useState('');

 async function toggleAuth(){
  if(loggedIn){setLoggedIn(false);setAccess('');setAuthError('');setFile(null);if(fileInput.current)fileInput.current.value='';setOut(null);setError('');return;}
  if(!access){setAuthError('Digite a senha para entrar.');return;}
  setAuthBusy(true);setAuthError('');
  try{
   const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha:access}),cache:'no-store'});
   const j=await r.json();
   if(!r.ok||!j.ok)throw new Error(j.error||'Não foi possível validar a senha.');
   setLoggedIn(true);
  }catch(e){setLoggedIn(false);setAuthError(e instanceof Error?e.message:'Falha ao entrar.');}
  finally{setAuthBusy(false);}
 }
 function clearData(){setFile(null);if(fileInput.current)fileInput.current.value='';setOut(null);setError('');}
 async function analyze(e:React.FormEvent){
  e.preventDefault();if(!loggedIn){setError('Faça login antes de analisar a ata.');return;}
  setBusy(true);setError('');setOut(null);
  try{const fd=new FormData();if(file)fd.set('arquivo',file);if(text.trim())fd.set('texto',text.trim());const r=await fetch('/api/analisar',{method:'POST',body:fd,headers:{'x-app-access-key':access},cache:'no-store'});const j=await r.json();if(!r.ok){if(r.status===401){setLoggedIn(false);setAuthError('Sessão não autorizada. Entre novamente.');}throw new Error(j.error||'Erro ao analisar');}setOut(j);}
  catch(err){setError(err instanceof Error?err.message:'Falha desconhecida');}
  finally{setBusy(false);}
 }
 function saveTxt(){if(!out)return;const url=URL.createObjectURL(new Blob([out.resultado],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='agendamentos-ata.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <main>
  <header><div className="mark">⚖</div><div><h1>Prazos de Atas Trabalhistas</h1><p>Análise de atas</p></div></header>
  <section className="panel">
   <div className="panel-header"><h2>Analisar nova ata</h2><button type="button" className="secondary clear-btn" onClick={clearData}>Limpar Dados</button></div>
   <p className="muted">Anexe um PDF com texto selecionável ou cole a ata. As datas são calculadas com feriados nacionais; confirme suspensões locais e casos excepcionais.</p>
   <div className="auth-zone">
    <div className="auth-main"><label htmlFor="access">Senha de acesso ao sistema</label><div className="auth-controls"><input id="access" type="password" placeholder="Digite a senha" value={access} onChange={e=>{if(!loggedIn){setAccess(e.target.value);setAuthError('');}}} disabled={loggedIn||authBusy} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void toggleAuth();}}}/><button type="button" className={loggedIn?'logout-btn':'login-btn'} onClick={toggleAuth} disabled={authBusy||busy}>{authBusy?'Validando...':loggedIn?'Deslogar':'Entrar'}</button></div></div>
    <div className="status-area"><span className="status-caption">Status</span><span className={`status-pill ${loggedIn?'is-logged':'is-out'}`} role="status">{loggedIn?'Logado':'Não logado'}</span></div>
   </div>
   {authError&&<p className="error" role="alert">{authError}</p>}
   <form onSubmit={analyze}>
    <label>Arquivo PDF<input ref={fileInput} type="file" accept=".pdf,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    <div className="or">ou cole o texto da ata</div>
    <label><textarea rows={6} placeholder="Cole o conteúdo da ata aqui..." value={text} onChange={e=>setText(e.target.value)}/></label>
    <button type="submit" disabled={!loggedIn||busy||(!file&&!text.trim())}>{busy?'Analisando...':'Analisar ata e gerar agendamentos'}</button>
   </form>
   {error&&<p className="error" role="alert">{error}</p>}
  </section>
  {out&&<section className="panel output"><div className="toolbar"><h2>Agendamentos encontrados</h2><div><button type="button" className="secondary" onClick={()=>navigator.clipboard.writeText(out.resultado)}>Copiar</button><button type="button" className="secondary" onClick={saveTxt}>Exportar .txt</button></div></div>{out.avisos?.map((w,i)=><p key={i} className="warning">{w}</p>)}<pre>{out.resultado}</pre><p className="muted">Modelo: {out.modelo} · Tokens entrada: {out.usage?.input_tokens??'?'} · saída: {out.usage?.output_tokens??'?'}</p></section>}
  <footer>Uso jurídico profissional · confira prazos no PJe antes do lançamento definitivo.</footer>
 </main>;
}
