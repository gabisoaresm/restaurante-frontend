// Lista os pedidos do cliente logado com itens, subtotais, total e status atual

interface ItemPedidoResposta {
    id: number;
    item: number;       // id do ItemCardapio
    quantidade: number;
}

interface PedidoResposta {
    id: number;
    cliente: number;
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
    preco: string;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Retorna a classe de badge de status conforme o design system
    function classeBadge(status: string): string {
        const mapa: Record<string, string> = {
            recebido:   "badge-recebido",
            em_preparo: "badge-em-preparo",
            pronto:     "badge-pronto",
            entregue:   "badge-entregue",
        };
        return `badge-status ${mapa[status] ?? "badge-recebido"}`;
    }

    // Formata o rótulo legível do status para exibição
    function rotuloStatus(status: string): string {
        const mapa: Record<string, string> = {
            recebido:   "Recebido",
            em_preparo: "Em Preparo",
            pronto:     "Pronto",
            entregue:   "Entregue",
        };
        return mapa[status] ?? status;
    }

    // Formata o rótulo legível da forma de pagamento
    function rotuloFormaPagamento(forma: string): string {
        const mapa: Record<string, string> = {
            pix:            "Pix",
            dinheiro:       "Dinheiro",
            cartao_debito:  "Cartão de Débito",
            cartao_credito: "Cartão de Crédito",
        };
        return mapa[forma] ?? forma;
    }

    // Formata a data ISO para o padrão brasileiro dd/mm/aaaa hh:mm
    function formatarData(iso: string): string {
        const d = new Date(iso);
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    // Verifica autenticação — apenas usuários logados acessam seus pedidos
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const divCarregando = document.getElementById("carregando") as HTMLDivElement;
    const divLista      = document.getElementById("lista-pedidos") as HTMLDivElement;
    const pErro         = document.getElementById("mensagem-erro") as HTMLParagraphElement;

    try {
        // Busca pedidos do cliente e itens do cardápio em paralelo para cruzar nomes e preços
        const [resPedidos, resItens] = await Promise.all([
            fetch(`${BASE_URL}/api/pedidos/`, {
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            }),
            fetch(`${BASE_URL}/api/cardapio/itens/`)
        ]);

        if (!resPedidos.ok) {
            divCarregando.classList.add("d-none");
            pErro.textContent = "Não foi possível carregar os pedidos.";
            return;
        }

        const pedidos: PedidoResposta[]       = await resPedidos.json();
        const cardapioItens: ItemCardapioInfo[] = await resItens.json();

        // Mapa de id → {nome, preco} para resolver nomes e preços dos itens do pedido
        const itemMap = new Map<number, ItemCardapioInfo>();
        for (const item of cardapioItens) itemMap.set(item.id, item);

        divCarregando.classList.add("d-none");

        // Exibe estado vazio se não houver pedidos
        if (pedidos.length === 0) {
            divLista.innerHTML = `
                <div class="card shadow-sm border-0">
                  <div class="card-body text-center py-5">
                    <i class="bi bi-bag fs-2 text-muted d-block mb-3"></i>
                    <p class="fw-semibold mb-1">Você ainda não fez nenhum pedido.</p>
                    <p class="text-muted small mb-3">Acesse o cardápio e escolha seus itens.</p>
                    <a href="cardapio.html" class="btn btn-danger btn-sm">
                      <i class="bi bi-plus-lg me-1"></i>Fazer um pedido agora
                    </a>
                  </div>
                </div>`;
            return;
        }

        // Renderiza cada pedido do mais recente para o mais antigo
        for (const pedido of pedidos) {

            // Calcula o total do pedido usando os preços do cardápio
            let total = 0;
            let linhasItens = "";
            for (const ip of pedido.itens) {
                const info = itemMap.get(ip.item);
                const nomItem  = info?.nome  ?? `Item #${ip.item}`;
                const precoUni = info ? parseFloat(info.preco) : 0;
                const subtotal = precoUni * ip.quantidade;
                total += subtotal;
                linhasItens += `
                    <tr>
                      <td class="fw-semibold">${nomItem}</td>
                      <td class="text-center">${ip.quantidade}</td>
                      <td class="text-end text-muted small">R$ ${precoUni.toFixed(2).replace(".", ",")}</td>
                      <td class="text-end fw-semibold">R$ ${subtotal.toFixed(2).replace(".", ",")}</td>
                    </tr>`;
            }

            // Linha de observações — exibida apenas quando preenchida
            const obsHtml = pedido.observacoes
                ? `<p class="text-muted small mb-3">
                     <i class="bi bi-chat-left-text me-1"></i><em>${pedido.observacoes}</em>
                   </p>`
                : "";

            const card = document.createElement("div");
            card.className = "card shadow-sm border-0 mb-3 fade-in";
            card.innerHTML = `
                <!-- Cabeçalho do card: número, data e badge de status -->
                <div class="cabecalho-card-pedido d-flex justify-content-between align-items-center px-4 pt-4 pb-3 border-bottom">
                  <div class="meta-pedido">
                    <span class="fw-semibold d-block d-sm-inline">Pedido #${pedido.id}</span>
                    <span class="text-muted small">${formatarData(pedido.data_hora)}</span>
                  </div>
                  <span class="${classeBadge(pedido.status)}">${rotuloStatus(pedido.status)}</span>
                </div>
                <div class="card-body p-4 pt-3">
                  <!-- Forma de pagamento -->
                  <p class="text-muted small mb-2">
                    <i class="bi bi-credit-card me-1"></i>${rotuloFormaPagamento(pedido.forma_pagamento)}
                  </p>
                  ${obsHtml}
                  <!-- Tabela de itens com subtotais e total -->
                  <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light border-bottom">
                        <tr>
                          <th>Item</th>
                          <th class="text-center" style="width:70px">Qtd</th>
                          <th class="text-end" style="width:120px">Preço unit.</th>
                          <th class="text-end" style="width:120px">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>${linhasItens}</tbody>
                      <tfoot class="table-light border-top">
                        <tr>
                          <td colspan="3" class="text-end fw-semibold">Total</td>
                          <td class="text-end fw-semibold" style="color: var(--vermelho)">
                            R$ ${total.toFixed(2).replace(".", ",")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>`;

            divLista.appendChild(card);
        }

    } catch {
        divCarregando.classList.add("d-none");
        pErro.textContent = "Não foi possível conectar ao servidor.";
    }
});
