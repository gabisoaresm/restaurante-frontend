// Fila de pedidos para atendente: lista todos os pedidos com filtros e permite avançar o status

interface ItemPedidoResposta {
    id: number;
    item: number;
    quantidade: number;
}

interface PedidoResposta {
    id: number;
    cliente_username: string;
    data_hora: string;
    status: string;
    forma_pagamento: string;
    observacoes: string;
    itens: ItemPedidoResposta[];
}

interface ItemCardapioInfo {
    id: number;
    nome: string;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Define o próximo status válido no fluxo de pedidos (apenas avança, nunca volta)
    const PROXIMO_STATUS: Record<string, string | null> = {
        recebido:   "em_preparo",
        em_preparo: "pronto",
        pronto:     "entregue",
        entregue:   null,
    };

    const ROTULO_STATUS: Record<string, string> = {
        recebido:   "Recebido",
        em_preparo: "Em Preparo",
        pronto:     "Pronto",
        entregue:   "Entregue",
    };

    const ROTULO_PAGAMENTO: Record<string, string> = {
        pix:            "Pix",
        dinheiro:       "Dinheiro",
        cartao_debito:  "Cartão de Débito",
        cartao_credito: "Cartão de Crédito",
    };

    function classeBadge(status: string): string {
        const mapa: Record<string, string> = {
            recebido:   "badge-recebido",
            em_preparo: "badge-em-preparo",
            pronto:     "badge-pronto",
            entregue:   "badge-entregue",
        };
        return `badge-status ${mapa[status] ?? "badge-recebido"}`;
    }

    function formatarData(iso: string): string {
        const d = new Date(iso);
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    // Verifica autenticação e perfil — apenas atendentes acessam a fila
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "atendente") {
        window.location.href = "index.html";
        return;
    }

    const divFiltrosStatus = document.getElementById("filtros-status") as HTMLDivElement;
    const inputData        = document.getElementById("filtro-data") as HTMLInputElement;
    const btnLimparData    = document.getElementById("btn-limpar-data") as HTMLButtonElement;
    const divCarregando    = document.getElementById("carregando") as HTMLDivElement;
    const divLista         = document.getElementById("lista-pedidos") as HTMLDivElement;
    const pErro            = document.getElementById("mensagem-erro") as HTMLParagraphElement;

    // Status disponíveis para filtro (inclui "Todos")
    const statusFiltros = [
        { valor: "",          rotulo: "Todos" },
        { valor: "recebido",  rotulo: "Recebido" },
        { valor: "em_preparo",rotulo: "Em Preparo" },
        { valor: "pronto",    rotulo: "Pronto" },
        { valor: "entregue",  rotulo: "Entregue" },
    ];

    let statusAtivo = "";
    let dataAtiva   = "";

    // Constrói as pills de filtro de status
    function renderizarFiltros(): void {
        divFiltrosStatus.innerHTML = "";
        for (const f of statusFiltros) {
            const btn = document.createElement("button");
            btn.type      = "button";
            btn.className = `btn btn-sm ${statusAtivo === f.valor ? "btn-secondary" : "btn-outline-secondary"}`;
            btn.textContent = f.rotulo;
            btn.addEventListener("click", () => {
                statusAtivo = f.valor;
                void carregarPedidos();
            });
            divFiltrosStatus.appendChild(btn);
        }
    }

    // Busca pedidos do backend aplicando os filtros ativos de status e data
    async function carregarPedidos(): Promise<void> {
        renderizarFiltros();
        divCarregando.classList.remove("d-none");
        divLista.innerHTML = "";
        pErro.textContent  = "";

        // Monta a query string com os filtros selecionados
        const params = new URLSearchParams();
        if (statusAtivo) params.set("status", statusAtivo);
        if (dataAtiva)   params.set("data", dataAtiva);
        const query = params.toString() ? `?${params.toString()}` : "";

        try {
            // Busca a fila de pedidos e os itens do cardápio para exibir os nomes
            const [resPedidos, resItens] = await Promise.all([
                fetch(`${BASE_URL}/api/pedidos/${query}`, {
                    headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
                }),
                fetch(`${BASE_URL}/api/cardapio/itens/`)
            ]);

            if (resPedidos.status === 403) {
                pErro.textContent = "Acesso negado. Apenas atendentes e gerentes podem ver a fila de pedidos.";
                divCarregando.classList.add("d-none");
                return;
            }
            if (!resPedidos.ok) {
                pErro.textContent = "Não foi possível carregar os pedidos.";
                divCarregando.classList.add("d-none");
                return;
            }

            const pedidos: PedidoResposta[]     = await resPedidos.json();
            const cardapioItens: ItemCardapioInfo[] = await resItens.json();

            // Mapa id → nome do item para resolver os nomes dos itens do pedido
            const itemMap = new Map<number, string>();
            for (const item of cardapioItens) itemMap.set(item.id, item.nome);

            divCarregando.classList.add("d-none");
            renderizarPedidos(pedidos, itemMap);

        } catch {
            divCarregando.classList.add("d-none");
            pErro.textContent = "Não foi possível conectar ao servidor.";
        }
    }

    // Renderiza a lista de pedidos no DOM
    function renderizarPedidos(pedidos: PedidoResposta[], itemMap: Map<number, string>): void {

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
                const nome = itemMap.get(ip.item) ?? `Item #${ip.item}`;
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

            // Botão de avançar status — oculto se o pedido já foi entregue
            const proximo = PROXIMO_STATUS[pedido.status];
            const btnAvancarHtml = proximo
                ? `<div class="d-flex align-items-center gap-2 pt-3 border-top">
                     <span class="text-muted small me-auto">
                       Próximo: <strong>${ROTULO_STATUS[proximo]}</strong>
                     </span>
                     <button class="btn btn-danger btn-sm btn-avancar-status"
                             data-id="${pedido.id}" data-proximo="${proximo}">
                       <i class="bi bi-arrow-right-circle me-1"></i>Avançar Status
                     </button>
                   </div>`
                : `<p class="text-muted small mb-0 pt-3 border-top">
                     <i class="bi bi-check-circle me-1"></i>Pedido entregue — nenhuma ação disponível.
                   </p>`;

            const card = document.createElement("div");
            card.className = "card shadow-sm border-0 mb-3 fade-in";
            card.dataset["pedidoId"] = String(pedido.id);
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center px-4 pt-4 pb-3 border-bottom">
                  <div>
                    <span class="fw-semibold">Pedido #${pedido.id}</span>
                    <span class="text-muted small ms-2">
                      <i class="bi bi-person me-1"></i>${pedido.cliente_username}
                    </span>
                    <span class="text-muted small ms-2">${formatarData(pedido.data_hora)}</span>
                  </div>
                  <span class="${classeBadge(pedido.status)}">${ROTULO_STATUS[pedido.status] ?? pedido.status}</span>
                </div>
                <div class="card-body p-4 pt-3">
                  <p class="text-muted small mb-2">
                    <i class="bi bi-credit-card me-1"></i>${ROTULO_PAGAMENTO[pedido.forma_pagamento] ?? pedido.forma_pagamento}
                  </p>
                  ${obsHtml}
                  <ul class="list-unstyled mb-4">${linhasItens}</ul>
                  ${btnAvancarHtml}
                </div>`;

            divLista.appendChild(card);
        }

        // Vincula os botões de avançar status após renderizar todos os cards
        divLista.querySelectorAll<HTMLButtonElement>(".btn-avancar-status").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id      = btn.dataset["id"]!;
                const proximo = btn.dataset["proximo"]!;
                btn.disabled    = true;
                btn.textContent = "Salvando…";

                try {
                    // Envia PATCH ao backend para avançar o status do pedido
                    const res = await fetch(`${BASE_URL}/api/pedidos/${id}/`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `${TOKEN_PREFIXO} ${token}`
                        },
                        body: JSON.stringify({ status: proximo })
                    });

                    if (res.ok) {
                        // Recarrega a lista para refletir o novo status sem reload completo
                        void carregarPedidos();
                    } else if (res.status === 403) {
                        pErro.textContent = "Apenas atendentes e gerentes podem atualizar o status.";
                        btn.disabled    = false;
                        btn.textContent = "Avançar Status";
                    } else {
                        const dados = await res.json() as Record<string, unknown>;
                        pErro.textContent = String(dados["erro"] ?? "Erro ao atualizar o status.");
                        btn.disabled    = false;
                        btn.textContent = "Avançar Status";
                    }
                } catch {
                    pErro.textContent = "Não foi possível conectar ao servidor.";
                    btn.disabled    = false;
                    btn.textContent = "Avançar Status";
                }
            });
        });
    }

    // Filtro por data: recarrega a lista ao selecionar ou limpar a data
    inputData.addEventListener("change", () => {
        dataAtiva = inputData.value;
        btnLimparData.classList.toggle("d-none", !dataAtiva);
        void carregarPedidos();
    });

    btnLimparData.addEventListener("click", () => {
        inputData.value = "";
        dataAtiva       = "";
        btnLimparData.classList.add("d-none");
        void carregarPedidos();
    });

    // Carregamento inicial da fila
    void carregarPedidos();
});
