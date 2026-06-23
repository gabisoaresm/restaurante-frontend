"use strict";
// Visão gerencial de pedidos: lista todos os pedidos com filtros e permite excluir
document.addEventListener("DOMContentLoaded", async () => {
    const ROTULO_STATUS = {
        recebido: "Recebido",
        em_preparo: "Em Preparo",
        pronto: "Pronto",
        entregue: "Entregue",
    };
    const ROTULO_PAGAMENTO = {
        pix: "Pix",
        dinheiro: "Dinheiro",
        cartao_debito: "Cartão de Débito",
        cartao_credito: "Cartão de Crédito",
    };
    function classeBadge(status) {
        var _a;
        const mapa = {
            recebido: "badge-recebido",
            em_preparo: "badge-em-preparo",
            pronto: "badge-pronto",
            entregue: "badge-entregue",
        };
        return `badge-status ${(_a = mapa[status]) !== null && _a !== void 0 ? _a : "badge-recebido"}`;
    }
    function formatarData(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    // Verifica autenticação e perfil — apenas gerentes acessam esta visão
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }
    const divFiltrosStatus = document.getElementById("filtros-status");
    const inputData = document.getElementById("filtro-data");
    const btnLimparData = document.getElementById("btn-limpar-data");
    const divCarregando = document.getElementById("carregando");
    const divLista = document.getElementById("lista-pedidos");
    const pErro = document.getElementById("mensagem-erro");
    const statusFiltros = [
        { valor: "", rotulo: "Todos" },
        { valor: "recebido", rotulo: "Recebido" },
        { valor: "em_preparo", rotulo: "Em Preparo" },
        { valor: "pronto", rotulo: "Pronto" },
        { valor: "entregue", rotulo: "Entregue" },
    ];
    let statusAtivo = "";
    let dataAtiva = "";
    // Reconstrói as pills de status destacando o filtro ativo
    function renderizarFiltros() {
        divFiltrosStatus.innerHTML = "";
        for (const f of statusFiltros) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `btn btn-sm ${statusAtivo === f.valor ? "btn-secondary" : "btn-outline-secondary"}`;
            btn.textContent = f.rotulo;
            btn.addEventListener("click", () => {
                statusAtivo = f.valor;
                void carregarPedidos();
            });
            divFiltrosStatus.appendChild(btn);
        }
    }
    // Busca todos os pedidos aplicando os filtros de status e data
    async function carregarPedidos() {
        renderizarFiltros();
        divCarregando.classList.remove("d-none");
        divLista.innerHTML = "";
        pErro.textContent = "";
        const params = new URLSearchParams();
        if (statusAtivo)
            params.set("status", statusAtivo);
        if (dataAtiva)
            params.set("data", dataAtiva);
        const query = params.toString() ? `?${params.toString()}` : "";
        try {
            // Busca todos os pedidos (gerente vê todos) e itens do cardápio em paralelo
            const [resPedidos, resItens] = await Promise.all([
                fetch(`${BASE_URL}/api/pedidos/${query}`, {
                    headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
                }),
                fetch(`${BASE_URL}/api/cardapio/itens/`)
            ]);
            if (!resPedidos.ok) {
                pErro.textContent = "Não foi possível carregar os pedidos.";
                divCarregando.classList.add("d-none");
                return;
            }
            const pedidos = await resPedidos.json();
            const cardapioItens = await resItens.json();
            const itemMap = new Map();
            for (const item of cardapioItens)
                itemMap.set(item.id, item.nome);
            divCarregando.classList.add("d-none");
            renderizarPedidos(pedidos, itemMap);
        }
        catch (_a) {
            divCarregando.classList.add("d-none");
            pErro.textContent = "Não foi possível conectar ao servidor.";
        }
    }
    function renderizarPedidos(pedidos, itemMap) {
        var _a, _b;
        if (pedidos.length === 0) {
            divLista.innerHTML = `
                <div class="card shadow-sm border-0">
                  <div class="card-body text-center py-5">
                    <i class="bi bi-check2-all fs-2 text-muted d-block mb-3"></i>
                    <p class="fw-semibold mb-1">Nenhum pedido encontrado.</p>
                    <p class="text-muted small mb-0">Não há pedidos para o filtro selecionado.</p>
                  </div>
                </div>`;
            return;
        }
        for (const pedido of pedidos) {
            const linhasItens = pedido.itens.map(ip => {
                var _a;
                const nome = (_a = itemMap.get(ip.item)) !== null && _a !== void 0 ? _a : `Item #${ip.item}`;
                return `<li class="small d-flex align-items-center gap-2 py-1 border-bottom">
                          <span class="badge text-bg-secondary fw-normal" style="min-width:2rem">${ip.quantidade}×</span>
                          <span class="fw-semibold">${nome}</span>
                        </li>`;
            }).join("");
            const obsHtml = pedido.observacoes
                ? `<p class="text-muted small mb-3">
                     <i class="bi bi-chat-left-text me-1"></i><em>${pedido.observacoes}</em>
                   </p>`
                : "";
            // Gerente só pode excluir pedidos; avançar status é exclusivo do atendente
            const acoesHtml = `
                <div class="d-flex justify-content-end pt-3 border-top">
                  <button class="btn btn-outline-danger btn-sm btn-excluir-pedido"
                          data-id="${pedido.id}">
                    <i class="bi bi-trash me-1"></i>Excluir
                  </button>
                </div>`;
            const card = document.createElement("div");
            card.className = "card shadow-sm border-0 mb-3 fade-in";
            card.dataset["pedidoId"] = String(pedido.id);
            card.innerHTML = `
                <div class="cabecalho-card-pedido d-flex justify-content-between align-items-center px-4 pt-4 pb-3 border-bottom">
                  <div class="meta-pedido">
                    <span class="fw-semibold d-block d-sm-inline">Pedido #${pedido.id}</span>
                    <span class="text-muted small">
                      <i class="bi bi-person me-1"></i>${pedido.cliente_username}
                    </span>
                    <span class="text-muted small">${formatarData(pedido.data_hora)}</span>
                  </div>
                  <span class="${classeBadge(pedido.status)}">${(_a = ROTULO_STATUS[pedido.status]) !== null && _a !== void 0 ? _a : pedido.status}</span>
                </div>
                <div class="card-body p-4 pt-3">
                  <p class="text-muted small mb-2">
                    <i class="bi bi-credit-card me-1"></i>${(_b = ROTULO_PAGAMENTO[pedido.forma_pagamento]) !== null && _b !== void 0 ? _b : pedido.forma_pagamento}
                  </p>
                  ${obsHtml}
                  <ul class="list-unstyled mb-4">${linhasItens}</ul>
                  ${acoesHtml}
                </div>`;
            divLista.appendChild(card);
        }
        // Vincula botão de excluir pedido
        divLista.querySelectorAll(".btn-excluir-pedido").forEach(btn => {
            btn.addEventListener("click", async () => {
                var _a;
                const id = btn.dataset["id"];
                if (!confirm(`Excluir o Pedido #${id}? Esta ação não pode ser desfeita.`))
                    return;
                btn.disabled = true;
                try {
                    // Envia DELETE ao backend — apenas gerentes têm permissão
                    const res = await fetch(`${BASE_URL}/api/pedidos/${id}/`, {
                        method: "DELETE",
                        headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
                    });
                    if (res.status === 204) {
                        // Remove o card do DOM sem recarregar a página toda
                        (_a = document.querySelector(`[data-pedido-id="${id}"]`)) === null || _a === void 0 ? void 0 : _a.remove();
                    }
                    else if (res.status === 403) {
                        pErro.textContent = "Apenas gerentes podem excluir pedidos.";
                        btn.disabled = false;
                    }
                    else {
                        pErro.textContent = "Não foi possível excluir o pedido.";
                        btn.disabled = false;
                    }
                }
                catch (_b) {
                    pErro.textContent = "Não foi possível conectar ao servidor.";
                    btn.disabled = false;
                }
            });
        });
    }
    // Filtro por data
    inputData.addEventListener("change", () => {
        dataAtiva = inputData.value;
        btnLimparData.classList.toggle("d-none", !dataAtiva);
        void carregarPedidos();
    });
    btnLimparData.addEventListener("click", () => {
        inputData.value = "";
        dataAtiva = "";
        btnLimparData.classList.add("d-none");
        void carregarPedidos();
    });
    // Carregamento inicial
    void carregarPedidos();
});
