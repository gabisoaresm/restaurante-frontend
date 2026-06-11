"use strict";
// Exibe o cardápio público agrupado por categoria; controles de gerente habilitados via perfil
// Aguarda o cabeçalho ser renderizado pelo autenticacao.ts para garantir
// que o tipo do usuário já foi persistido no localStorage
function aguardarCabecalho() {
    return new Promise(resolve => {
        const cab = document.getElementById("cabecalho");
        if (!cab || cab.innerHTML.trim() !== "") {
            resolve();
            return;
        }
        const obs = new MutationObserver(() => { obs.disconnect(); resolve(); });
        obs.observe(cab, { childList: true });
        // Timeout de segurança: resolve após 2 s mesmo sem resposta do /me/
        setTimeout(() => { obs.disconnect(); resolve(); }, 2000);
    });
}
// Extrai o primeiro erro legível de uma resposta de erro do backend
function extrairErro(dados) {
    if (typeof dados["erro"] === "string")
        return dados["erro"];
    for (const campo in dados) {
        const msgs = dados[campo];
        if (Array.isArray(msgs) && msgs.length > 0)
            return String(msgs[0]);
    }
    return "Erro inesperado.";
}
document.addEventListener("DOMContentLoaded", async () => {
    var _a, _b;
    // Aguarda autenticacao.ts terminar para que localStorage.tipo esteja disponível
    await aguardarCabecalho();
    const tipo = localStorage.getItem("tipo");
    const token = localStorage.getItem("token");
    const divCarregando = document.getElementById("carregando");
    const divLista = document.getElementById("lista-itens");
    const divFiltros = document.getElementById("filtros-categoria");
    const pErro = document.getElementById("mensagem-erro");
    // Exibe botões de gestão apenas para gerentes autenticados
    if (tipo === "gerente") {
        (_a = document.getElementById("acoes-gerente")) === null || _a === void 0 ? void 0 : _a.classList.remove("d-none");
    }
    // Lê o filtro de categoria da URL (ex.: cardapio.html?categoria=2)
    const params = new URLSearchParams(window.location.search);
    const categoriaAtiva = params.get("categoria");
    try {
        // Busca categorias e itens em paralelo (ambos de acesso público)
        const [resCateg, resItens] = await Promise.all([
            fetch(`${BASE_URL}/api/cardapio/categorias/`),
            fetch(categoriaAtiva
                ? `${BASE_URL}/api/cardapio/itens/?categoria=${categoriaAtiva}`
                : `${BASE_URL}/api/cardapio/itens/`)
        ]);
        const categorias = await resCateg.json();
        const todosItens = await resItens.json();
        // Clientes veem apenas itens disponíveis para pedido;
        // gerentes veem todos os itens para poder gerenciar os indisponíveis
        const itens = tipo === "gerente"
            ? todosItens
            : todosItens.filter(item => item.disponivel);
        // Monta pills de filtro por categoria
        const pillTodas = document.createElement("a");
        pillTodas.href = "cardapio.html";
        pillTodas.className = `btn btn-sm ${!categoriaAtiva ? "btn-dark" : "btn-outline-dark"}`;
        pillTodas.textContent = "Todas";
        divFiltros.appendChild(pillTodas);
        for (const cat of categorias) {
            const pill = document.createElement("a");
            pill.href = `cardapio.html?categoria=${cat.id}`;
            pill.className = `btn btn-sm ${categoriaAtiva === String(cat.id) ? "btn-secondary" : "btn-outline-secondary"}`;
            pill.textContent = cat.nome;
            divFiltros.appendChild(pill);
        }
        divCarregando.classList.add("d-none");
        // Agrupa os itens por categoria respeitando a ordem retornada pelo backend
        const itensPorCategoria = new Map();
        for (const cat of categorias) {
            itensPorCategoria.set(cat.id, { nome: cat.nome, itens: [] });
        }
        for (const item of itens) {
            (_b = itensPorCategoria.get(item.categoria)) === null || _b === void 0 ? void 0 : _b.itens.push(item);
        }
        // Verifica se há pelo menos um item a exibir
        const totalVisiveis = itens.length;
        if (totalVisiveis === 0) {
            divLista.innerHTML = `
                <div class="card shadow-sm border-0">
                  <div class="card-body text-center py-5 text-muted">
                    <i class="bi bi-journal-x fs-2 d-block mb-2"></i>
                    Nenhum item encontrado.
                  </div>
                </div>`;
            return;
        }
        // Renderiza uma seção por categoria, com título e grade de cards
        for (const [catId, { nome: catNome, itens: itensCategoria }] of itensPorCategoria) {
            if (itensCategoria.length === 0)
                continue;
            // Seção com título no estilo do Trab1 (cardapioCliente.html)
            const secao = document.createElement("section");
            secao.className = "mb-5";
            secao.dataset["catId"] = String(catId);
            secao.innerHTML = `
                <h6 class="fw-semibold text-uppercase text-muted mb-3"
                    style="font-size: .7rem; letter-spacing: .07em;">
                  <i class="bi bi-tag me-1"></i>${catNome}
                </h6>
                <div class="row g-3"></div>`;
            const row = secao.querySelector(".row");
            for (const item of itensCategoria) {
                const col = document.createElement("div");
                col.className = "col-md-4 col-sm-6 fade-in";
                // Atributo usado para remover o card após exclusão sem recarregar a página
                col.dataset["itemId"] = String(item.id);
                // Gerente vê badge de disponibilidade em todos os itens;
                // cliente não vê badge (todos os itens visíveis já estão disponíveis)
                const badgeDisp = tipo === "gerente"
                    ? (item.disponivel
                        ? `<span class="badge text-bg-success ms-2 flex-shrink-0">Disponível</span>`
                        : `<span class="badge text-bg-secondary ms-2 flex-shrink-0">Indisponível</span>`)
                    : "";
                // Botões de editar/excluir visíveis apenas para o gerente
                const botoesGerente = tipo === "gerente"
                    ? `<div class="d-flex gap-1 mt-3 pt-3 border-top">
                         <a href="editar-item.html?id=${item.id}"
                            class="btn btn-sm btn-outline-secondary flex-grow-1">
                           <i class="bi bi-pencil me-1"></i>Editar
                         </a>
                         <button class="btn btn-sm btn-outline-danger btn-excluir-item"
                                 data-id="${item.id}" data-nome="${item.nome}"
                                 title="Excluir item">
                           <i class="bi bi-trash"></i>
                         </button>
                       </div>`
                    : "";
                const precoBR = Number(item.preco).toFixed(2).replace(".", ",");
                col.innerHTML = `
                    <div class="card h-100 shadow-sm border-0">
                      <div class="card-body d-flex flex-column p-4">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                          <h6 class="card-title fw-semibold mb-0">${item.nome}</h6>
                          ${badgeDisp}
                        </div>
                        <p class="card-text text-muted small flex-grow-1 my-2">${item.descricao}</p>
                        <div class="d-flex justify-content-end align-items-center mt-auto">
                          <span class="fw-semibold" style="color: var(--vermelho)">R$ ${precoBR}</span>
                        </div>
                        ${botoesGerente}
                      </div>
                    </div>`;
                row.appendChild(col);
            }
            divLista.appendChild(secao);
        }
        // Vincula os botões de excluir após renderizar todas as seções
        if (tipo === "gerente") {
            divLista.querySelectorAll(".btn-excluir-item").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset["id"];
                    const nome = btn.dataset["nome"];
                    if (!confirm(`Excluir "${nome}" do cardápio? Esta ação não pode ser desfeita.`))
                        return;
                    // Envia DELETE ao backend com token de gerente
                    try {
                        const res = await fetch(`${BASE_URL}/api/cardapio/itens/${id}/`, {
                            method: "DELETE",
                            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
                        });
                        if (res.status === 204) {
                            // Remove o card; se a seção ficou vazia, remove a seção inteira
                            const col = document.querySelector(`[data-item-id="${id}"]`);
                            const secao = col === null || col === void 0 ? void 0 : col.closest("section");
                            col === null || col === void 0 ? void 0 : col.remove();
                            if (secao && secao.querySelectorAll("[data-item-id]").length === 0) {
                                secao.remove();
                            }
                        }
                        else if (res.status === 403) {
                            pErro.textContent = "Apenas gerentes podem excluir itens do cardápio.";
                        }
                        else {
                            const dados = await res.json();
                            pErro.textContent = extrairErro(dados);
                        }
                    }
                    catch (_a) {
                        pErro.textContent = "Não foi possível conectar ao servidor.";
                    }
                });
            });
        }
    }
    catch (_c) {
        divCarregando.classList.add("d-none");
        pErro.textContent = "Não foi possível carregar o cardápio. Verifique sua conexão com o servidor.";
    }
});
