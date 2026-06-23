// Visão gerencial de pedidos: lista todos os pedidos com filtros e permite excluir

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

    // Verifica autenticação e perfil — apenas gerentes acessam esta visão
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }

    const divFiltrosStatus = document.getElementById("filtros-status") as HTMLDivElement;
    const inputData        = document.getElementById("filtro-data") as HTMLInputElement;
    const btnLimparData    = document.getElementById("btn-limpar-data") as HTMLButtonElement;
    const divCarregando    = document.getElementById("carregando") as HTMLDivElement;
    const divLista         = document.getElementById("lista-pedidos") as HTMLDivElement;
    const pErro            = document.getElementById("mensagem-erro") as HTMLParagraphElement;

    let modalPedidoConfigurado = false;
    let pedidoExclusaoPendente: { id: string; btn: HTMLButtonElement } | null = null;

    // HTML do modal de confirmação — Bootstrap CSS only (sem bootstrap.bundle.js)
    function htmlModalExcluirPedido(): string {
        return `
        <div class="modal fade" id="modal-excluir-pedido" tabindex="-1"
             aria-labelledby="modal-excluir-pedido-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-sm border-0">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-semibold" id="modal-excluir-pedido-titulo">Excluir pedido</h5>
                        <button type="button" class="btn-close" id="btn-fechar-modal-excluir-pedido"
                                aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body pt-3">
                        <p class="text-muted text-center mb-0">
                            Deseja excluir o
                            <strong id="modal-excluir-pedido-label"></strong>?
                            Esta ação não pode ser desfeita.
                        </p>
                    </div>
                    <div class="modal-footer border-0 pt-0 gap-2">
                        <button type="button" class="btn btn-outline-secondary" id="btn-cancelar-excluir-pedido">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="btn-confirmar-excluir-pedido">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop fade" id="backdrop-modal-excluir-pedido"></div>`;
    }

    function fecharModalExcluirPedido(): void {
        const modal    = document.getElementById("modal-excluir-pedido");
        const backdrop = document.getElementById("backdrop-modal-excluir-pedido");
        if (!modal || !backdrop) return;
        modal.classList.remove("show");
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        modal.removeAttribute("aria-modal");
        backdrop.classList.remove("show");
        backdrop.style.display = "none";
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-pedido") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        pedidoExclusaoPendente = null;
    }

    function abrirModalExcluirPedido(id: string, btn: HTMLButtonElement): void {
        if (!document.getElementById("modal-excluir-pedido")) {
            document.body.insertAdjacentHTML("beforeend", htmlModalExcluirPedido());
            configurarEventosModalPedido();
        }
        pedidoExclusaoPendente = { id, btn };
        const label = document.getElementById("modal-excluir-pedido-label");
        if (label) label.textContent = `Pedido #${id}`;
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-pedido") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        const modal    = document.getElementById("modal-excluir-pedido");
        const backdrop = document.getElementById("backdrop-modal-excluir-pedido");
        if (!modal || !backdrop) return;
        modal.classList.add("show");
        modal.style.display = "block";
        modal.setAttribute("aria-modal", "true");
        modal.removeAttribute("aria-hidden");
        backdrop.style.display = "";
        backdrop.classList.add("show");
        document.body.classList.add("modal-open");
        document.body.style.overflow = "hidden";
    }

    // Remove o pedido via DELETE na API após confirmação no modal
    async function executarExclusaoPedido(): Promise<void> {
        if (!pedidoExclusaoPendente) return;
        const { id, btn } = pedidoExclusaoPendente;
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-pedido") as HTMLButtonElement;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Excluindo…`;
        btn.disabled = true;
        try {
            // Envia DELETE ao backend — apenas gerentes têm permissão
            const res = await fetch(`${BASE_URL}/api/pedidos/${id}/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
            if (res.status === 204) {
                fecharModalExcluirPedido();
                // Remove o card do DOM sem recarregar a página toda
                document.querySelector(`[data-pedido-id="${id}"]`)?.remove();
            } else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem excluir pedidos.";
                fecharModalExcluirPedido();
                btn.disabled = false;
            } else {
                pErro.textContent = "Não foi possível excluir o pedido.";
                fecharModalExcluirPedido();
                btn.disabled = false;
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            fecharModalExcluirPedido();
            btn.disabled = false;
        }
    }

    function configurarEventosModalPedido(): void {
        if (modalPedidoConfigurado) return;
        modalPedidoConfigurado = true;
        document.getElementById("btn-cancelar-excluir-pedido")?.addEventListener("click", fecharModalExcluirPedido);
        document.getElementById("btn-fechar-modal-excluir-pedido")?.addEventListener("click", fecharModalExcluirPedido);
        document.getElementById("backdrop-modal-excluir-pedido")?.addEventListener("click", fecharModalExcluirPedido);
        document.getElementById("btn-confirmar-excluir-pedido")?.addEventListener("click", () => { void executarExclusaoPedido(); });
        document.addEventListener("keydown", (evento: KeyboardEvent) => {
            if (evento.key !== "Escape") return;
            const modal = document.getElementById("modal-excluir-pedido");
            if (modal?.classList.contains("show")) fecharModalExcluirPedido();
        });
    }

    const statusFiltros = [
        { valor: "",           rotulo: "Todos" },
        { valor: "recebido",   rotulo: "Recebido" },
        { valor: "em_preparo", rotulo: "Em Preparo" },
        { valor: "pronto",     rotulo: "Pronto" },
        { valor: "entregue",   rotulo: "Entregue" },
    ];

    let statusAtivo = "";
    let dataAtiva   = "";

    // Reconstrói as pills de status destacando o filtro ativo
    function renderizarFiltros(): void {
        divFiltrosStatus.innerHTML = "";
        for (const f of statusFiltros) {
            const btn = document.createElement("button");
            btn.type        = "button";
            btn.className   = `btn btn-sm ${statusAtivo === f.valor ? "btn-secondary" : "btn-outline-secondary"}`;
            btn.textContent = f.rotulo;
            btn.addEventListener("click", () => {
                statusAtivo = f.valor;
                void carregarPedidos();
            });
            divFiltrosStatus.appendChild(btn);
        }
    }

    // Busca todos os pedidos aplicando os filtros de status e data
    async function carregarPedidos(): Promise<void> {
        renderizarFiltros();
        divCarregando.classList.remove("d-none");
        divLista.innerHTML = "";
        pErro.textContent  = "";

        const params = new URLSearchParams();
        if (statusAtivo) params.set("status", statusAtivo);
        if (dataAtiva)   params.set("data", dataAtiva);
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

            const pedidos: PedidoResposta[]         = await resPedidos.json();
            const cardapioItens: ItemCardapioInfo[]  = await resItens.json();

            const itemMap = new Map<number, string>();
            for (const item of cardapioItens) itemMap.set(item.id, item.nome);

            divCarregando.classList.add("d-none");
            renderizarPedidos(pedidos, itemMap);

        } catch {
            divCarregando.classList.add("d-none");
            pErro.textContent = "Não foi possível conectar ao servidor.";
        }
    }

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
                  <span class="${classeBadge(pedido.status)}">${ROTULO_STATUS[pedido.status] ?? pedido.status}</span>
                </div>
                <div class="card-body p-4 pt-3">
                  <p class="text-muted small mb-2">
                    <i class="bi bi-credit-card me-1"></i>${ROTULO_PAGAMENTO[pedido.forma_pagamento] ?? pedido.forma_pagamento}
                  </p>
                  ${obsHtml}
                  <ul class="list-unstyled mb-4">${linhasItens}</ul>
                  ${acoesHtml}
                </div>`;

            divLista.appendChild(card);
        }

        // Vincula botão de excluir pedido ao modal de confirmação
        divLista.querySelectorAll<HTMLButtonElement>(".btn-excluir-pedido").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset["id"]!;
                abrirModalExcluirPedido(id, btn);
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
        dataAtiva       = "";
        btnLimparData.classList.add("d-none");
        void carregarPedidos();
    });

    // Carregamento inicial
    void carregarPedidos();
});
