import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

let listaGlobalOS = [];
let listaGlobalContratos = [];
let abaAtualOS = "ENTRADA";

// Vincula os botões da tela inicial assim que o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
    const btnOS = document.getElementById('btnModuloOS');
    const btnContratos = document.getElementById('btnModuloContratos');

    if (btnOS) {
        btnOS.addEventListener('click', () => entrarSistema('OS'));
    }
    if (btnContratos) {
        btnContratos.addEventListener('click', () => entrarSistema('CONTRATOS'));
    }
});

// Função para aplicar a Máscara de CNPJ automaticamente
window.aplicarMascaraCNPJ = function(input) {
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

// Alternar visibilidade dos campos no Modal de Contrato (Mensal vs Anual)
window.alternarPeriodicidade = function() {
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
        inputDia.value = '';
        inputData.required = true;
    }
}

// Controle de Navegação entre Módulos
function entrarSistema(modulo) {
    const tela = document.getElementById('telaAbertura');
    const modOS = document.getElementById('moduloOS');
    const modContratos = document.getElementById('moduloContratos');

    if (tela) {
        tela.classList.add('opacity-0');
        setTimeout(() => {
            tela.style.display = 'none';
            if (modulo === 'OS') {
                if (modOS) modOS.classList.remove('hidden');
                carregarDadosOS();
            } else if (modulo === 'CONTRATOS') {
                if (modContratos) modContratos.classList.remove('hidden');
                carregarDadosContratos();
            }
        }, 700);
    }
}
window.entrarSistema = entrarSistema;

window.voltarInicio = function() {
    const tela = document.getElementById('telaAbertura');
    const modOS = document.getElementById('moduloOS');
    const modContratos = document.getElementById('moduloContratos');

    if (modOS) modOS.classList.add('hidden');
    if (modContratos) modContratos.classList.add('hidden');
    if (tela) {
        tela.style.display = 'flex';
        setTimeout(() => tela.classList.remove('opacity-0'), 50);
    }
}

// ================= MÓDULO DE CONTROLE DE OS =================

function calcularPrazosOS(dataEntradaStr) {
    if (!dataEntradaStr) return { diasPassados: 0, statusPrazo: "No Prazo" };
    const partes = dataEntradaStr.split('-');
    const dataEntrada = new Date(partes[0], partes[1] - 1, partes[2]);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataEntrada > hoje) return { diasPassados: 0, statusPrazo: "No Prazo" };

    let diasUteis = 0;
    let atual = new Date(dataEntrada);
    while (atual < hoje) {
        atual.setDate(atual.getDate() + 1);
        const diaSemana = atual.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) diasUteis++;
    }
    return { diasPassados: diasUteis, statusPrazo: diasUteis > 7 ? "Vencido" : "No Prazo" };
}

async function carregarDadosOS() {
    try {
        const q = query(collection(db, "relogios_os"), orderBy("dataEntrada", "desc"), limit(200));
        const querySnapshot = await getDocs(q);
        listaGlobalOS = [];
        querySnapshot.forEach((docSnap) => {
            let dados = docSnap.data();
            if (dados.status === 'ANDAMENTO') dados.status = 'ENTRADA';
            listaGlobalOS.push({ id: docSnap.id, ...dados });
        });
        atualizarContadoresOS();
        filtrarDadosOS();
    } catch (error) {
        console.error("Erro OS:", error);
    }
}

function atualizarContadoresOS() {
    const entrada = listaGlobalOS.filter(i => (i.status || 'ENTRADA') === 'ENTRADA');
    const bancada = listaGlobalOS.filter(i => i.status === 'BANCADA');
    const aguardando = listaGlobalOS.filter(i => i.status === 'AGUARDANDO');
    const enviados = listaGlobalOS.filter(i => i.status === 'ENVIADO');

    if (document.getElementById('contadorEntrada')) document.getElementById('contadorEntrada').innerText = entrada.length;
    if (document.getElementById('contadorBancada')) document.getElementById('contadorBancada').innerText = bancada.length;
    if (document.getElementById('contadorAguardando')) document.getElementById('contadorAguardando').innerText = aguardando.length;
    if (document.getElementById('contadorEnviados')) document.getElementById('contadorEnviados').innerText = enviados.length;
}

window.mudarAbaOS = function(status) {
    abaAtualOS = status;
    ['ENTRADA', 'BANCADA', 'AGUARDANDO', 'ENVIADO', 'FINALIZADO'].forEach(s => {
        const btn = document.getElementById('btnAba' + s.charAt(0) + s.slice(1).toLowerCase());
        if (btn) btn.className = "flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition bg-gray-200 text-gray-700 hover:bg-gray-300 whitespace-nowrap shadow-sm";
    });
    const ativoBtn = document.getElementById('btnAba' + status.charAt(0) + status.slice(1).toLowerCase());
    if (ativoBtn) {
        ativoBtn.className = `flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition text-white whitespace-nowrap shadow-sm ${status === 'AGUARDANDO' ? 'bg-amber-500' : status === 'ENVIADO' ? 'bg-purple-600' : status === 'FINALIZADO' ? 'bg-green-600' : 'bg-orange-500'}`;
    }
    filtrarDadosOS();
}

function renderizarOS(dados) {
    const thead = document.getElementById('tabelaCabecalhoOS');
    const tbody = document.getElementById('tabelaCorpoOS');
    const containerMobile = document.getElementById('cardsMobileOS');
    if (!thead || !tbody || !containerMobile) return;

    tbody.innerHTML = '';
    containerMobile.innerHTML = '';

    const exibePrazos = (abaAtualOS === 'ENTRADA' || abaAtualOS === 'BANCADA');

    thead.innerHTML = exibePrazos ? `
        <tr>
            <th class="px-3 py-3 text-left">Empresa</th><th class="px-3 py-3 text-left">Contato</th><th class="px-3 py-3 text-left">Nº OS</th><th class="px-3 py-3 text-left">Serial</th><th class="px-3 py-3 text-left">Modelo</th><th class="px-3 py-3 text-left">Defeito</th><th class="px-3 py-3 text-left">Diagnóstico</th><th class="px-3 py-3 text-left">Entrada</th><th class="px-3 py-3 text-center">Dias Úteis</th><th class="px-3 py-3 text-center">Prazo</th><th class="px-3 py-3 text-center">Status</th><th class="px-3 py-3 text-left">Observações</th><th class="px-3 py-3 text-center">Ações</th>
        </tr>
    ` : `
        <tr>
            <th class="px-3 py-3 text-left">Empresa</th><th class="px-3 py-3 text-left">Contato</th><th class="px-3 py-3 text-left">Nº OS</th><th class="px-3 py-3 text-left">Serial</th><th class="px-3 py-3 text-left">Modelo</th><th class="px-3 py-3 text-left">Defeito</th><th class="px-3 py-3 text-left">Diagnóstico</th><th class="px-3 py-3 text-left">Entrada</th><th class="px-3 py-3 text-center">Status</th><th class="px-3 py-3 text-left">Observações</th><th class="px-3 py-3 text-center">Ações</th>
        </tr>
    `;

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center py-6 text-gray-400">Nenhum registo encontrado.</td></tr>`;
        containerMobile.innerHTML = `<div class="text-center py-6 text-gray-400 bg-white rounded-lg shadow p-4 text-sm">Nenhum registo encontrado.</div>`;
        return;
    }

    dados.forEach(item => {
        let dataF = item.dataEntrada ? item.dataEntrada.split('-').reverse().join('/') : '';
        const { diasPassados, statusPrazo } = calcularPrazosOS(item.dataEntrada);
        const isVencido = (statusPrazo === 'Vencido' && (item.status === 'ENTRADA' || item.status === 'BANCADA'));
        const badgePrazo = statusPrazo === 'Vencido' ? '<span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Vencido</span>' : '<span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">No Prazo</span>';
        const badgeStatus = `<span class="px-2 py-1 rounded text-xs font-semibold ${item.status === 'BANCADA' ? 'bg-orange-100 text-orange-800' : item.status === 'AGUARDANDO' ? 'bg-amber-100 text-amber-800' : item.status === 'ENVIADO' ? 'bg-purple-100 text-purple-800' : item.status === 'FINALIZADO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">${item.status || 'ENTRADA'}</span>`;

        const trClass = isVencido ? 'bg-red-100 text-red-900 font-medium' : 'hover:bg-gray-50';

        tbody.innerHTML += `
            <tr class="${trClass} transition border-b">
                <td class="px-3 py-3 font-medium">${item.empresa || ''}</td>
                <td class="px-3 py-3">${item.contato || ''}</td>
                <td class="px-3 py-3 font-bold text-orange-600">${item.numOs || ''}</td>
                <td class="px-3 py-3 font-mono cursor-pointer text-orange-600 underline" onclick='verHistoricoPorSerial("${item.serial}")'>${item.serial || ''}</td>
                <td class="px-3 py-3 font-semibold text-gray-800">${item.modelo || ''}</td>
                <td class="px-3 py-3">${item.defeito || ''}</td>
                <td class="px-3 py-3">${item.diagnostico || ''}</td>
                <td class="px-3 py-3">${dataF}</td>
                ${exibePrazos ? `<td class="px-3 py-3 text-center font-bold">${diasPassados}</td><td class="px-3 py-3 text-center">${badgePrazo}</td>` : ''}
                <td class="px-3 py-3 text-center">${badgeStatus}</td>
                <td class="px-3 py-3">${item.observacao || ''}</td>
                <td class="px-3 py-3 text-center space-x-1.5 whitespace-nowrap">
                    <button onclick='verHistoricoPorSerial("${item.serial}")' class="text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-200">Histórico</button>
                    <button onclick='imprimirEtiquetaPorId("${item.id}")' class="text-gray-700 font-bold bg-gray-100 px-2 py-1 rounded border border-gray-300">Imprimir</button>
                    <button onclick='editarOSPorId("${item.id}")' class="text-blue-600 font-bold">Editar</button>
                    <button onclick='excluirOS("${item.id}")' class="text-red-600 font-bold">Excluir</button>
                </td>
            </tr>
        `;
    });
}

window.filtrarDadosOS = function() {
    const termo = document.getElementById('inputBuscaOS').value.toLowerCase();
    const filtrados = listaGlobalOS.filter(i => (i.status || 'ENTRADA') === abaAtualOS && ((i.empresa && i.empresa.toLowerCase().includes(termo)) || (i.numOs && i.numOs.toLowerCase().includes(termo)) || (i.serial && i.serial.toLowerCase().includes(termo))));
    renderizarOS(filtrados);
}

window.abrirModalOS = function() {
    document.getElementById('osId').value = '';
    document.getElementById('formOS').reset();
    document.getElementById('modalTituloOS').innerText = 'Nova Ordem de Serviço';
    document.getElementById('modalOS').classList.remove('hidden');
}

window.fecharModalOS = function() { document.getElementById('modalOS').classList.add('hidden'); }

window.editarOSPorId = function(id) {
    const item = listaGlobalOS.find(i => i.id === id);
    if (!item) return;
    document.getElementById('osId').value = item.id;
    document.getElementById('empresa').value = item.empresa || '';
    document.getElementById('contato').value = item.contato || '';
    document.getElementById('numOs').value = item.numOs || '';
    document.getElementById('serial').value = item.serial || '';
    document.getElementById('modelo').value = item.modelo || '';
    document.getElementById('defeito').value = item.defeito || '';
    document.getElementById('diagnostico').value = item.diagnostico || '';
    document.getElementById('dataEntrada').value = item.dataEntrada || '';
    document.getElementById('statusOS').value = item.status || 'ENTRADA';
    document.getElementById('observacaoOS').value = item.observacao || '';
    document.getElementById('modalTituloOS').innerText = 'Editar Ordem de Serviço';
    document.getElementById('modalOS').classList.remove('hidden');
}

window.salvarOS = async function(event) {
    event.preventDefault();
    const id = document.getElementById('osId').value;
    const dados = {
        empresa: document.getElementById('empresa').value.trim().toUpperCase(),
        contato: document.getElementById('contato').value.trim().toUpperCase(),
        numOs: document.getElementById('numOs').value.trim().toUpperCase(),
        serial: document.getElementById('serial').value.trim().toUpperCase(),
        modelo: document.getElementById('modelo').value.toUpperCase(),
        defeito: document.getElementById('defeito').value.trim().toUpperCase(),
        diagnostico: document.getElementById('diagnostico').value.trim().toUpperCase(),
        dataEntrada: document.getElementById('dataEntrada').value,
        status: document.getElementById('statusOS').value,
        observacao: document.getElementById('observacaoOS').value.trim().toUpperCase()
    };
    try {
        if (id) await updateDoc(doc(db, "relogios_os", id), dados);
        else await addDoc(collection(db, "relogios_os"), dados);
        fecharModalOS();
        carregarDadosOS();
    } catch (e) { alert("Erro ao salvar OS."); }
}

window.excluirOS = async function(id) {
    if (confirm("Deseja excluir esta OS?")) {
        await deleteDoc(doc(db, "relogios_os", id));
        carregarDadosOS();
    }
}

// ================= MÓDULO DE CONTRATOS & LICENÇAS =================

async function carregarDadosContratos() {
    try {
        const querySnapshot = await getDocs(collection(db, "hitech_contratos"));
        listaGlobalContratos = [];
        querySnapshot.forEach((docSnap) => {
            listaGlobalContratos.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // ORDENAÇÃO AUTOMÁTICA INTELIGENTE PARA O PRÓXIMO MÊS
        ordenarContratosAutomatico();
        verificarAlertasVencimento();
        filtrarDadosContratos();
    } catch (error) {
        console.error("Erro Contratos:", error);
    }
}

function obterDataObjetoContrato(c, hoje) {
    const anoAtual = hoje.getFullYear();
    const proximoMes = hoje.getMonth() + 1; // Garante o cálculo para o próximo mês fixo

    if (c.periodicidade === 'ANUAL' && c.dataVencimentoAnual) {
        const partes = c.dataVencimentoAnual.split('-');
        return new Date(partes[0], partes[1] - 1, partes[2]);
    } else if (c.diaVencimento) {
        const diaVenc = parseInt(c.diaVencimento, 10);
        if (!isNaN(diaVenc)) {
            // Sempre posiciona no próximo mês com o dia exato numérico (ex: 01, 05, 10, etc.)
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
        return dataA - dataB; // Do dia 1 ao 31 perfeitamente em ordem crescente
    });

    filtrarDadosContratos();
}

function verificarAlertasVencimento() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const bannerAlerta = document.getElementById('alertaVencimentos');
    const listaAlerta = document.getElementById('listaContratosAlerta');
    let avisos = [];

    listaGlobalContratos.forEach(c => {
        let dataVencObj = obterDataObjetoContrato(c, hoje);
        if (!dataVencObj) return;

        let textoVencimentoExibicao = "";
        if (c.periodicidade === 'ANUAL' && c.dataVencimentoAnual) {
            const partes = c.dataVencimentoAnual.split('-');
            textoVencimentoExibicao = `Data: ${partes[2]}/${partes[1]}/${partes[0]}`;
        } else {
            textoVencimentoExibicao = `Dia ${c.diaVencimento}`;
        }

        const diffTempo = dataVencObj - hoje;
        const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

        if (diffDias <= 7) {
            let statusTexto = diffDias < 0 ? `Vencido há ${Math.abs(diffDias)} dia(s)` : diffDias === 0 ? `Vence HOJE!` : `Vence em ${diffDias} dia(s)`;
            avisos.push(`• <strong>${c.razaoSocial}</strong> (Plano: ${c.plano || 'PADRÃO'}) - ${textoVencimentoExibicao} - <span class="font-bold underline">${statusTexto}</span>`);
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
        if (diffDias <= 7) {
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
    const cardsMobile = document.getElementById('cardsMobileContratos');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (cardsMobile) cardsMobile.innerHTML = '';

    atualizarContadoresContratos(dados);

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-gray-400">Nenhum contrato cadastrado.</td></tr>`;
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
            if (diffDias <= 7) {
                statusBadge = `<span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Próximo / Vencido</span>`;
            }
        } else {
            vencimentoExibicao = `Dia ${c.diaVencimento || ''}`;
            const diaVenc = parseInt(c.diaVencimento, 10);
            if (!isNaN(diaVenc)) {
                let dataVencObj = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVenc);
                const diffDias = Math.ceil((dataVencObj - hoje) / (1000 * 60 * 60 * 24));
                if (diffDias <= 7) {
                    statusBadge = `<span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Próximo / Vencido</span>`;
                }
            }
        }

        const badgePeriodicidade = c.periodicidade === 'ANUAL' 
            ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">ANUAL</span>' 
            : '<span class="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">MENSAL</span>';

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition border-b">
                <td class="px-4 py-3 font-bold text-gray-800">${c.razaoSocial || ''}</td>
                <td class="px-4 py-3 font-mono whitespace-nowrap">${c.cnpj || 'Não informado'}</td>
                <td class="px-4 py-3 text-center font-bold text-orange-600">${c.plano || 'Padrão'}</td>
                <td class="px-4 py-3 text-center">${badgePeriodicidade}</td>
                <td class="px-4 py-3 text-center font-bold text-sm whitespace-nowrap">${vencimentoExibicao}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3">${c.observacao || ''}</td>
                <td class="px-4 py-3 text-center space-x-2 whitespace-nowrap acoes-esconder">
                    <button onclick='editarContratoPorId("${c.id}")' class="text-blue-600 font-bold">Editar</button>
                    <button onclick='excluirContrato("${c.id}")' class="text-red-600 font-bold">Excluir</button>
                </td>
            </tr>
        `;
    });
}

window.filtrarDadosContratos = function() {
    const termo = document.getElementById('inputBuscaContrato').value.toLowerCase();
    const filtrados = listaGlobalContratos.filter(c => (c.razaoSocial && c.razaoSocial.toLowerCase().includes(termo)) || (c.cnpj && c.cnpj.toLowerCase().includes(termo)) || (c.plano && c.plano.toLowerCase().includes(termo)));
    renderizarContratos(filtrados);
}

window.abrirModalContrato = function() {
    document.getElementById('contratoId').value = '';
    document.getElementById('formContrato').reset();
    document.getElementById('periodicidade').value = 'MENSAL';
    alternarPeriodicidade();
    document.getElementById('modalTituloContrato').innerText = 'Novo Contrato / Licença';
    document.getElementById('modalContrato').classList.remove('hidden');
}

window.fecharModalContrato = function() { 
    document.getElementById('modalContrato').classList.add('hidden'); 
}

window.editarContratoPorId = function(id) {
    const item = listaGlobalContratos.find(c => c.id === id);
    if (!item) return;

    document.getElementById('contratoId').value = item.id;
    document.getElementById('razaoSocial').value = item.razaoSocial || '';
    document.getElementById('cnpj').value = item.cnpj || '';
    document.getElementById('plano').value = item.plano || '';
    
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

    document.getElementById('observacaoContrato').value = item.observacao || '';
    document.getElementById('modalTituloContrato').innerText = 'Editar Contrato';
    document.getElementById('modalContrato').classList.remove('hidden');
}

window.salvarContrato = async function(event) {
    event.preventDefault();
    const id = document.getElementById('contratoId').value;
    const periodicidade = document.getElementById('periodicidade').value;

    const dados = {
        razaoSocial: document.getElementById('razaoSocial').value.trim().toUpperCase(),
        cnpj: document.getElementById('cnpj').value.trim(),
        plano: document.getElementById('plano').value.trim().toUpperCase(),
        periodicidade: periodicidade,
        diaVencimento: periodicidade === 'MENSAL' ? document.getElementById('diaVencimento').value.trim() : '',
        dataVencimentoAnual: periodicidade === 'ANUAL' ? document.getElementById('dataVencimentoAnual').value : '',
        observacao: document.getElementById('observacaoContrato').value.trim().toUpperCase()
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

window.excluirContrato = async function(id) {
    if (confirm("Deseja excluir este contrato?")) {
        try {
            await deleteDoc(doc(db, "hitech_contratos", id));
            carregarDadosContratos();
        } catch (e) {
            alert("Erro ao excluir o contrato.");
        }
    }
}

// Histórico de Aparelho OS
window.verHistoricoPorSerial = function(serialBuscado) {
    const container = document.getElementById('conteudoHistorico');
    const modal = document.getElementById('modalHistorico');
    if (!container || !modal) return;

    const his = listaGlobalOS.filter(i => i.serial && i.serial.toUpperCase() === serialBuscado.toUpperCase());
    if (his.length === 0) { alert("Nenhum histórico encontrado."); return; }

    his.sort((a, b) => new Date(b.dataEntrada) - new Date(a.dataEntrada));
    let html = `<div class="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200"><span class="text-xs font-bold text-orange-900">Serial:</span> <span class="font-mono font-bold">${serialBuscado}</span></div>`;
    
    his.forEach((h, idx) => {
        html += `<div class="p-3 bg-white border rounded shadow-sm text-xs space-y-1"><div class="font-bold text-gray-700">Atendimento #${his.length - idx} - OS: ${h.numOs}</div><div>Empresa: ${h.empresa}</div><div>Defeito: ${h.defeito}</div></div>`;
    });
    container.innerHTML = html;
    modal.classList.add('hidden');
}

window.fecharModalHistorico = function() { document.getElementById('modalHistorico').classList.add('hidden'); }
window.imprimirEtiquetaPorId = function(id) { alert("Função de impressão mantida no módulo OS."); }