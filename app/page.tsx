'use client';
import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, UploadCloud, Scale, CalendarDays, ClipboardCheck, Copy, RotateCcw, ShieldCheck, Download, AlertCircle, Clock3, CheckCircle2, LoaderCircle, ArrowRight } from 'lucide-react';

type Resultado = {markdown:string; paginas:number;arquivo:string;audiencia:string|null;inicio:string|null;modelo:string;versao:string;periciaDetectada:boolean;itensPericiais:{item6:boolean;item8:boolean;item9:boolean}};
export default function Home() {
  const [file, setFile] = useState<File|null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resultado|null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function select(f?:File) { if(!f)return; setFile(f);setData(null);setError(''); }
  async function analyze() {
    if (!file || loading) return;
    setLoading(true);setError('');setData(null);
    try {
      const fd = new FormData(); fd.append('arquivo',file);
      const res = await fetch('/api/analisar',{method:'POST',body:fd});
      const json = await res.json();
      if (!res.ok) throw Error(json.error || 'Não foi possível analisar o arquivo.');
      setData(json);
    } catch(e:any) {setError(e?.message || 'Falha inesperada.');}
    finally {setLoading(false);}
  }
  async function copyText() {if(!data)return;await navigator.clipboard.writeText(data.markdown);setCopied(true);setTimeout(()=>setCopied(false),1800);}
  function download() {if(!data)return; const blob=new Blob([data.markdown],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`analise-${file?.name.replace(/\.pdf$/i,'')||'ata'}.md`;a.click();URL.revokeObjectURL(url);}
  function reset() {setFile(null);setData(null);setError('');if(input.current)input.current.value='';}
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Scale size={23}/></div><div><strong>GITAÍ</strong><span>CONTROLADORIA JURÍDICA</span></div></div><div className="top-right"><span className="online"><span className="online-dot"/> Leitor de Atas</span><span className="version">Versão 3.0</span></div></header>
    <section className="hero"><div className="eyebrow"><ShieldCheck size={15}/> INTELIGÊNCIA APLICADA À CONTROLADORIA</div><h1>Transforme atas de audiência<br/><em>em agendamentos precisos.</em></h1><p>Identifique prazos, perícias, acordos e novas audiências. Tudo organizado no padrão de lançamento jurídico, com transcrição das determinações.</p><div className="hero-chips"><span><CalendarDays size={15}/> Datas e vencimentos</span><span><ClipboardCheck size={15}/> Providências completas</span><span><FileText size={15}/> Trechos da ata</span></div></section>
    <section className="workspace"><div className="panel-label"><span className="step">01</span><div><h2>Enviar ata de audiência</h2><p>Selecione um PDF para iniciar a análise detalhada.</p></div></div>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e=>select(e.target.files?.[0])}/>
      <div role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')input.current?.click();}} className={`drop ${file?'selected':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();select(e.dataTransfer.files?.[0]);}} onClick={()=>input.current?.click()}>
        <div className="drop-icon">{file?<FileText size={26}/>:<UploadCloud size={28}/>}</div>
        <div className="drop-main">{file?file.name:'Clique para selecionar ou arraste o PDF até aqui'}</div>
        <div className="drop-sub">{file?`${(file.size/1024/1024).toFixed(2)} MB · PDF selecionado`:'Arquivos PDF de até 12 MB'}</div>
        <span className="drop-action">{file?'Trocar documento':'Escolher arquivo'} <ArrowRight size={14}/></span>
      </div>
      <div className="bottom-action"><div className="privacy"><ShieldCheck size={16}/> A chave de IA permanece no servidor. Não é enviada ao navegador.</div><div className="actions">{file&&<button className="btn ghost" onClick={reset}><RotateCcw size={16}/> Limpar</button>}<button disabled={!file||loading} className="btn primary" onClick={analyze}>{loading?<LoaderCircle className="spin" size={18}/>:<Scale size={17}/>} {loading?'Analisando ata...':'Analisar ata'}</button></div></div>
      {error && <div className="error"><AlertCircle size={18}/>{error}</div>}
    </section>
    {loading && <div className="loading-panel"><LoaderCircle size={24} className="spin"/><strong>Leitura e conferência em andamento</strong><p>Extraindo o texto, identificando determinações e conferindo os agendamentos.</p></div>}
    {data && <section className="results"><div className="results-head"><div className="panel-label"><span className="step">02</span><div><h2>Resultado da análise</h2><p>{data.paginas} {data.paginas===1?'página':'páginas'} analisadas · {data.arquivo}</p></div></div><div className="results-actions"><button onClick={copyText} className="btn outline">{copied?<CheckCircle2 size={16}/>:<Copy size={16}/>} {copied?'Copiado':'Copiar texto'}</button><button onClick={download} className="btn outline"><Download size={16}/> Baixar .md</button></div></div>
      <div className="report-meta"><span><CalendarDays size={15}/> Audiência: <b>{data.audiencia||'a confirmar'}</b></span><span><Clock3 size={15}/> Data início: <b>{data.inicio||'a confirmar'}</b></span><span><ShieldCheck size={15}/> Motor: <b>{data.versao || "versão antiga"}</b></span><span>Modelo: <b>{data.modelo}</b></span></div>
      <article className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{data.markdown}</ReactMarkdown></article>
      <div className="disclaimer"><AlertCircle size={17}/><span>Confira a publicação/intimação, o calendário judicial aplicável e o PDF original antes de lançar prazos fatais. A IA auxilia a controladoria, mas não substitui a conferência profissional.</span></div>
    </section>}
    <footer><span>GITAÍ · Controladoria Jurídica</span><span>Precisão no acompanhamento. Clareza na execução.</span></footer>
  </main>;
}
