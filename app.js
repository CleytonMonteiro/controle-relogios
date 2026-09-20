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

// Função auxiliar para calcular dias úteis (ignorando fins de semana) e verificar prazo de 7 dias úteis
function calcularPrazos(dataEntradaStr, status) {
    if (!dataEntradaStr) return { diasPassados: 0, statusPrazo: "No Prazo" };

    const partes = dataEntradaStr.split('-');
    const dataEntrada = new Date(partes[0], partes[1] - 1, partes[2]);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataEntrada > hoje) return { diasPassados: 0, statusPrazo: "No Prazo" };

    // Conta dias úteis passados desde a entrada até hoje
    let diasUteis = 0;
    let atual = new Date(dataEntrada);
    while (atual < hoje) {
        atual.setDate(atual.getDate() + 1);
        const diaSemana = atual.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) { // 0 = Domingo, 6 = Sábado
            diasUteis++;
        }
    }

    // Se estiver finalizado, podemos fixar ou calcular com base no momento. Aqui mantemos a lógica de referência.
    // Prazo padrão estipulado em 7 dias úteis
    let statusPrazo = diasUteis > 7 ? "Vencido" : "No Prazo";
    let diasApos7 = diasUteis > 7 ? diasUteis - 7 : 0;

    return { diasPassados: diasApos7, statusPrazo };
}

// Função para buscar dados do Firebase
async function carregarDados() {
    try {
        const querySnapshot = await getDocs(collection(db, "relogios_os"));
        listaGlobal = [];
        querySnapshot.forEach((docSnap) => {
            listaGlobal.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderizar(listaGlobal);
    } catch (error) {
        console.error("Erro ao carregar dados: ", error);
        alert("Erro ao conectar com o banco de dados. Verifique as regras do Firestore.");
    }
}

// Renderizar na tela (Tabela e Cards responsivos)
function renderizar(dados) {
    const tbody = document.getElementById('tabelaCorpo');
    const containerMobile = document.getElementById('cardsMobile');
    
    tbody.innerHTML = '';
    containerMobile.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center py-4 text-gray-400">Nenhum registro encontrado.</td></tr>`;
        containerMobile.innerHTML = `<div class="text-center py-4 text-gray-400 bg-white rounded-lg shadow">Nenhum registro encontrado.</div>`;
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

        // Linha para Desktop (Ordem exata solicitada)
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

        // Card para Mobile / Tablet
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
                    <span>Dias úteis após 7d: <strong>${diasPassados}</strong></span>
                    <span>${badgePrazo}</span>
                </div>
                <div class="text-xs text-gray-600"><strong>Obs:</strong> ${item.observacao || ''}</div>
                <div class="flex justify-end space-x-3 pt-2 border-t mt-1">
                    <button onclick='editarOS(${JSON.stringify(item)})' class="text-blue-600 font-bold">Editar</button>
                    <button onclick='excluirOS("${item.id}")' class="text-red-600 font-bold">Excluir</button>
                </div>
            </div>
        `;
    });
}

// Sistema de Busca e Filtro em tempo real
window.filtrarDados = function() {
    const termo = document.getElementById('inputBusca').value.toLowerCase();
    const statusFiltro = document.getElementById('filtroStatus').value;

    const filtrados = listaGlobal.filter(item => {
        const textoMatch = (item.empresa && item.empresa.toLowerCase().includes(termo)) ||
                           (item.numOs && item.numOs.toLowerCase().includes(termo)) ||
                           (item.serial && item.serial.toLowerCase().includes(termo)) ||
                           (item.contato && item.contato.toLowerCase().includes(termo));
        
        const statusMatch = statusFiltro === "" || item.status === statusFiltro;

        return textoMatch && statusMatch;
    });

    renderizar(filtrados);
}

// Funções de Controle do Modal
window.abrirModal = function() {
    document.getElementById('osId').value = '';
    document.getElementById('formOS').reset();
    document.getElementById('modalTitulo').innerText = 'Nova Ordem de Serviço';
    document.getElementById('modalOS').classList.remove('hidden');
}

window.fecharModal = function() {
    document.getElementById('modalOS').classList.add('hidden');
}

window.editarOS = function(item) {
    document.getElementById('osId').value = item.id;
    document.getElementById('empresa').value = item.empresa || '';
    document.getElementById('contato').value = item.contato || '';
    document.getElementById('numOs').value = item.numOs || '';
    document.getElementById('serial').value = item.serial || '';
    document.getElementById('modelo').value = item.modelo || '';
    document.getElementById('defeito').value = item.defeito || '';
    document.getElementById('diagnostico').value = item.diagnostico || '';
    document.getElementById('dataEntrada').value = item.dataEntrada || '';
    document.getElementById('status').value = item.status || 'ANDAMENTO';
    document.getElementById('observacao').value = item.observacao || '';

    document.getElementById('modalTitulo').innerText = 'Editar Ordem de Serviço';
    document.getElementById('modalOS').classList.remove('hidden');
}

// Salvar ou Atualizar no Firebase
window.salvarOS = async function(event) {
    event.preventDefault();
    const id = document.getElementById('osId').value;
    
    const dadosOS = {
        empresa: document.getElementById('empresa').value,
        contato: document.getElementById('contato').value,
        numOs: document.getElementById('numOs').value,
        serial: document.getElementById('serial').value,
        modelo: document.getElementById('modelo').value,
        defeito: document.getElementById('defeito').value,
        diagnostico: document.getElementById('diagnostico').value,
        dataEntrada: document.getElementById('dataEntrada').value,
        status: document.getElementById('status').value,
        observacao: document.getElementById('observacao').value
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