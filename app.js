// Importações do Firebase SDK v9 (via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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
let abaAtual = "ANDAMENTO"; // Pode ser "ANDAMENTO", "AGUARDANDO", "ENVIADO" ou "FINALIZADO"

// Função de Transição da Tela de Abertura
window.entrarSistema = function() {
    const tela = document.getElementById('telaAbertura');
    const conteudo = document.getElementById('conteudoSistema');
    if (tela && conteudo) {
        tela.classList.add('opacity-0');
        setTimeout(() => {
            tela.style.display = 'none';
            conteudo.classList.remove('opacity-0');
        }, 700);
    }
}

// Função auxiliar para calcular dias úteis (pausa se o status for AGUARDANDO ou ENVIADO)
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
        if (diaSemana !== 0 && diaSemana !== 6) {
            diasUteis++;
        }
    }

    let statusPrazo = diasUteis > 7 ? "Vencido" : "No Prazo";
    return { diasPassados: diasUteis, statusPrazo };
}

// Função para buscar dados do Firebase com paginação otimizada
async function carregarDados() {
    try {
        const q = query(collection(db, "relogios_os"), orderBy("dataEntrada", "desc"), limit(200));
        const querySnapshot = await getDocs(q);
        
        listaGlobal = [];
        querySnapshot.forEach((docSnap) => {
            listaGlobal.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        atualizarContadores();
        filtrarDados();
    } catch (error) {
        console.error("Erro ao carregar dados: ", error);
        try {
            const fallbackSnapshot = await getDocs(collection(db, "relogios_os"));
            listaGlobal = [];
            fallbackSnapshot.forEach((docSnap) => {
                listaGlobal.push({ id: docSnap.id, ...docSnap.data() });
            });
            atualizarContadores();
            filtrarDados();
        } catch (errFallback) {
            alert("Erro ao conectar com o banco de dados.");
        }
    }
}

// Atualiza os contadores no topo com os totais de cada status
function atualizarContadores() {
    const ativas = listaGlobal.filter(item => (item.status || 'ANDAMENTO') === 'ANDAMENTO');
    const aguardando = listaGlobal.filter(item => item.status === 'AGUARDANDO');
    const enviados = listaGlobal.filter(item => item.status === 'ENVIADO');

    const contadorAtivasEl = document.getElementById('contadorAtivas');
    const contadorAguardandoEl = document.getElementById('contadorAguardando');
    const contadorEnviadosEl = document.getElementById('contadorEnviados');

    if (contadorAtivasEl) contadorAtivasEl.innerText = ativas.length;
    if (contadorAguardandoEl) contadorAguardandoEl.innerText = aguardando.length;
    if (contadorEnviadosEl) contadorEnviadosEl.innerText = enviados.length;
}

// Alternar entre as abas de visualização
window.mudarAba = function(status) {
    abaAtual = status;
    const btnAtivas = document.getElementById('btnAbaAtivas');
    const btnAguardando = document.getElementById('btnAbaAguardando');
    const btnEnviado = document.getElementById('btnAbaEnviado');
    const btnFinalizadas = document.getElementById('btnAbaFinalizadas');

    const resetClass = "flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition bg-gray-200 text-gray-700 hover:bg-gray-300 whitespace-nowrap shadow-sm";
    if (btnAtivas) btnAtivas.className = resetClass;
    if (btnAguardando) btnAguardando.className = resetClass;
    if (btnEnviado) btnEnviado.className = resetClass;
    if (btnFinalizadas) btnFinalizadas.className = resetClass;

    if (status === 'ANDAMENTO' && btnAtivas) {
        btnAtivas.className = "flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition bg-blue-600 text-white whitespace-nowrap shadow-sm";
    } else if (status === 'AGUARDANDO' && btnAguardando) {
        btnAguardando.className = "flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition bg-amber-500 text-white whitespace-nowrap shadow-sm";
    } else if (status === 'ENVIADO' && btnEnviado) {
        btnEnviado.className = "flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition bg-purple-600 text-white whitespace-nowrap shadow-sm";
    } else if (status === 'FINALIZADO' && btnFinalizadas) {
        btnFinalizadas.className = "flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-sm transition bg-green-600 text-white whitespace-nowrap shadow-sm";
    }

    filtrarDados();
}

// Renderizar na tela
function renderizar(dados) {
    const thead = document.getElementById('tabelaCabecalho');
    const tbody = document.getElementById('tabelaCorpo');
    const containerMobile = document.getElementById('cardsMobile');
    
    if (!thead || !tbody || !containerMobile) return;

    tbody.innerHTML = '';
    containerMobile.innerHTML = '';

    const exibePrazos = (abaAtual === 'ANDAMENTO');

    if (exibePrazos) {
        thead.innerHTML = `
            <tr>
                <th class="px-3 py-3 text-left">Empresa</th>
                <th class="px-3 py-3 text-left">Contato</th>
                <th class="px-3 py-3 text-left">Nº OS</th>
                <th class="px-3 py-3 text-left">Serial</th>
                <th class="px-3 py-3 text-left">Modelo</th>
                <th class="px-3 py-3 text-left">Defeito</th>
                <th class="px-3 py-3 text-left">Diagnóstico</th>
                <th class="px-3 py-3 text-left">Entrada</th>
                <th class="px-3 py-3 text-center">Dias Úteis</th>
                <th class="px-3 py-3 text-center">Prazo</th>
                <th class="px-3 py-3 text-center">Status</th>
                <th class="px-3 py-3 text-left">Observações</th>
                <th class="px-3 py-3 text-center">Ações</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th class="px-3 py-3 text-left">Empresa</th>
                <th class="px-3 py-3 text-left">Contato</th>
                <th class="px-3 py-3 text-left">Nº OS</th>
                <th class="px-3 py-3 text-left">Serial</th>
                <th class="px-3 py-3 text-left">Modelo</th>
                <th class="px-3 py-3 text-left">Defeito</th>
                <th class="px-3 py-3 text-left">Diagnóstico</th>
                <th class="px-3 py-3 text-left">Entrada</th>
                <th class="px-3 py-3 text-center">Status</th>
                <th class="px-3 py-3 text-left">Observações</th>
                <th class="px-3 py-3 text-center">Ações</th>
            </tr>
        `;
    }

    if (dados.length === 0) {
        const colspanVal = exibePrazos ? 13 : 11;
        tbody.innerHTML = `<tr><td colspan="${colspanVal}" class="text-center py-6 text-gray-400">Nenhum registro encontrado nesta visualização.</td></tr>`;
        containerMobile.innerHTML = `<div class="text-center py-6 text-gray-400 bg-white rounded-lg shadow p-4 text-sm">Nenhum registro encontrado nesta visualização.</div>`;
        return;
    }

    dados.forEach(item => {
        let dataFormatada = item.dataEntrada;
        if (item.dataEntrada && item.dataEntrada.includes('-')) {
            const partes = item.dataEntrada.split('-');
            dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        const { diasPassados, statusPrazo } = calcularPrazos(item.dataEntrada, item.status);
        const statusAtual = item.status || 'ANDAMENTO';
        const isVencido = (statusPrazo === 'Vencido' && statusAtual === 'ANDAMENTO');

        const badgePrazo = statusPrazo === 'Vencido'
            ? '<span class="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Vencido</span>'
            : '<span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">No Prazo</span>';

        let badgeStatus = '<span class="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">Andamento</span>';
        if (statusAtual === 'AGUARDANDO') {
            badgeStatus = '<span class="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">Aguardando</span>';
        } else if (statusAtual === 'ENVIADO') {
            badgeStatus = '<span class="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">Enviado</span>';
        } else if (statusAtual === 'FINALIZADO') {
            badgeStatus = '<span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Finalizado</span>';
        }

        const linhaVencidaClass = isVencido ? 'bg-red-100 border-red-200 text-red-900 font-medium' : 'hover:bg-gray-50';

        if (exibePrazos) {
            tbody.innerHTML += `
                <tr class="${linhaVencidaClass} transition border-b">
                    <td class="px-3 py-3 font-medium">${item.empresa || ''}</td>
                    <td class="px-3 py-3">${item.contato || ''}</td>
                    <td class="px-3 py-3 font-bold text-blue-800">${item.numOs || ''}</td>
                    <td class="px-3 py-3 font-mono">${item.serial || ''}</td>
                    <td class="px-3 py-3 font-semibold text-blue-700">${item.modelo || ''}</td>
                    <td class="px-3 py-3">${item.defeito || ''}</td>
                    <td class="px-3 py-3">${item.diagnostico || ''}</td>
                    <td class="px-3 py-3">${dataFormatada || ''}</td>
                    <td class="px-3 py-3 text-center font-bold">${diasPassados}</td>
                    <td class="px-3 py-3 text-center">${badgePrazo}</td>
                    <td class="px-3 py-3 text-center">${badgeStatus}</td>
                    <td class="px-3 py-3">${item.observacao || ''}</td>
                    <td class="px-3 py-3 text-center space-x-2 whitespace-nowrap">
                        <button onclick='imprimirEtiquetaPorId("${item.id}")' class="text-amber-600 hover:text-amber-900 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200">Imprimir</button>
                        <button onclick='editarOSPorId("${item.id}")' class="text-blue-600 hover:text-blue-900 font-bold">Editar</button>
                        <button onclick='excluirOS("${item.id}")' class="text-red-600 hover:text-red-900 font-bold">Excluir</button>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML += `
                <tr class="${linhaVencidaClass} transition border-b">
                    <td class="px-3 py-3 font-medium">${item.empresa || ''}</td>
                    <td class="px-3 py-3">${item.contato || ''}</td>
                    <td class="px-3 py-3 font-bold text-blue-800">${item.numOs || ''}</td>
                    <td class="px-3 py-3 font-mono">${item.serial || ''}</td>
                    <td class="px-3 py-3 font-semibold text-blue-700">${item.modelo || ''}</td>
                    <td class="px-3 py-3">${item.defeito || ''}</td>
                    <td class="px-3 py-3">${item.diagnostico || ''}</td>
                    <td class="px-3 py-3">${dataFormatada || ''}</td>
                    <td class="px-3 py-3 text-center">${badgeStatus}</td>
                    <td class="px-3 py-3">${item.observacao || ''}</td>
                    <td class="px-3 py-3 text-center space-x-2 whitespace-nowrap">
                        <button onclick='imprimirEtiquetaPorId("${item.id}")' class="text-amber-600 hover:text-amber-900 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200">Imprimir</button>
                        <button onclick='editarOSPorId("${item.id}")' class="text-blue-600 hover:text-blue-900 font-bold">Editar</button>
                        <button onclick='excluirOS("${item.id}")' class="text-red-600 hover:text-red-900 font-bold">Excluir</button>
                    </td>
                </tr>
            `;
        }

        const cardVencidoClass = isVencido ? 'bg-red-100 border-2 border-red-300 shadow-md' : 'bg-white border shadow-sm';
        
        let blocoInfoExtra = exibePrazos ? `
            <div class="flex justify-between items-center text-xs bg-gray-100 p-2 rounded">
                <span>Entrada: ${dataFormatada || ''}</span>
                <span>Dias Úteis: <strong>${diasPassados}</strong></span>
                <span>${badgePrazo}</span>
            </div>
        ` : `
            <div class="flex justify-between items-center text-xs bg-gray-100 p-2 rounded">
                <span>Entrada: ${dataFormatada || ''}</span>
            </div>
        `;

        containerMobile.innerHTML += `
            <div class="${cardVencidoClass} rounded-xl p-4 flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-gray-900 text-base">${item.empresa || ''}</span>
                    <div>${badgeStatus}</div>
                </div>
                <div class="text-xs text-gray-600"><strong>Contato:</strong> ${item.contato || 'Não informado'}</div>
                <div class="text-xs text-gray-600 flex justify-between">
                    <span>OS: <strong class="text-blue-800">${item.numOs || ''}</strong></span>
                    <span>Serial: <strong class="font-mono">${item.serial || ''}</strong></span>
                </div>
                <div class="text-sm text-gray-800"><strong>Modelo:</strong> <span class="text-blue-700 font-semibold">${item.modelo || ''}</span></div>
                <div class="text-sm text-gray-800"><strong>Defeito:</strong> ${item.defeito || ''}</div>
                <div class="text-sm text-gray-800"><strong>Diagnóstico:</strong> ${item.diagnostico || ''}</div>
                ${blocoInfoExtra}
                <div class="text-xs text-gray-700"><strong>Obs:</strong> ${item.observacao || ''}</div>
                <div class="flex justify-end space-x-3 pt-2 border-t mt-1">
                    <button onclick='imprimirEtiquetaPorId("${item.id}")' class="text-amber-700 font-bold text-xs bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200">Imprimir</button>
                    <button onclick='editarOSPorId("${item.id}")' class="text-blue-600 font-bold text-sm px-2 py-1">Editar</button>
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

window.editarOSPorId = function(id) {
    const item = listaGlobal.find(i => i.id === id);
    if (item) {
        window.editarOS(item);
    }
}

// Função para imprimir a etiqueta de bancada direto no relógio
window.imprimirEtiquetaPorId = function(id) {
    const item = listaGlobal.find(i => i.id === id);
    if (!item) return;

    let dataFormatada = item.dataEntrada;
    if (item.dataEntrada && item.dataEntrada.includes('-')) {
        const partes = item.dataEntrada.split('-');
        dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    const containerEtiqueta = document.getElementById('etiquetaImpressao');
    if (containerEtiqueta) {
        containerEtiqueta.style.display = 'block';
        containerEtiqueta.innerHTML = `
            <div style="border: 2px dashed #000; padding: 12px; max-width: 320px; font-family: Arial, sans-serif;">
                <div style="font-size: 14px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
                    ASSISTÊNCIA TÉCNICA - OS
                </div>
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                    Nº OS: ${item.numOs || ''}
                </div>
                <div style="font-size: 13px; margin-bottom: 4px;">
                    <strong>Empresa:</strong> ${item.empresa || ''}
                </div>
                <div style="font-size: 13px; margin-bottom: 4px;">
                    <strong>Modelo:</strong> ${item.modelo || ''} | <strong>Serial:</strong> ${item.serial || ''}
                </div>
                <div style="font-size: 13px; margin-bottom: 4px;">
                    <strong>Entrada:</strong> ${dataFormatada || ''}
                </div>
                <div style="font-size: 13px; border-top: 1px dotted #000; padding-top: 4px; margin-top: 4px;">
                    <strong>Defeito:</strong> ${item.defeito || 'Não informado'}
                </div>
                ${item.observacao ? `<div style="font-size: 12px; margin-top: 4px;"><strong>Obs:</strong> ${item.observacao}</div>` : ''}
            </div>
        `;
    }

    setTimeout(() => {
        window.print();
        if (containerEtiqueta) {
            containerEtiqueta.style.display = 'none';
        }
    }, 200);
}

// Salvar ou Atualizar no Firebase com Validação Inteligente de Duplicidade
window.salvarOS = async function(event) {
    event.preventDefault();
    const osIdEl = document.getElementById('osId');
    const id = osIdEl ? osIdEl.value : '';
    
    const getVal = (elementId) => {
        const el = document.getElementById(elementId);
        return el ? el.value.trim() : '';
    };

    const numOsDigitado = getVal('numOs');
    const serialDigitado = getVal('serial');
    const statusDigitado = getVal('status');

    const duplicada = listaGlobal.find(item => {
        if (item.id === id) return false;

        const mesmoNumeroOS = (item.numOs === numOsDigitado);
        const mesmoSerialAtivo = (item.serial === serialDigitado && item.status !== 'FINALIZADO');

        return mesmoNumeroOS || mesmoSerialAtivo;
    });

    if (duplicada) {
        if (duplicada.numOs === numOsDigitado) {
            alert(`Atenção: Já existe outra Ordem de Serviço cadastrada com o Nº "${duplicada.numOs}" (${duplicada.empresa}).`);
        } else {
            alert(`Atenção: Este relógio (Serial: ${serialDigitado}) já possui uma OS ativa em andamento/espera (${duplicada.numOs} - ${duplicada.empresa}). Conclua o atendimento anterior antes de dar uma nova entrada.`);
        }
        return;
    }

    const dadosOS = {
        empresa: getVal('empresa'),
        contato: getVal('contato'),
        numOs: numOsDigitado,
        serial: serialDigitado,
        modelo: getVal('modelo'),
        defeito: getVal('defeito'),
        diagnostico: getVal('diagnostico'),
        dataEntrada: getVal('dataEntrada'),
        status: statusDigitado,
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
            alert("Erro ao excluir o registo.");
        }
    }
}

// Inicializa a aplicação carregando os dados do banco
carregarDados();