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
let abaAtualOS = "ENTRADA";

document.addEventListener("DOMContentLoaded", () => {
    carregarDadosOS();
});

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
        if (btn) btn.className = "flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition bg-gray-200 text-gray-700 hover:bg-gray-300 whitespace-nowrap shadow-sm cursor-pointer";
    });
    const ativoBtn = document.getElementById('btnAba' + status.charAt(0) + status.slice(1).toLowerCase());
    if (ativoBtn) {
        ativoBtn.className = `flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition text-white whitespace-nowrap shadow-sm cursor-pointer ${status === 'AGUARDANDO' ? 'bg-amber-500' : status === 'ENVIADO' ? 'bg-purple-600' : status === 'FINALIZADO' ? 'bg-green-600' : 'bg-orange-500'}`;
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
        
        let subDataTexto = '';
        if (item.status === 'BANCADA' && item.dataBancada) {
            subDataTexto = `<div class="text-[10px] text-orange-700 font-bold mt-1">Despacho: ${item.dataBancada.split('-').reverse().join('/')}</div>`;
        } else if (item.status === 'ENVIADO' && item.dataEnvio) {
            subDataTexto = `<div class="text-[10px] text-purple-700 font-bold mt-1">Envio: ${item.dataEnvio.split('-').reverse().join('/')}</div>`;
        }

        const badgeStatus = `
            <div class="flex flex-col items-center">
                <span class="px-2 py-1 rounded text-xs font-semibold ${item.status === 'BANCADA' ? 'bg-orange-100 text-orange-800' : item.status === 'AGUARDANDO' ? 'bg-amber-100 text-amber-800' : item.status === 'ENVIADO' ? 'bg-purple-100 text-purple-800' : item.status === 'FINALIZADO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">${item.status || 'ENTRADA'}</span>
                ${subDataTexto}
            </div>
        `;

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
                    <button onclick='verHistoricoPorSerial("${item.serial}")' class="text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-200 cursor-pointer">Histórico</button>
                    <button onclick='imprimirOSPorId("${item.id}")' class="text-gray-700 font-bold bg-gray-100 px-2 py-1 rounded border border-gray-300 cursor-pointer">Imprimir</button>
                    <button onclick='editarOSPorId("${item.id}")' class="text-blue-600 font-bold cursor-pointer">Editar</button>
                    <button onclick='excluirOS("${item.id}")' class="text-red-600 font-bold cursor-pointer">Excluir</button>
                </td>
            </tr>
        `;
    });
}

window.filtrarDadosOS = function() {
    const inputBusca = document.getElementById('inputBuscaOS');
    if (!inputBusca) return;
    const termo = inputBusca.value.toLowerCase();
    const filtrados = listaGlobalOS.filter(i => (i.status || 'ENTRADA') === abaAtualOS && ((i.empresa && i.empresa.toLowerCase().includes(termo)) || (i.numOs && i.numOs.toLowerCase().includes(termo)) || (i.serial && i.serial.toLowerCase().includes(termo))));
    renderizarOS(filtrados);
}

window.verificarStatusOS = function(select) {
    const blocoBancada = document.getElementById('blocoDataBancada');
    const inputBancada = document.getElementById('dataBancada');
    const blocoEnvio = document.getElementById('blocoDataEnvio');
    const inputEnvio = document.getElementById('dataEnvio');

    if (!blocoBancada || !blocoEnvio) return;

    if (select.value === 'BANCADA') {
        blocoBancada.classList.remove('hidden');
        inputBancada.required = true;
        if (!inputBancada.value) {
            inputBancada.value = new Date().toISOString().split('T')[0];
        }
    } else {
        blocoBancada.classList.add('hidden');
        inputBancada.required = false;
    }

    if (select.value === 'ENVIADO') {
        blocoEnvio.classList.remove('hidden');
        inputEnvio.required = true;
        if (!inputEnvio.value) {
            inputEnvio.value = new Date().toISOString().split('T')[0];
        }
    } else {
        blocoEnvio.classList.add('hidden');
        inputEnvio.required = false;
    }
}

window.abrirModalOS = function() {
    document.getElementById('osId').value = '';
    document.getElementById('formOS').reset();
    document.getElementById('blocoDataBancada').classList.add('hidden');
    document.getElementById('blocoDataEnvio').classList.add('hidden');
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
    
    const selectStatus = document.getElementById('statusOS');
    verificarStatusOS(selectStatus);

    if (item.status === 'BANCADA' && item.dataBancada) {
        document.getElementById('dataBancada').value = item.dataBancada;
    }
    if (item.status === 'ENVIADO' && item.dataEnvio) {
        document.getElementById('dataEnvio').value = item.dataEnvio;
    }

    document.getElementById('modalTituloOS').innerText = 'Editar Ordem de Serviço';
    document.getElementById('modalOS').classList.remove('hidden');
}

window.salvarOS = async function(event) {
    event.preventDefault();
    const id = document.getElementById('osId').value;
    const status = document.getElementById('statusOS').value;
    const dados = {
        empresa: document.getElementById('empresa').value.trim().toUpperCase(),
        contato: document.getElementById('contato').value.trim().toUpperCase(),
        numOs: document.getElementById('numOs').value.trim().toUpperCase(),
        serial: document.getElementById('serial').value.trim().toUpperCase(),
        modelo: document.getElementById('modelo').value.toUpperCase(),
        defeito: document.getElementById('defeito').value.trim().toUpperCase(),
        diagnostico: document.getElementById('diagnostico').value.trim().toUpperCase(),
        dataEntrada: document.getElementById('dataEntrada').value,
        status: status,
        dataBancada: status === 'BANCADA' ? document.getElementById('dataBancada').value : '',
        dataEnvio: status === 'ENVIADO' ? document.getElementById('dataEnvio').value : '',
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

window.imprimirOSPorId = function(id) {
    const item = listaGlobalOS.find(i => i.id === id);
    if (!item) return;

    let dataF = item.dataEntrada ? item.dataEntrada.split('-').reverse().join('/') : '';

    const containerEtiqueta = document.getElementById('etiquetaImpressao');
    containerEtiqueta.innerHTML = `
        <div style="border: 2px dashed #000; padding: 10px; width: 100%; box-sizing: border-box;">
            <div style="text-align: center; font-weight: bold; font-size: 14px; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 8px;">
                ASSISTÊNCIA TÉCNICA - OS
            </div>
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">
                Nº OS: ${item.numOs || ''}
            </div>
            <div style="font-size: 12px; margin-bottom: 4px;">
                <strong>Empresa:</strong> ${item.empresa || ''}
            </div>
            <div style="font-size: 12px; margin-bottom: 4px;">
                <strong>Modelo:</strong> ${item.modelo || ''} | <strong>Serial:</strong> ${item.serial || ''}
            </div>
            <div style="font-size: 12px; margin-bottom: 8px;">
                <strong>Entrada:</strong> ${dataF}
            </div>
            <div style="border-top: 1px dotted #000; padding-top: 6px; font-size: 12px;">
                <strong>Defeito:</strong> ${item.defeito || 'NÃO INFORMADO'}
            </div>
        </div>
    `;

    window.print();
}

window.verHistoricoPorSerial = function(serialBuscado) {
    const container = document.getElementById('conteudoHistorico');
    const modal = document.getElementById('modalHistorico');
    if (!container || !modal) return;

    const his = listaGlobalOS.filter(i => i.serial && i.serial.toUpperCase() === serialBuscado.toUpperCase());
    if (his.length === 0) { alert("Nenhum histórico encontrado."); return; }

    his.sort((a, b) => new Date(b.dataEntrada) - new Date(a.dataEntrada));
    let html = `<div class="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200"><span class="text-xs font-bold text-orange-900">Serial:</span> <span class="font-mono font-bold">${serialBuscado}</span></div>`;
    
    his.forEach((h, idx) => {
        let statusBadgeHis = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">${h.status || 'ENTRADA'}</span>`;
        let entradaF = h.dataEntrada ? h.dataEntrada.split('-').reverse().join('/') : 'Não informada';
        let bancadaF = h.dataBancada ? h.dataBancada.split('-').reverse().join('/') : 'Não aplicada';
        let envioF = h.dataEnvio ? h.dataEnvio.split('-').reverse().join('/') : 'Não aplicado';
        
        html += `
            <div class="p-3 bg-white border rounded shadow-sm text-xs space-y-1 mb-2">
                <div class="flex justify-between items-center border-b pb-1 mb-1">
                    <span class="font-bold text-gray-800">Atendimento #${his.length - idx} - OS: ${h.numOs}</span>
                    ${statusBadgeHis}
                </div>
                <div><strong>Empresa:</strong> ${h.empresa || ''}</div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <div>📥 <strong>Entrada:</strong> ${entradaF}</div>
                    <div>🛠️ <strong>Bancada:</strong> ${bancadaF}</div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>⏳ <strong>Aguardando:</strong> ${h.status === 'AGUARDANDO' ? 'Ativo' : 'N/A'}</div>
                    <div>📤 <strong>Enviado:</strong> ${envioF}</div>
                </div>
                <div>✅ <strong>Finalizado:</strong> ${h.status === 'FINALIZADO' ? 'Sim' : 'Não'}</div>
                <div class="pt-1 border-t mt-1"><strong>Defeito:</strong> ${h.defeito || 'NÃO INFORMADO'}</div>
                ${h.diagnostico ? `<div><strong>Diagnóstico:</strong> ${h.diagnostico}</div>` : ''}
            </div>
        `;
    });
    container.innerHTML = html;
    modal.classList.remove('hidden');
}

window.fecharModalHistorico = function() { document.getElementById('modalHistorico').classList.add('hidden'); }