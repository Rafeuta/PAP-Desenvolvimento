// Funcionalidades administrativas adicionais do FindIT School
const STAFF_REGISTRATION_TEMPLATE = 'template_1v48z3l';
const ADMIN_NOTICE_EMAIL = 'rafaelrodrigues.164049@etpc.pt';

function adminFeatureToast(title, message, type='success') {
  if (typeof mostrarNotificacao === 'function') mostrarNotificacao(title, message, type === 'error' ? 'erro' : undefined);
  else alert(title + ': ' + message);
}
function adminFeatureEscape(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function carregarPedidosRegisto() {
  const host = document.getElementById('staff-requests-list');
  if (!host) return;
  const {data,error}=await supabaseClient.from('pedidos_registo').select('*').order('criado_em',{ascending:false});
  if(error){host.textContent='Não foi possível carregar pedidos: '+error.message;return;}
  const pendentes=(data||[]).filter(p=>p.estado==='pendente');
  host.innerHTML=pendentes.length?pendentes.map(p=>`
    <article class="border rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center">
      <div><strong>${adminFeatureEscape(p.nome)}</strong><p class="text-sm text-gray-600">${adminFeatureEscape(p.email)} · ${adminFeatureEscape(p.turma)}</p><p class="text-xs text-gray-400">${new Date(p.criado_em).toLocaleString('pt-PT')}</p></div>
      <div class="flex gap-2"><button class="px-3 py-2 rounded bg-green-700 text-white text-sm" onclick="decidirPedidoRegisto('${p.id}',true)">Aprovar</button><button class="px-3 py-2 rounded bg-red-600 text-white text-sm" onclick="decidirPedidoRegisto('${p.id}',false)">Rejeitar</button></div>
    </article>`).join(''):'<p class="text-sm text-gray-500">Não existem pedidos pendentes.</p>';
}
async function decidirPedidoRegisto(id,aprovar) {
  const acao=aprovar?'aprovar':'rejeitar';
  if(!confirm('Queres '+acao+' este pedido de registo?')) return;
  const {error}=await supabaseClient.rpc('decidir_pedido_registo',{pedido_id:id,aprovar});
  if(error){adminFeatureToast('Erro',error.message,'error');return;}
  adminFeatureToast('Pedido atualizado','O pedido foi '+(aprovar?'aprovado.':'rejeitado.'));
  carregarPedidosRegisto();
}
async function gerarCodigoFuncionario() {
  const btn=document.getElementById('btn-gerar-codigo');
  if(btn){btn.disabled=true;btn.textContent='A gerar…';}
  try {
    const {data,error}=await supabaseClient.rpc('generate_staff_registration_code');
    if(error) throw error;
    document.getElementById('codigo-funcionario').textContent=data;
    document.getElementById('codigo-expira').textContent='Válido durante 3 minutos. A geração de outro código invalida este.';
    try { await navigator.clipboard.writeText(data); adminFeatureToast('Código gerado','O código foi copiado.'); }
    catch { adminFeatureToast('Código gerado','Copia o código apresentado.'); }
  } catch(e){adminFeatureToast('Erro',e.message,'error');}
  finally {if(btn){btn.disabled=false;btn.textContent='Gerar código (3 min)';}}
}
function montarPainelAdminExtra() {
 const main=document.querySelector('main'); if(!main || document.getElementById('staff-requests-section')) return;
 const section=document.createElement('section');
 section.id='staff-requests-section'; section.className='bg-white border border-gray-200 rounded-xl p-5 space-y-4';
 section.innerHTML=`<div><h2 class="text-base font-bold text-[#0b1b3d]">Acessos de funcionários</h2><p class="text-sm text-gray-500">Gera um código de utilização única e gere os pedidos de registo.</p></div>
 <div class="flex flex-wrap items-center gap-3"><button id="btn-gerar-codigo" onclick="gerarCodigoFuncionario()" class="px-4 py-2 rounded-lg bg-[#0f3b7a] text-white text-sm font-semibold">Gerar código (3 min)</button><strong id="codigo-funcionario" class="font-mono tracking-widest text-lg"></strong></div><p id="codigo-expira" class="text-xs text-gray-500"></p>
 <div class="border-t pt-4"><h3 class="font-semibold mb-3">Pedidos de registo pendentes</h3><div id="staff-requests-list" class="space-y-3">A carregar…</div></div>`;
 main.prepend(section); carregarPedidosRegisto();
 const contactSection=document.getElementById('contactos');
 if(contactSection && !document.getElementById('excel-import-panel')) {
   const panel=document.createElement('div'); panel.id='excel-import-panel'; panel.className='bg-white border border-gray-200 rounded-xl p-5 mt-4 space-y-3';
   panel.innerHTML=`<h3 class="font-bold text-[#0b1b3d]">Importar contactos de Excel</h3><p class="text-sm text-gray-500">Ficheiros .xlsx, .xls ou .csv. A coluna email é obrigatória; nome e turma são opcionais.</p>
   <input id="excel-contact-file" type="file" accept=".xlsx,.xls,.csv" class="block text-sm">
   <div id="excel-import-options" class="hidden space-y-3"><label class="block text-sm">Modo de importação<select id="excel-mode" class="block border rounded p-2 mt-1 w-full"><option value="add">Adicionar novos contactos</option><option value="update">Atualizar contactos existentes pelo email</option><option value="fields">Atualizar apenas campos escolhidos</option><option value="replace">Substituir todos os contactos</option></select></label>
   <div id="excel-fields" class="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" value="nome" checked> Nome</label><label><input type="checkbox" value="turma" checked> Turma</label></div><div id="excel-preview" class="text-sm text-gray-600"></div><button id="excel-import-run" class="px-4 py-2 bg-[#0f3b7a] text-white rounded-lg font-semibold">Executar importação</button></div><p id="excel-import-status" class="text-sm"></p>`;
   contactSection.appendChild(panel);
   configurarImportacaoExcel();
 }
}
let excelRows=[];
function configurarImportacaoExcel(){
 const file=document.getElementById('excel-contact-file'), mode=document.getElementById('excel-mode'), fields=document.getElementById('excel-fields');
 file.addEventListener('change',async()=>{
  const f=file.files[0]; if(!f)return;
  const data=await f.arrayBuffer(), wb=XLSX.read(data,{type:'array'}), rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
  excelRows=rows.map(r=>{const norm={};Object.keys(r).forEach(k=>norm[String(k).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')]=r[k]);return {nome:String(norm.nome||norm.name||'').trim(),email:String(norm.email||norm['e-mail']||'').trim().toLowerCase(),turma:String(norm.turma||norm.classe||'').trim()};}).filter(r=>r.email);
  document.getElementById('excel-import-options').classList.remove('hidden');
  document.getElementById('excel-preview').textContent=excelRows.length+' linhas válidas detetadas. Exemplos: '+excelRows.slice(0,3).map(r=>r.nome+' ('+r.email+')').join('; ');
 });
 mode.addEventListener('change',()=>fields.classList.toggle('hidden',mode.value!=='fields'));
 document.getElementById('excel-import-run').addEventListener('click',executarImportacaoExcel);
}
async function executarImportacaoExcel(){
 if(!excelRows.length){adminFeatureToast('Importação','Seleciona primeiro um ficheiro válido.','error');return;}
 const mode=document.getElementById('excel-mode').value;
 if(mode==='replace'&&!confirm('ATENÇÃO: vais substituir a lista completa de contactos. Continuar?'))return;
 const {data:existing,error:loadError}=await supabaseClient.from('contactos_email').select('id,email');
 if(loadError){adminFeatureToast('Erro',loadError.message,'error');return;}
 const current=existing||[], map=new Map(current.map(c=>[c.email.toLowerCase(),c.id]));
 const unique=new Map(); excelRows.forEach(r=>unique.set(r.email,r)); const rows=[...unique.values()];
 let payload=[];
 if(mode==='add') payload=rows.filter(r=>!map.has(r.email));
 if(mode==='update') payload=rows.filter(r=>map.has(r.email));
 if(mode==='fields') {
  const selected=[...document.querySelectorAll('#excel-fields input:checked')].map(x=>x.value);
  if(!selected.length){adminFeatureToast('Importação','Escolhe pelo menos um campo.','error');return;}
  payload=rows.filter(r=>map.has(r.email)).map(r=>{const p={email:r.email};selected.forEach(k=>p[k]=r[k]);return p;});
 } else if(mode==='add'||mode==='update') payload=payload.map(r=>({nome:r.nome,email:r.email,turma:r.turma}));
 if(mode==='replace'){
  const del=await supabaseClient.from('contactos_email').delete().not('id','is',null);
  if(del.error){adminFeatureToast('Erro',del.error.message,'error');return;}
  map.clear();
  payload=rows.map(r=>({nome:r.nome,email:r.email,turma:r.turma}));
 }
 let added=0,updated=0,failed=0;
 for(const p of payload){
  const exists=map.has(p.email);
  const result=exists?await supabaseClient.from('contactos_email').update(p).eq('email',p.email):await supabaseClient.from('contactos_email').insert(p);
  if(result.error)failed++;else if(exists)updated++;else added++;
 }
 if(typeof carregarContactos==='function')await carregarContactos();
 document.getElementById('excel-import-status').textContent='Concluído: '+added+' adicionados, '+updated+' atualizados, '+failed+' falhas.';
 adminFeatureToast('Importação concluída',added+' adicionados; '+updated+' atualizados; '+failed+' falhas.',failed?'error':'success');
}
document.addEventListener('DOMContentLoaded',()=>{if(/admin\.html$/i.test(location.pathname))montarPainelAdminExtra();});
