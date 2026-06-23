// Tela de criação de pedido: exibe o cardápio por categoria com campos de quantidade,
// calcula o total em tempo real e envia o pedido ao backend (acesso restrito a clientes)

interface CategoriaCardapio {
    id: number;
    nome: string;
}

interface ItemCardapio {
    id: number;
    nome: string;
    descricao: string;
    preco: string;
    categoria: number;
    disponivel: boolean;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Verifica autenticação e perfil — apenas clientes podem criar pedidos
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "cliente") {
        window.location.href = "index.html";
        return;
    }

    const divCarregando = document.getElementById("carregando") as HTMLDivElement;
    const formPedido    = document.getElementById("form-pedido") as HTMLFormElement;
    const divSecoes     = document.getElementById("secoes-itens") as HTMLDivElement;
    const selectPagto   = document.getElementById("forma-pagamento") as HTMLSelectElement;
    const textareaObs   = document.getElementById("observacoes") as HTMLTextAreaElement;
    const pTotal        = document.getElementById("total-pedido") as HTMLParagraphElement;
    const pErro         = document.getElementById("mensagem-erro") as HTMLParagraphElement;
    const btn           = formPedido.querySelector("button[type='submit']") as HTMLButtonElement;

    // Mapeia id do item → preço (string decimal) para calcular o total
    const precosMap = new Map<number, number>();

    // Recalcula o total somando quantidade × preço de cada input de quantidade
    function recalcularTotal(): void {
        let total = 0;
        divSecoes.querySelectorAll<HTMLInputElement>("input[data-item-id]").forEach(input => {
            const itemId = Number(input.dataset["itemId"]);
            const qtd    = Math.max(0, Number(input.value) || 0);
            total += qtd * (precosMap.get(itemId) ?? 0);
        });
        pTotal.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
    }

    // Busca categorias e itens disponíveis em paralelo (ambos de acesso público)
    try {
        const [resCateg, resItens] = await Promise.all([
            fetch(`${BASE_URL}/api/cardapio/categorias/`),
            fetch(`${BASE_URL}/api/cardapio/itens/`)
        ]);

        const categorias: CategoriaCardapio[] = await resCateg.json();
        const todosItens: ItemCardapio[]       = await resItens.json();

        // Cliente vê apenas itens disponíveis para pedido
        const itens = todosItens.filter(item => item.disponivel);

        // Agrupa itens por categoria respeitando a ordem das categorias
        const itensPorCat = new Map<number, ItemCardapio[]>();
        for (const cat of categorias) itensPorCat.set(cat.id, []);
        for (const item of itens) itensPorCat.get(item.categoria)?.push(item);

        // Preenche o mapa de preços para o cálculo do total
        for (const item of itens) {
            precosMap.set(item.id, parseFloat(item.preco));
        }

        divCarregando.classList.add("d-none");

        // Renderiza uma tabela por categoria contendo os itens disponíveis
        for (const cat of categorias) {
            const itensCategoria = itensPorCat.get(cat.id) ?? [];
            if (itensCategoria.length === 0) continue;

            const secao = document.createElement("div");
            secao.className = "mb-4";
            secao.innerHTML = `
                <h6 class="fw-semibold text-uppercase text-muted mb-3"
                    style="font-size: .7rem; letter-spacing: .07em;">
                  <i class="bi bi-tag me-1"></i>${cat.nome}
                </h6>
                <div class="card shadow-sm border-0">
                  <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light border-bottom">
                        <tr>
                          <th class="ps-4">Item</th>
                          <th class="d-none d-md-table-cell">Descrição</th>
                          <th style="width:110px">Preço</th>
                          <th class="pe-4" style="width:120px">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody id="tbody-cat-${cat.id}"></tbody>
                    </table>
                  </div>
                </div>`;

            divSecoes.appendChild(secao);

            const tbody = document.getElementById(`tbody-cat-${cat.id}`)!;
            for (const item of itensCategoria) {
                const precoBR = parseFloat(item.preco).toFixed(2).replace(".", ",");
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="ps-4 fw-semibold">${item.nome}</td>
                    <td class="text-muted small d-none d-md-table-cell">${item.descricao}</td>
                    <td class="fw-semibold" style="color: var(--vermelho)">R$ ${precoBR}</td>
                    <td class="pe-4">
                      <input type="number" min="0" value="0"
                             class="form-control form-control-sm"
                             style="width: 80px;"
                             data-item-id="${item.id}" />
                    </td>`;
                tbody.appendChild(tr);

                // Atualiza o total a cada mudança de quantidade
                tr.querySelector("input")!.addEventListener("input", recalcularTotal);
            }
        }

        // Exibe o formulário após carregar o cardápio
        formPedido.classList.remove("d-none");

    } catch {
        divCarregando.classList.add("d-none");
        pErro.textContent = "Não foi possível carregar o cardápio. Verifique sua conexão.";
    }

    // Handler do submit do formulário
    formPedido.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        pErro.textContent = "";

        // Coleta apenas os itens com quantidade > 0
        const itensPedido: Array<{ item: number; quantidade: number }> = [];
        divSecoes.querySelectorAll<HTMLInputElement>("input[data-item-id]").forEach(input => {
            const qtd = Math.max(0, Math.floor(Number(input.value) || 0));
            if (qtd > 0) {
                itensPedido.push({ item: Number(input.dataset["itemId"]), quantidade: qtd });
            }
        });

        // Valida: ao menos um item selecionado
        if (itensPedido.length === 0) {
            pErro.textContent = "Selecione pelo menos um item para o pedido.";
            return;
        }

        // Valida: forma de pagamento obrigatória
        if (!selectPagto.value) {
            selectPagto.closest(".campo")?.classList.add("campo-invalido");
            pErro.textContent = "Selecione a forma de pagamento.";
            return;
        }

        btn.disabled    = true;
        btn.textContent = "Enviando…";

        try {
            // Envia POST ao backend para criar o pedido; o cliente é definido pelo request.user
            const res = await fetch(`${BASE_URL}/api/pedidos/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                },
                body: JSON.stringify({
                    forma_pagamento: selectPagto.value,
                    observacoes:     textareaObs.value.trim(),
                    itens:           itensPedido
                })
            });

            if (res.status === 201) {
                // Redireciona para meus pedidos após criação bem-sucedida
                window.location.href = "meus-pedidos.html";
            } else if (res.status === 403) {
                pErro.textContent = "Apenas clientes podem criar pedidos.";
                btn.disabled    = false;
                btn.textContent = "Confirmar Pedido";
            } else {
                const dados = await res.json() as Record<string, unknown>;
                pErro.textContent = extrairErro(dados);
                btn.disabled    = false;
                btn.textContent = "Confirmar Pedido";
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled    = false;
            btn.textContent = "Confirmar Pedido";
        }
    });

    // Remove destaque de erro do select ao mudar a seleção
    selectPagto.addEventListener("change", () => {
        selectPagto.closest(".campo")?.classList.remove("campo-invalido");
    });

    // Extrai o primeiro erro legível de uma resposta de erro do backend
    function extrairErro(dados: Record<string, unknown>): string {
        if (typeof dados["erro"] === "string") return dados["erro"];
        for (const campo in dados) {
            const msgs = dados[campo];
            if (Array.isArray(msgs) && msgs.length > 0) return String(msgs[0]);
        }
        return "Erro ao criar o pedido.";
    }
});
