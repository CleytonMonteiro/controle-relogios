// Importações do Firebase SDK v9 (via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Credenciais configuradas do projeto Firebase
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

let listaGlobal = [];
let abaAtual = "ANDAMENTO"; // Controla se estamos vendo "ANDAMENTO" ou "FINALIZADO"

// Função auxiliar para contar os dias úteis desde a entrada até hoje (limite de 7 dias úteis)
function calcularPrazos(dataEntradaStr, status) {
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
        if (diaSemana !== 0 && diaSemana !== 6) { // 0 = Domingo, 6 = Sábado
            diasUteis++;
        }
    }

    let statusPrazo = diasUteis > 7 ? "Vencido" : "No Prazo";

    return { diasPassados: diasUteis, statusPrazo };
}

// Função para buscar dados do Firebase
async function carregarDados() {
    try {
        const querySnapshot = await getDocs(collection(db, "relogios_os"));
        listaGlobal = [];
        querySnapshot.forEach((docSnap) => {
            listaGlobal.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        atualizarContadorAtivas();
        filtrarDados();
    } catch (error) {
        console.error("Erro ao carregar dados: ", error);
        alert("Erro ao conectar com o banco de dados. Verifique as regras do Firestore.");
    }
}

// Atualiza o contador no topo com o total de OS ativas em andamento
function atualizarContadorAtivas() {
    const ativas = listaGlobal.filter(item => (item.status || 'ANDAMENTO') === 'ANDAMENTO');
    const contadorEl = document.getElementById('contadorAtivas');
    if (contadorEl) {
        contadorEl.innerText = ativas.length;
    }
}

// Alternar entre as abas de Andamento e Histórico de Finalizados
window.mudarAba = function(status) {
    abaAtual = status;
    const btnAtivas = document.getElementById('btnAbaAtivas');
    const btnFinalizadas = document.getElementById('btnAbaFinalizadas');

    if (status === 'ANDAMENTO') {
        if (btnAtivas) btnAtivas.className = "flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold text-sm transition bg-blue-600 text-white";
        if (btnFinalizadas) btnFinalizadas.className = "flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold text-sm transition bg-gray-200 text-gray-700 hover:bg-gray-300";
    } else {
        if (btnFinalizadas) btnFinalizadas.className = "flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold text-sm transition bg-green-600 text-white";
        if (btnAtivas) btnAtivas.className = "flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold text-sm transition bg-gray-200 text-gray-700 hover:bg-gray-300";
    }

    filtrarDados();
}

// Renderizar na tela (Tabela para Desktop e Cards para Celular)
function renderizar(dados) {
    const tbody = document.getElementById('tabelaCorpo');
    const containerMobile = document.getElementById('cardsMobile');
    
    if (!tbody || !containerMobile) return;

    tbody.innerHTML = '';
    containerMobile.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center py-4 text-gray-400">Nenhum registro encontrado nesta visualização.</td></tr>`;
        containerMobile.innerHTML = `<div class="text-center py-4 text-gray-400 bg-white rounded-lg shadow p-4 text-sm">Nenhum registro encontrado nesta visualização.</div>`;
        return;
    }

    dados.forEach(item => {
        let dataFormatada = item.dataEntrada;
        if (item.dataEntrada && item.dataEntrada.includes('-')) {
            const partes = item.dataEntrada.split('-');
            dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        const { diasPassados, statusPrazo } = calcularPrazos(item.dataEntrada, item.status);

        const badgePrazo = statusPrazo === 'Vencido'
            ? '<span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Vencido</span>'
            : '<span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">No Prazo</span>';

        const badgeStatus = item.status === 'FINALIZADO' 
            ? '<span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Finalizado</span>' 
            : '<span class="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">Andamento</span>';

        // Linha para Desktop
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-3 py-3 font-medium text-gray-800">${item.empresa || ''}</td>
                <td class="px-3 py-3 text-gray-600">${item.contato || ''}</td>
                <td class="px-3 py-3">${item.numOs || ''}</td>
                <td class="px-3 py-3 font-mono">${item.serial || ''}</td>
                <td class="px-3 py-3 font-semibold text-blue-700">${item.modelo || ''}</td>
                <td class="px-3 py-3">${item.defeito || ''}</td>
                <td class="px-3 py-3">${item.diagnostico || ''}</td>
                <td class="px-3 py-3">${dataFormatada || ''}</td>
                <td class="px-3 py-3 text-center font-bold">${diasPassados}</td>
                <td class="px-3 py-3 text-center">${badgePrazo}</td>
                <td class="px-3 py-3 text-center">${badgeStatus}</td>
                <td class="px-3 py-3">${item.observacao || ''}</td>
                <td class="px-3 py-3 text-center space-x-2">
                    <button onclick='editarOS(${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900 font-bold">Editar</button>
                    <button onclick='excluirOS("${item.id}")' class="text-red-600 hover:text-red-900 font-bold">Excluir</button>
                </td>
            </tr>
        `;

        // Card para Mobile / Tablet (Corrigido para respeitar a aba ativa e aceitar o clique)
        const itemJsonEscapado = JSON.stringify(item).replace(/"/g, '&quot;');
        containerMobile.innerHTML += `
            <div class="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-gray-800 text-base">${item.empresa || ''}</span>
                    <div>${badgeStatus}</div>
                </div>
                <div class="text-xs text-gray-500"><strong>Contato:</strong> ${item.contato || 'Não informado'}</div>
                <div class="text-xs text-gray-500 flex justify-between">
                    <span>OS: <strong>${item.numOs || ''}</strong></span>
                    <span>Serial: <strong class="font-mono">${item.serial || ''}</strong></span>
                </div>
                <div class="text-sm text-gray-700"><strong>Modelo:</strong> <span class="text-blue-700 font-semibold">${item.modelo || ''}</span></div>
                <div class="text-sm text-gray-700"><strong>Defeito:</strong> ${item.defeito || ''}</div>
                <div class="text-sm text-gray-700"><strong>Diagnóstico:</strong> ${item.diagnostico || ''}</div>
                <div class="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                    <span>Entrada: ${dataFormatada || ''}</span>
                    <span>Dias Úteis: <strong>${diasPassados}</strong></span>
                    <span>${badgePrazo}</span>
                </div>
                <div class="text-xs text-gray-600"><strong>Obs:</strong> ${item.observacao || ''}</div>
                <div class="flex justify-end space-x-4 pt-2 border-t mt-1">
                    <button onclick='editarOS(${itemJsonEscapado})' class="text-blue-600 font-bold text-sm px-2 py-1">Editar</button>
                    <button onclick='excluirOS("${item.id}")' class="text-red-600 font-bold text-sm px-2 py-1">Excluir</button>
                </div>
            </div>
        `;
    });
}

// Sistema de Busca filtrando pela aba ativa atual
window.filtrarDados = function() {
    const termoInput = document.getElementById('inputBusca');
    const termo = termoInput ? termoInput.value.toLowerCase() : '';

    const filtrados = listaGlobal.filter(item => {
        const statusItem = item.status || 'ANDAMENTO';
        // Filtra estritamente pela aba que está aberta (ANDAMENTO ou FINALIZADO)
        const abaMatch = statusItem === abaAtual;

        const textoMatch = (item.empresa && item.empresa.toLowerCase().includes(termo)) ||
                           (item.numOs && item.numOs.toLowerCase().includes(termo)) ||
                           (item.serial && item.serial.toLowerCase().includes(termo)) ||
                           (item.contato && item.contato.toLowerCase().includes(termo));

        return abaMatch && textoMatch;
    });

    renderizar(filtrados);
}

// Funções de Controle do Modal
window.abrirModal = function() {
    const osId = document.getElementById('osId');
    const formOS = document.getElementById('formOS');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalOS = document.getElementById('modalOS');

    if (osId) osId.value = '';
    if (formOS) formOS.reset();
    if (modalTitulo) modalTitulo.innerText = 'Nova Ordem de Serviço';
    if (modalOS) modalOS.classList.remove('hidden');
}

window.fecharModal = function() {
    const modalOS = document.getElementById('modalOS');
    if (modalOS) modalOS.classList.add('hidden');
}

window.editarOS = function(item) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('osId', item.id);
    setVal('empresa', item.empresa);
    setVal('contato', item.contato);
    setVal('numOs', item.numOs);
    setVal('serial', item.serial);
    setVal('modelo', item.modelo);
    setVal('defeito', item.defeito);
    setVal('diagnostico', item.diagnostico);
    setVal('dataEntrada', item.dataEntrada);
    setVal('status', item.status || 'ANDAMENTO');
    setVal('observacao', item.observacao);

    const modalTitulo = document.getElementById('modalTitulo');
    const modalOS = document.getElementById('modalOS');

    if (modalTitulo) modalTitulo.innerText = 'Editar Ordem de Serviço';
    if (modalOS) modalOS.classList.remove('hidden');
}

// Salvar ou Atualizar no Firebase
window.salvarOS = async function(event) {
    event.preventDefault();
    const osIdEl = document.getElementById('osId');
    const id = osIdEl ? osIdEl.value : '';
    
    const getVal = (elementId) => {
        const el = document.getElementById(elementId);
        return el ? el.value : '';
    };

    const dadosOS = {
        empresa: getVal('empresa'),
        contato: getVal('contato'),
        numOs: getVal('numOs'),
        serial: getVal('serial'),
        modelo: getVal('modelo'),
        defeito: getVal('defeito'),
        diagnostico: getVal('diagnostico'),
        dataEntrada: getVal('dataEntrada'),
        status: getVal('status'),
        observacao: getVal('observacao')
    };

    try {
        if (id) {
            await updateDoc(doc(db, "relogios_os", id), dadosOS);
        } else {
            await addDoc(collection(db, "relogios_os"), dadosOS);
        }
        fecharModal();
        carregarDados();
    } catch (error) {
        console.error("Erro ao salvar: ", error);
        alert("Erro ao salvar os dados.");
    }
}

// Excluir do Firebase
window.excluirOS = async function(id) {
    if (confirm("Deseja realmente excluir esta Ordem de Serviço?")) {
        try {
            await deleteDoc(doc(db, "relogios_os", id));
            carregarDados();
        } catch (error) {
            console.error("Erro ao excluir: ", error);
            alert("Erro ao excluir o registro.");
        }
    }
}

// Inicializa a aplicação carregando os dados do banco
carregarDados();