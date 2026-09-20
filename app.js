// Importações do Firebase SDK v9 (via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// TODO: Substitua com as credenciais do seu projeto Firebase gratuito
const firebaseConfig = {
  apiKey: "AIzaSyC-qGBaWyOV2HJ7u3ljrC-rnxsbi3s4DSA", authDomain: "controle-os-6f169.firebaseapp.com",
  projectId: "controle-os-6f169",
  storageBucket: "controle-os-6f169.firebasestorage.app",
  messagingSenderId: "228838068945",
  appId: "1:228838068945:web:f30fc3e8e5a9e0c4b0ebf0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let listaGlobal = [];

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
        alert("Erro ao conectar com o banco de dados.");
    }
}

// Renderizar na tela (Tabela e Cards responsivos)
function renderizar(dados) {
    const tbody = document.getElementById('tabelaCorpo');
    const containerMobile = document.getElementById('cardsMobile');
    
    tbody.innerHTML = '';
    containerMobile.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-400">Nenhum registro encontrado.</td></tr>`;
        containerMobile.innerHTML = `<div class="text-center py-4 text-gray-400 bg-white rounded-lg shadow">Nenhum registro encontrado.</div>`;
        return;
    }

    dados.forEach(item => {
        // Formata data de AAAA-MM-DD para DD/MM/AAAA se existir
        let dataFormatada = item.dataEntrada;
        if (item.dataEntrada && item.dataEntrada.includes('-')) {
            const partes = item.dataEntrada.split('-');
            dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        const badgeStatus = item.status === 'FINALIZADO' 
            ? '<span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Finalizado</span>' 
            : '<span class="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">Em Andamento</span>';

        // Linha para Desktop
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 font-medium text-gray-800">${item.empresa || ''}</td>
                <td class="px-4 py-3">${item.numOs || ''}</td>
                <td class="px-4 py-3 font-mono text-xs">${item.serial || ''}</td>
                <td class="px-4 py-3">${item.modelo || ''}</td>
                <td class="px-4 py-3">${item.defeito || ''}</td>
                <td class="px-4 py-3">${dataFormatada || ''}</td>
                <td class="px-4 py-3">${item.contatos || ''}</td>
                <td class="px-4 py-3">${badgeStatus}</td>
                <td class="px-4 py-3 text-center space-x-2">
                    <button onclick='editarOS(${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900 text-xs font-bold">Editar</button>
                    <button onclick='excluirOS("${item.id}")' class="text-red-600 hover:text-red-900 text-xs font-bold">Excluir</button>
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
                <div class="text-xs text-gray-500 flex justify-between">
                    <span>OS: <strong>${item.numOs || ''}</strong></span>
                    <span>Serial: <strong class="font-mono">${item.serial || ''}</strong></span>
                </div>
                <div class="text-sm text-gray-700"><strong>Modelo:</strong> ${item.modelo || ''}</div>
                <div class="text-sm text-gray-700"><strong>Defeito:</strong> ${item.defeito || ''}</div>
                <div class="text-sm text-gray-700"><strong>Contato:</strong> ${item.contatos || ''}</div>
                <div class="text-xs text-gray-400 mt-1 flex justify-between items-center">
                    <span>Entrada: ${dataFormatada || ''}</span>
                    <div class="space-x-3">
                        <button onclick='editarOS(${JSON.stringify(item)})' class="text-blue-600 font-bold">Editar</button>
                        <button onclick='excluirOS("${item.id}")' class="text-red-600 font-bold">Excluir</button>
                    </div>
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
                           (item.serial && item.serial.toLowerCase().includes(termo));
        
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
    document.getElementById('numOs').value = item.numOs || '';
    document.getElementById('serial').value = item.serial || '';
    document.getElementById('modelo').value = item.modelo || '';
    document.getElementById('dataEntrada').value = item.dataEntrada || '';
    document.getElementById('defeito').value = item.defeito || '';
    document.getElementById('contatos').value = item.contatos || '';
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
        numOs: document.getElementById('numOs').value,
        serial: document.getElementById('serial').value,
        modelo: document.getElementById('modelo').value,
        dataEntrada: document.getElementById('dataEntrada').value,
        defeito: document.getElementById('defeito').value,
        contatos: document.getElementById('contatos').value,
        status: document.getElementById('status').value,
        observacao: document.getElementById('observacao').value
    };

    try {
        if (id) {
            // Atualizar registro existente
            await updateDoc(doc(db, "relogios_os", id), dadosOS);
        } else {
            // Criar novo registro
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