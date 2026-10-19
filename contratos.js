import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC-qGBaWyOV2HJ7u3ljrC-rnxsbi3s4DSA",
    authDomain: "controle-os-6f169.firebaseapp.com",
    projectId: "controle-os-6f169",
    storageBucket: "controle-os-6f169.firebasestorage.app",
    messagingSenderId: "228838068945",
    appId: "1:228838068945:web:f30fc3e8e5a9e0c4b0ebf0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let listaGlobalContratos = [];
let contratoSelecionadoAtual = null;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        document.dispatchEvent(new Event("UsuarioAutenticado"));
    }
});

function fazerLogout() {
    signOut(auth).then(() => { window.location.href = "login.html"; });
}

function sanitizar(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener("UsuarioAutenticado", () => {
    carregarDadosContratos();
    carregarNotasGeraisNuvem();
});

function aplicarMascaraCNPJ(e) {
    let input = e.target;
    let v = input.value.replace(/\D/g, '');
    if (v.length > 14) v = v.substring(0, 14);

    if (v.length <= 2) {
        input.value = v;
    } else if (v.length <= 5) {
        input.value = v.replace(/^(\d{2})(\d+)/, '$1.$2');
    } else if (v.length <= 8) {
        input.value = v.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    } else if (v.length <= 12) {
        input.value = v.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
    } else {
        input.value = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
    }
}

function alternarPeriodicidade() {
    const tipo = document.getElementById('periodicidade').value;
    const blocoDia = document.getElementById('blocoDiaVencimento');
    const blocoData = document.getElementById('blocoDataVencimento');
    const inputDia = document.getElementById('diaVencimento');
    const inputData = document.getElementById('dataVencimentoAnual');

    if (tipo === 'MENSAL') {
        blocoDia.classList.remove('hidden');
        blocoData.classList.add('hidden');
        inputDia.required = true;
        inputData.required = false;
        inputData.value = '';
    } else {
        blocoDia.classList.add('hidden');
        blocoData.classList.remove('hidden');
        inputDia.required = false;
        inputData.value = '';
        inputData.required = true;
    }
}

async function salvarNotasGeraisNuvem() {
    const campo = document.getElementById('txtNotasGerais');
    const statusEl = document.getElementById('statusSalvarNotas');
    if (!campo || !statusEl) return;

    const texto = campo.value.trim().toUpperCase();
    
    try {
        statusEl.innerText = "Salvando na nuvem...";
        statusEl.className = "text-[11px] font-bold text-amber-600";

        await setDoc(doc(db, "hitech_config", "notas_gerais"), {
            conteudo: texto,
            ultimaAtualizacao: new Date().toISOString()
        });

        statusEl.innerText = "✓ Salvo na nuvem com sucesso!";
        statusEl.className = "text-[11px] font-bold text-emerald-600";
        
        setTimeout(() => { statusEl.innerText = ""; }, 4000);
    } catch (e) {
        console.error("Erro ao salvar notas na nuvem:", e);
        statusEl.innerText = "❌ Erro ao salvar!";
        statusEl.className = "text-[11px] font-bold text-red-600";
    }
}

async function carregarNotasGeraisNuvem() {
    const campo = document.getElementById('txtNotasGerais');
    const statusEl = document.getElementById('statusSalvarNotas');
    if (!campo) return;

    try {
        const docSnap = await getDoc(doc(db, "hitech_config", "notas_gerais"));
        if (docSnap.exists()) {
            const dados = docSnap.data();
            campo.value = dados.conteudo || '';
            if (statusEl) {
                statusEl.innerText = "✓ Sincronizado da nuvem";
                statusEl.className = "text-[11px] font-bold text-gray-400";
            }
        }
    } catch (error) {
        console.error("Erro ao carregar notas da nuvem:", error);
    }
}

async function carregarDadosContratos() {
    try {
        const querySnapshot = await getDocs(collection(db, "hitech_contratos"));
        listaGlobalContratos = [];
        querySnapshot.forEach((docSnap) => {
            listaGlobalContratos.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        atualizarSelectDiasDinamico();
        ordenarContratosAutomatico();
        verificarAlertasVencimento();
        filtrarDadosContratos();
    } catch (error) {
        console.error("Erro Contratos:", error);
    }
}

function atualizarSelectDiasDinamico() {
    const select = document.getElementById('filtroDiaVencimento');
    if (!select) return;

    const valorAtual = select.value;
    const diasUnicos = new Set();
    listaGlobalContratos.forEach(c => {
        if (c.periodicidade === 'MENSAL' && c.diaVencimento) {
            let diaNum = parseInt(c.diaVencimento, 10);
            if (!isNaN(diaNum)) diasUnicos.add(diaNum);
        }
    });

    const diasOrdenados = Array.from(diasUnicos).sort((a, b) => a - b);

    let html = '<option value="">TODOS OS DIAS</option>';
    diasOrdenados.forEach(dia => {
        html += `<option value="${dia}">DIA ${dia}</option>`;
    });

    select.innerHTML = html;
    select.value = valorAtual;
}

function obterDataObjetoContrato(c, hoje) {
    const anoAtual = hoje.getFullYear();
    const proximoMes = hoje.getMonth() + 1;

    if (c.periodicidade === 'ANUAL' && c.dataVencimentoAnual) {
        const partes = c.dataVencimentoAnual.split('-');
        return new Date(partes[0], partes[1] - 1, partes[2]);
    } else if (c.diaVencimento) {
        const diaVenc = parseInt(c.diaVencimento, 10);
        if (!isNaN(diaVenc)) {
            return new Date(anoAtual, proximoMes, diaVenc);
        }
    }
    return new Date(9999, 11, 31);
}

function ordenarContratosAutomatico() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    listaGlobalContratos.sort((a, b) => {
        let dataA = obterDataObjetoContrato(a, hoje);
        let dataB = obterDataObjetoContrato(b, hoje);
        return dataA - dataB;
    });

    filtrarDadosContratos();
}

function verificarAlertasVencimento() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const bannerAlerta = document.getElementById('alertaVencimentos');
    const listaAlerta = document.getElementById('listaContratosAlerta');
    if (!bannerAlerta || !listaAlerta) return;

    let avisos = [];

    listaGlobalContratos.forEach(c => {
        let dataVencObj = obterDataObjetoContrato(c, hoje);
        if (!dataVencObj) return;

        let textoVencimentoExibicao = "";
        if (c.periodicidade === 'ANUAL' && c.dataVencimentoAnual) {
            const partes = c.dataVencimentoAnual.split('-');
            textoVencimentoExibicao = `Data: ${partes[2]}/${partes[1]}/${partes[0]}`;
        } else {
            textoVencimentoExibicao = `Dia ${sanitizar(c.diaVencimento)}`;
        }

        const diffTempo = dataVencObj - hoje;
        const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

        if (diffDias <= 10) {
            let statusTexto = diffDias < 0 ? `Vencido há ${Math.abs(diffDias)} dia(s)` : diffDias === 0 ? `Vence HOJE!` : `Vence em ${diffDias} dia(s)`;
            avisos.push(`• <strong>${sanitizar(c.razaoSocial)}</strong> (Plano: ${sanitizar(c.plano) || 'PADRÃO'}) - ${textoVencimentoExibicao} - <span class="font-bold underline">${statusTexto}</span>`);
        }
    });

    if (avisos.length > 0) {
        listaAlerta.innerHTML = avisos.join('<br>');
        bannerAlerta.classList.remove('hidden');
    } else {
        bannerAlerta.classList.add('hidden');
    }
}

function atualizarContadoresContratos(dadosExibidos) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let regulares = 0;
    let vencendo = 0;

    listaGlobalContratos.forEach(c => {
        let dataVencObj = obterDataObjetoContrato(c, hoje);
        if (!dataVencObj) return;
        const diffDias = Math.ceil((dataVencObj - hoje) / (1000 * 60 * 60 * 24));
        if (diffDias <= 10) {
            vencendo++;
        } else {
            regulares++;
        }
    });

    if (document.getElementById('contadorTotalContratos')) {
        document.getElementById('contadorTotalContratos').innerText = listaGlobalContratos.length;
    }
    if (document.getElementById('contadorRegularesContratos')) {
        document.getElementById('contadorRegularesContratos').innerText = regulares;
    }
    if (document.getElementById('contadorVencendoContratos')) {
        document.getElementById('contadorVencendoContratos').innerText = vencendo;
    }
}

function renderizarContratos(dados) {
    const tbody = document.getElementById('tabelaCorpoContratos');
    if (!tbody) return;

    tbody.innerHTML = '';
    atualizarContadoresContratos(dados);

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-gray-400">Nenhum contrato encontrado para este filtro.</td></tr>`;
        return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    dados.forEach(c => {
        let vencimentoExibicao = "";
        let statusBadge = `<span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Regular</span>`;

        if (c.periodicidade === 'ANUAL' && c.dataVencimentoAnual) {
            const partes = c.dataVencimentoAnual.split('-');
            vencimentoExibicao = `${partes[2]}/${partes[1]}/${partes[0]}`;
            const dataVencObj = new Date(partes[0], partes[1] - 1, partes[2]);
            const diffDias = Math.ceil((dataVencObj - hoje) / (1000 * 60 * 60 * 24));
            if (diffDias <= 10) {
                statusBadge = `<span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Próximo / Vencido</span>`;
            }
        } else {
            vencimentoExibicao = `Dia ${sanitizar(c.diaVencimento) || ''}`;
            const diaVenc = parseInt(c.diaVencimento, 10);
            if (!isNaN(diaVenc)) {
                let dataVencObj = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVenc);
                const diffDias = Math.ceil((dataVencObj - hoje) / (1000 * 60 * 60 * 24));
                if (diffDias <= 10) {
                    statusBadge = `<span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Próximo / Vencido</span>`;
                }
            }
        }

        const badgePeriodicidade = c.periodicidade === 'ANUAL' 
            ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">ANUAL</span>' 
            : '<span class="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">MENSAL</span>';

        let iconeWap = c.whatsappContato ? `<span title="WhatsApp Cadastrado">🟢</span>` : `<span title="WhatsApp não cadastrado" class="opacity-30">⚪</span>`;
        let iconeEmail = c.emailContato ? `<span title="E-mail Cadastrado">📧</span>` : `<span title="E-mail não cadastrado" class="opacity-30">✉️</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition border-b">
                <td class="px-4 py-3">
                    <div class="font-bold text-gray-800 cursor-pointer text-orange-600 underline text-sm acao-tabela" data-action="detalhes" data-id="${c.id}">${sanitizar(c.razaoSocial)}</div>
                    <div class="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span>${iconeWap}</span>
                        <span>${iconeEmail}</span>
                    </div>
                </td>
                <td class="px-4 py-3 font-mono whitespace-nowrap cursor-pointer underline acao-tabela" data-action="detalhes" data-id="${c.id}">${sanitizar(c.cnpj) || 'Não informado'}</td>
                <td class="px-4 py-3 text-center font-bold text-orange-600">${sanitizar(c.plano) || 'Padrão'}</td>
                <td class="px-4 py-3 text-center">${badgePeriodicidade}</td>
                <td class="px-4 py-3 text-center font-bold text-sm whitespace-nowrap">${vencimentoExibicao}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3 coluna-obs">${sanitizar(c.observacao)}</td>
                <td class="px-4 py-3 text-center space-x-2 whitespace-nowrap acoes-esconder">
                    <button class="text-blue-600 font-bold cursor-pointer acao-tabela" data-action="editar" data-id="${c.id}">Editar</button>
                    <button class="text-red-600 font-bold cursor-pointer acao-tabela" data-action="excluir" data-id="${c.id}">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function abrirDetalhesContrato(id) {
    const c = listaGlobalContratos.find(item => item.id === id);
    if (!c) return;
    contratoSelecionadoAtual = c;

    document.getElementById('detalheRazaoSocial').innerText = sanitizar(c.razaoSocial) || 'EMPRESA';
    
    let vencimentoStr = c.periodicidade === 'ANUAL' ? (c.dataVencimentoAnual ? sanitizar(c.dataVencimentoAnual).split('-').reverse().join('/') : 'Não informada') : `Dia ${sanitizar(c.diaVencimento) || ''}`;
    let inicioCobrancaStr = c.inicioCobranca ? sanitizar(c.inicioCobranca).split('-').reverse().join('/') : 'Não informado';
    let ultimaModif = c.ultimaAtualizacao ? new Date(c.ultimaAtualizacao).toLocaleString('pt-BR') : 'Não registrada';

    let html = `
        <div class="p-3 bg-gray-50 rounded border space-y-1">
            <div><strong>CNPJ:</strong> ${sanitizar(c.cnpj) || 'Não informado'}</div>
            <div><strong>Plano / Sistema:</strong> <span class="text-orange-600 font-bold">${sanitizar(c.plano) || ''}</span></div>
            <div><strong>Periodicidade:</strong> ${sanitizar(c.periodicidade) || ''}</div>
            <div><strong>Vencimento:</strong> ${vencimentoStr}</div>
            <div><strong>Início da Cobrança:</strong> <span class="text-emerald-700 font-bold">${inicioCobrancaStr}</span></div>
            <div><strong>E-mail:</strong> ${sanitizar(c.emailContato) || 'Não cadastrado'}</div>
            <div><strong>WhatsApp:</strong> ${sanitizar(c.whatsappContato) || 'Não cadastrado'}</div>
            <div><strong>Observação:</strong> ${sanitizar(c.observacao) || 'Nenhuma'}</div>
            <div class="pt-2 border-t text-[11px] text-gray-400">Última alteração: ${ultimaModif}</div>
        </div>
    `;
    document.getElementById('conteudoDetalhesContrato').innerHTML = html;
    
    document.getElementById('selectTemplateMensagem').value = 'lembrete';
    aplicarTemplateMensagem();

    document.getElementById('modalDetalhesContrato').classList.remove('hidden');
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhesContrato').classList.add('hidden');
}

function aplicarTemplateMensagem() {
    if (!contratoSelecionadoAtual) return;
    const tipo = document.getElementById('selectTemplateMensagem').value;
    const empresa = sanitizar(contratoSelecionadoAtual.razaoSocial) || 'CLIENTE';
    const plano = sanitizar(contratoSelecionadoAtual.plano) || 'SISTEMA';
    let vencimentoStr = contratoSelecionadoAtual.periodicidade === 'ANUAL' ? (contratoSelecionadoAtual.dataVencimentoAnual ? sanitizar(contratoSelecionadoAtual.dataVencimentoAnual).split('-').reverse().join('/') : '') : `DIA ${sanitizar(contratoSelecionadoAtual.diaVencimento) || ''}`;

    let texto = "";
    if (tipo === 'lembrete') {
        texto = `OLÁ ${empresa}, PASSANDO PARA LEMBRAR SOBRE O VENCIMENTO DA SUA MENSALIDADE/LICENÇA (${plano}) COM VENCIMENTO PARA ${vencimentoStr}. QUALQUER DÚVIDA ESTAMOS À DISPOSIÇÃO! - HITECH INFORMÁTICA`;
    } else if (tipo === 'atraso') {
        texto = `OLÁ ${empresa}, NOTAMOS QUE A MENSALIDADE DA SUA LICENÇA (${plano}) COM VENCIMENTO EM ${vencimentoStr} ENCONTRA-SE EM ATRASO. POR FAVOR, REGULARIZE PARA EVITAR A SUSPENSÃO DO SISTEMA. - HITECH INFORMÁTICA`;
    } else if (tipo === 'boasvindas') {
        texto = `OLÁ ${empresa}, SEJA BEM-VINDO(A)! SEU SISTEMA/PLANO (${plano}) ESTÁ ATIVO E PRONTO PARA USO. CONTE COM O SUPORTE DA HITECH INFORMÁTICA SEMPRE QUE PRECISAR!`;
    } else if (tipo === 'suporte') {
        texto = `OLÁ ${empresa}, PASSANDO PARA VERIFICAR SE ESTÁ TUDO CERTO COM O SEU SISTEMA (${plano}) E SE NECESSITA DE ALGUM SUPORTE OU MANUTENÇÃO PREVENTIVA. - HITECH INFORMÁTICA`;
    }

    document.getElementById('textoMensagemPronta').value = texto;
}

function enviarWhatsAppCliente() {
    if (!contratoSelecionadoAtual || !contratoSelecionadoAtual.whatsappContato) {
        alert("Número de WhatsApp não cadastrado para esta empresa.");
        return;
    }
    let fone = contratoSelecionadoAtual.whatsappContato.replace(/\D/g, '');
    let texto = document.getElementById('textoMensagemPronta').value;
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(texto)}`, '_blank');
}

function enviarEmailCliente() {
    if (!contratoSelecionadoAtual || !contratoSelecionadoAtual.emailContato) {
        alert("E-mail não cadastrado para esta empresa.");
        return;
    }
    let email = contratoSelecionadoAtual.emailContato;
    let assunto = encodeURIComponent(`Comunicado Importante - HiTech Informática (${contratoSelecionadoAtual.razaoSocial})`);
    let corpo = encodeURIComponent(document.getElementById('textoMensagemPronta').value);
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`);
}

function acionarImpressao() {
    const tabelaPrincipal = document.getElementById('tabelaContratosPrincipal');
    const chk = document.getElementById('chkIncluirObs');
    if (!tabelaPrincipal || !chk) return;

    if (!chk.checked) {
        tabelaPrincipal.classList.add('tabela-sem-obs');
    } else {
        tabelaPrincipal.classList.remove('tabela-sem-obs');
    }

    window.print();
}

function filtrarDadosContratos() {
    const inputBusca = document.getElementById('inputBuscaContrato');
    const selectDia = document.getElementById('filtroDiaVencimento');
    const selectMes = document.getElementById('filtroMesAnual');
    if (!inputBusca || !selectDia || !selectMes) return;

    const termo = inputBusca.value.toLowerCase();
    const diaFiltro = selectDia.value;
    const mesFiltro = selectMes.value;

    const filtrados = listaGlobalContratos.filter(c => {
        const matchTexto = (c.razaoSocial && c.razaoSocial.toLowerCase().includes(termo)) || 
                           (c.cnpj && c.cnpj.toLowerCase().includes(termo)) || 
                           (c.plano && c.plano.toLowerCase().includes(termo));
        
        let matchDia = true;
        if (diaFiltro !== "") {
            if (c.periodicidade === 'MENSAL' && c.diaVencimento) {
                const diaContratoNormalizado = String(parseInt(c.diaVencimento, 10));
                const diaFiltroNormalizado = String(parseInt(diaFiltro, 10));
                matchDia = (diaContratoNormalizado === diaFiltroNormalizado);
            } else {
                matchDia = false;
            }
        }
        
        let matchMes = true;
        if (mesFiltro !== "") {
            if (c.periodicidade === 'ANUAL' && c.dataVencimentoAnual) {
                const mesContrato = c.dataVencimentoAnual.split('-')[1];
                matchMes = (mesContrato === mesFiltro);
            } else {
                matchMes = false;
            }
        }

        return matchTexto && matchDia && matchMes;
    });

    renderizarContratos(filtrados);
}

function abrirModalContrato() {
    document.getElementById('contratoId').value = '';
    document.getElementById('formContrato').reset();
    document.getElementById('periodicidade').value = 'MENSAL';
    alternarPeriodicidade();
    document.getElementById('modalTituloContrato').innerText = 'Novo Contrato / Licença';
    document.getElementById('modalContrato').classList.remove('hidden');
}

function fecharModalContrato() { 
    document.getElementById('modalContrato').classList.add('hidden'); 
}

function editarContratoPorId(id) {
    const item = listaGlobalContratos.find(c => c.id === id);
    if (!item) return;

    document.getElementById('contratoId').value = id;
    document.getElementById('razaoSocial').value = item.razaoSocial || '';
    document.getElementById('cnpj').value = item.cnpj || '';
    document.getElementById('plano').value = item.plano || '';
    document.getElementById('emailContato').value = item.emailContato || '';
    document.getElementById('whatsappContato').value = item.whatsappContato || '';
    
    const periodicidade = item.periodicidade || 'MENSAL';
    document.getElementById('periodicidade').value = periodicidade;
    alternarPeriodicidade();

    if (periodicidade === 'ANUAL') {
        document.getElementById('dataVencimentoAnual').value = item.dataVencimentoAnual || '';
        document.getElementById('diaVencimento').value = '';
    } else {
        document.getElementById('diaVencimento').value = item.diaVencimento || '';
        document.getElementById('dataVencimentoAnual').value = '';
    }

    document.getElementById('inicioCobranca').value = item.inicioCobranca || '';
    document.getElementById('observacaoContrato').value = item.observacao || '';
    document.getElementById('modalTituloContrato').innerText = 'Editar Contrato';
    document.getElementById('modalContrato').classList.remove('hidden');
}

async function salvarContrato(event) {
    event.preventDefault();
    const id = document.getElementById('contratoId').value;
    const periodicidade = document.getElementById('periodicidade').value;

    const dados = {
        razaoSocial: document.getElementById('razaoSocial').value.trim().toUpperCase(),
        cnpj: document.getElementById('cnpj').value.trim(),
        plano: document.getElementById('plano').value.trim().toUpperCase(),
        emailContato: document.getElementById('emailContato').value.trim(),
        whatsappContato: document.getElementById('whatsappContato').value.trim(),
        periodicidade: periodicidade,
        diaVencimento: periodicidade === 'MENSAL' ? document.getElementById('diaVencimento').value.trim() : '',
        dataVencimentoAnual: periodicidade === 'ANUAL' ? document.getElementById('dataVencimentoAnual').value : '',
        inicioCobranca: document.getElementById('inicioCobranca').value,
        observacao: document.getElementById('observacaoContrato').value.trim().toUpperCase(),
        ultimaAtualizacao: new Date().toISOString()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "hitech_contratos", id), dados);
        } else {
            await addDoc(collection(db, "hitech_contratos"), dados);
        }
        fecharModalContrato();
        carregarDadosContratos();
    } catch (e) {
        console.error("Erro ao salvar contrato:", e);
        alert("Erro ao salvar contrato.");
    }
}

async function excluirContrato(id) {
    if (confirm("Deseja excluir este contrato?")) {
        try {
            await deleteDoc(doc(db, "hitech_contratos", id));
            carregarDadosContratos();
        } catch (e) {
            alert("Erro ao excluir o contrato.");
        }
    }
}

// ==========================================
// REGISTO DOS EVENT LISTENERS (Desacoplamento)
// ==========================================
document.getElementById('btnSairContratos').addEventListener('click', fazerLogout);
document.getElementById('btnNovoContrato').addEventListener('click', abrirModalContrato);
document.getElementById('btnImprimirContratos').addEventListener('click', acionarImpressao);
document.getElementById('btnSalvarNotas').addEventListener('click', salvarNotasGeraisNuvem);
document.getElementById('btnCancelarContrato').addEventListener('click', fecharModalContrato);
document.getElementById('btnFecharDetalhes1').addEventListener('click', fecharModalDetalhes);
document.getElementById('btnFecharDetalhes2').addEventListener('click', fecharModalDetalhes);

document.getElementById('inputBuscaContrato').addEventListener('keyup', filtrarDadosContratos);
document.getElementById('filtroDiaVencimento').addEventListener('change', filtrarDadosContratos);
document.getElementById('filtroMesAnual').addEventListener('change', filtrarDadosContratos);

document.getElementById('formContrato').addEventListener('submit', salvarContrato);
document.getElementById('periodicidade').addEventListener('change', alternarPeriodicidade);
document.getElementById('cnpj').addEventListener('input', aplicarMascaraCNPJ);

document.getElementById('selectTemplateMensagem').addEventListener('change', aplicarTemplateMensagem);
document.getElementById('btnEnviarWhatsApp').addEventListener('click', enviarWhatsAppCliente);
document.getElementById('btnEnviarEmail').addEventListener('click', enviarEmailCliente);

// Event Delegation para botões dinâmicos na tabela
document.getElementById('tabelaCorpoContratos').addEventListener('click', (e) => {
    const element = e.target.closest('.acao-tabela');
    if (!element) return;
    
    const action = element.dataset.action;
    const id = element.dataset.id;

    if (action === 'detalhes') abrirDetalhesContrato(id);
    if (action === 'editar') editarContratoPorId(id);
    if (action === 'excluir') excluirContrato(id);
});