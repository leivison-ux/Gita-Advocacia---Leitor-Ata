'use client';
import {useEffect,useRef,useState} from 'react';

type Outcome={resultado:string;avisos?:string[];usage?:{input_tokens?:number;output_tokens?:number};modelo?:string;versao?:string;auditoriaPericia?:{detected:boolean;added:string[]}};
const MAX_PDF=12*1024*1024;
export default function Home(){
 const [password,setPassword]=useState(''),[access,setAccess]=useState(''),[authenticated,setAuthenticated]=useState(false),[authBusy,setAuthBusy]=useState(false),[loginError,setLoginError]=useState('');
 const [files,setFiles]=useState<File[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[out,setOut]=useState<Outcome|null>(null),[dragging,setDragging]=useState(false),[showPassword,setShowPassword]=useState(false),[copied,setCopied]=useState(false);
 const [liveVersion,setLiveVersion]=useState('V5.5 · Citações integrais');
 useEffect(()=>{let active=true;fetch('/api/versao',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(v=>{if(active&&v?.versao)setLiveVersion('V'+String(v.versao).split('-')[0]+' · Citações integrais');}).catch(()=>{});return()=>{active=false;}},[]);
 const inputRef=useRef<HTMLInputElement>(null);
 async function login(e:React.FormEvent){e.preventDefault();setAuthBusy(true);setLoginError('');try{const response=await fetch('/api/auth/verificar',{method:'POST',headers:{'x-app-access-key':password},cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Não foi possível validar a senha.');setAccess(password);setPassword('');setAuthenticated(true);}catch(e){setLoginError(e instanceof Error?e.message:'Falha de autenticação');}finally{setAuthBusy(false);}}
 function resetFiles(){setFiles([]);if(inputRef.current)inputRef.current.value='';}
 function clearFields(){resetFiles();setText('');setError('');}
 function clearResult(){setOut(null);setCopied(false);setError('');}
 function clearAll(){clearFields();clearResult();}
 function logout(){clearAll();setAccess('');setPassword('');setAuthenticated(false);setLoginError('');}
 function addFiles(input:FileList|File[]){const next=Array.from(input);if(next.length===0)return;const bad=next.find(f=>!(f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')));if(bad){setError('Apenas arquivos PDF são aceitos.');return;}const oversized=next.find(f=>f.size>MAX_PDF);if(oversized){setError(`O arquivo ${oversized.name} supera o limite de 12 MB.`);return;}setFiles(next);setError('');}
 async function analyze(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setOut(null);try{if(!authenticated)throw new Error('Entre no sistema para analisar a ata.');if(files.length>1)throw new Error('Selecione apenas um PDF por análise.');const fd=new FormData();if(files[0])fd.set('arquivo',files[0]);if(text.trim())fd.set('texto',text.trim());const response=await fetch('/api/analisar',{method:'POST',body:fd,headers:{'x-app-access-key':access},cache:'no-store'});const body=await response.json();if(!response.ok){if(response.status===401){logout();throw new Error('Acesso encerrado. Entre novamente.');}throw new Error(body.error||'Erro na análise.');}setOut(body);}catch(e){setError(e instanceof Error?e.message:'Erro inesperado.');}finally{setBusy(false);}}
 function exportTxt(){if(!out)return;const url=URL.createObjectURL(new Blob([out.resultado],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='gitai-agendamentos.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportPdf(){window.print();}
 async function copy(){if(!out)return;try{await navigator.clipboard.writeText(out.resultado);setCopied(true);}catch{setError('Não foi possível copiar; selecione o texto manualmente.');}}
 return <div className="page-shell">
  <header className="site-header"><div className="head-inner"><div className="brandmark">⚖</div><div className="brandname">Gitaí</div><div className="brandline"/><div className="branddesc"><h1>Leitor de Atas</h1><span>Controladoria Jurídica · SODEXO · FORTBRAS · CARREFOUR · WMS</span></div><div className="head-actions"><span className="version-pill">{liveVersion}</span></div></div></header>
  <main className="content-shell">
   <section className="workspace-card">
    <aside className="left-rail">
     <form onSubmit={login} className="login-widget"><h2><span aria-hidden="true">♙</span> Acesso à ferramenta</h2><label htmlFor="accesspass">Senha <span className="required">*</span></label><div className="password-wrap"><input id="accesspass" type={showPassword?'text':'password'} value={password} placeholder={authenticated?'Acesso autorizado':'Senha da equipe'} disabled={authenticated||authBusy} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/><button type="button" className="reveal" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'◉':'◎'}</button></div><div className="login-actions">{!authenticated?<button className="btn primary" disabled={authBusy||!password.trim()} type="submit">{authBusy?'Validando...':'Entrar'}</button>:<button className="btn neutral" type="button" onClick={logout}>Sair</button>}<span className={authenticated?'access-state ok':'access-state'}>{authenticated?'● Conectado':'● Acesso restrito'}</span></div>{loginError&&<p className="message error" role="alert">{loginError}</p>}</form>
     <div className="instructions"><h2><span aria-hidden="true">ⓘ</span> Como funciona?</h2><ol><li><span>1</span>Faça o login com a senha da equipe.</li><li><span>2</span>Envie o PDF da ata ou cole o texto.</li><li><span>3</span>Clique em Analisar ata.</li><li><span>4</span>Confira os agendamentos jurídicos abaixo.</li></ol></div>
    </aside>
    <div className="form-area"><form onSubmit={analyze}>
     <h2 className="section-title"><span className="mini-icon">▤</span> Arquivo PDF</h2>
     <div role="group" aria-label="Área para arrastar e soltar PDF" className={'dropzone'+(dragging?' dragging':'')+(files.length?' has-files':'')} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{e.preventDefault();setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files);}}>
      <div className="dropzone-inside"><div className="pdf-symbol" aria-hidden="true"><span>▤</span><span>PDF</span></div><button type="button" className="choose-button" onClick={()=>inputRef.current?.click()}><span>⊞</span> ESCOLHER ARQUIVOS <span className="choose-chevron">⌄</span></button><div className="drop-helper">ou solte arquivos aqui</div></div>
      <input ref={inputRef} aria-label="Selecionar PDF" className="visually-hidden" tabIndex={-1} type="file" accept="application/pdf,.pdf" onChange={e=>addFiles(e.target.files||[])} />
     </div>
     {files.map((f,i)=><div className="selected-file" key={`${f.name}-${i}`}><span>📄 {f.name} <small>({(f.size/1024/1024).toFixed(2)} MB)</small></span><button type="button" className="remove-file" onClick={resetFiles}>Remover</button></div>)}
     <h2 className="section-title paste-title"><span className="mini-icon">☷</span> Colar texto da ata <small>(opcional)</small></h2><textarea value={text} rows={4} aria-label="Colar texto da ata" placeholder="Cole aqui o texto integral da ata (se preferir analisar por texto)..." onChange={e=>setText(e.target.value)} />
     <div className="toolbar"><button className="btn primary main-action" type="submit" disabled={busy||!authenticated||(!files.length&&!text.trim())}>{busy?'Analisando...':'⌕  Analisar ata'}</button><button className="btn outline" type="button" disabled={busy} onClick={clearFields}>♧  Limpar campos</button><button className="btn outline" type="button" disabled={busy} onClick={clearResult}>▧  Limpar análise</button><button className="btn outline" type="button" disabled={busy} onClick={clearAll}>♜  Limpar tudo</button></div>
     {!authenticated&&<p className="helper-note">Entre com a senha para habilitar a análise. É possível selecionar o PDF antes do login.</p>}{files.length>1&&<p className="helper-note">Uma ata por análise.</p>}{error&&<p role="alert" className="message error">{error}</p>}
    </form></div>
   </section>
   <section className="results-card" id="results"><div className="results-header"><h2><span>▤</span> Resultado da Análise</h2><div className="result-actions"><button type="button" onClick={copy} disabled={!out} className="link-btn">{copied?'✓ Copiado':'Copiar'}</button><button type="button" onClick={exportTxt} disabled={!out} className="link-btn">Exportar TXT</button><button type="button" onClick={exportPdf} disabled={!out} className="link-btn">⇩ Exportar PDF</button></div></div>
    {!out?<div className="empty-result"><span>▤</span><strong>Nenhuma ata analisada nesta sessão</strong><p>O relatório completo de prazos e providências aparecerá aqui, sem substituir o conteúdo jurídico por resumos genéricos.</p></div>:<><div className="result-summary"><span className="summary-icon">⚖</span><div><strong>Agendamentos da ata trabalhista</strong><p>Modelo: {out.modelo||'Não informado'} · Processamento: {out.versao||'V4'}</p></div></div>{out.avisos?.map((av,i)=><div className="message warning" key={i}>{av}</div>)}<pre className="legal-report">{out.resultado}</pre></>}
   </section>
   <footer>Uso jurídico profissional · Confira prazos e intimações no PJe antes do lançamento definitivo.</footer>
  </main>
 </div>;
}
