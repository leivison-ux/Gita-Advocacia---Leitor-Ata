'use client';
import { useRef, useState } from 'react';

type Outcome = {
 resultado:string;
 avisos?:string[];
 usage?:{input_tokens?:number;output_tokens?:number;total_tokens?:number};
 modelo?:string;versao?:string;auditoriaPericia?:{detected:boolean;added:string[]};
};

export default function Home(){
 const [access,setAccess]=useState('');
 const [password,setPassword]=useState('');
 const [authenticated,setAuthenticated]=useState(false);
 const [authBusy,setAuthBusy]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const [text,setText]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [loginError,setLoginError]=useState('');
 const [out,setOut]=useState<Outcome|null>(null);
 const [fileKey,setFileKey]=useState(0);
 const fileInput=useRef<HTMLInputElement>(null);

 async function login(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setAuthBusy(true);setLoginError('');
  try{
   const response=await fetch('/api/auth/verificar',{method:'POST',headers:{'x-app-access-key':password},cache:'no-store'});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||'Não foi possível acessar o sistema.');
   setAccess(password);setPassword('');setAuthenticated(true);
  }catch(e){setLoginError(e instanceof Error?e.message:'Falha na autenticação.');}
  finally{setAuthBusy(false);}
 }

 function clearAll(){setFile(null);setText('');setOut(null);setError('');setFileKey(x=>x+1);if(fileInput.current)fileInput.current.value='';}
 function clearResult(){setOut(null);setError('');}
 function logout(){clearAll();setAccess('');setPassword('');setAuthenticated(false);setLoginError('');}

 async function analyze(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');setOut(null);
  try{
   const fd=new FormData();
   if(file)fd.set('arquivo',file);
   if(text.trim())fd.set('texto',text.trim());
   const response=await fetch('/api/analisar',{method:'POST',body:fd,headers:{'x-app-access-key':access},cache:'no-store'});
   const body=await response.json();
   if(!response.ok){if(response.status===401){logout();throw new Error('Sessão encerrada. Entre novamente.');}throw new Error(body.error||'Erro ao analisar a ata.');}
   setOut(body);
  }catch(e){setError(e instanceof Error?e.message:'Falha inesperada.');}
  finally{setBusy(false);}
 }

 function download(){if(!out)return;const url=URL.createObjectURL(new Blob([out.resultado],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='agendamentos-ata.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function copy(){if(!out)return;try{await navigator.clipboard.writeText(out.resultado)}catch{setError('Não foi possível copiar. Selecione o texto do relatório manualmente.');}}

 return <main className={authenticated?'workspace':'login-layout'}>
  <header className="topbar">
   <div className="identity"><div className="mark" aria-hidden="true">⚖</div><div><h1>Gitaí | Leitor de Atas</h1><p>Controladoria jurídica · SODEXO · FORTBRAS · CARREFOUR · WMS</p></div></div>
   {authenticated&&<button type="button" onClick={logout} className="ghost small">Sair</button>}
  </header>

  {!authenticated?<section className="panel login-card" aria-label="Entrar no sistema">
   <div className="eyebrow">ACESSO RESTRITO</div>
   <h2>Entrar no sistema</h2>
   <p className="muted">Informe a senha de acesso configurada para o Gitaí na Vercel.</p>
   <form onSubmit={login}>
    <label htmlFor="password">Senha de acesso
     <input id="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" required value={password} onChange={e=>setPassword(e.target.value)}/>
    </label>
    <button disabled={authBusy||!password.trim()}>{authBusy?'Verificando acesso...':'Entrar'}</button>
   </form>
   {loginError&&<p role="alert" className="error">{loginError}</p>}
   <p className="footnote">A senha é validada pelo servidor. Não é salva no navegador.</p>
  </section>:<>
   <div className="workspace-heading"><div><div className="eyebrow">PAINEL DE ANÁLISE</div><h2>Analisar ata de audiência</h2><p className="muted">Anexe um PDF com texto selecionável ou cole o conteúdo da ata. Os agendamentos são gerados pela lógica jurídica da versão V4.</p></div><span className="version">V4.1 · Login + Limpeza</span></div>
   <section className="panel" aria-label="Nova análise">
    <div className="section-heading"><h3>Nova análise</h3><button type="button" className="ghost" onClick={clearAll} disabled={busy}>Limpar tudo</button></div>
    <form onSubmit={analyze}>
     <label htmlFor="file">Arquivo da ata (PDF)
      <input ref={fileInput} key={fileKey} id="file" type="file" accept=".pdf,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/>
     </label>
     {file&&<div className="file-status"><span>📄 {file.name}</span><button type="button" className="linklike" onClick={()=>{setFile(null);setFileKey(x=>x+1)}} disabled={busy}>Remover arquivo</button></div>}
     <div className="or">OU COLE O TEXTO DA ATA</div>
     <label htmlFor="ata">Texto da ata
      <textarea id="ata" rows={7} value={text} placeholder="Cole o conteúdo da ata aqui..." onChange={e=>setText(e.target.value)} />
     </label>
     <div className="action-row"><button type="submit" disabled={busy||(!file&&!text.trim())}>{busy?'Analisando a ata...':'Analisar e gerar agendamentos'}</button><button type="button" className="secondary" disabled={busy} onClick={clearAll}>Limpar campos</button></div>
    </form>
    {error&&<p className="error" role="alert">{error}</p>}
   </section>
   {out&&<section className="panel output" aria-label="Resultado da análise">
    <div className="section-heading"><div><div className="eyebrow">RESULTADO</div><h3>Agendamentos encontrados</h3></div><div className="action-row compact"><button className="secondary" type="button" onClick={copy}>Copiar</button><button className="secondary" type="button" onClick={download}>Exportar .txt</button><button className="ghost" type="button" onClick={clearResult}>Limpar análise</button></div></div>
    {out.avisos?.map((item,index)=><p key={index} className="warning">{item}</p>)}
    <pre>{out.resultado}</pre>
    <p className="muted meta">Versão do processamento: {out.versao||'V4'} · Modelo: {out.modelo||'Não informado'} · Tokens de entrada: {out.usage?.input_tokens??'—'} · saída: {out.usage?.output_tokens??'—'}</p>
   </section>}
  </>}
  <footer>Uso jurídico profissional · confira os prazos no PJe antes do lançamento definitivo.</footer>
 </main>;
}
