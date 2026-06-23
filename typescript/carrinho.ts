// Exibe os itens do carrinho, permite adicionar observações e forma de pagamento,
// e envia o pedido ao backend ao confirmar (acesso restrito a clientes)

// Estrutura de um item persistido no localStorage["carrinho"]
interface ItemCarrinho {
    id: number;
    nome: string;
    preco: string;
    quantidade: number;
}

document.addEventListener("DOMContentLoaded", () => {

    // Somente clientes autenticados podem acessar o carrinho e criar pedidos
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "cliente") {
        window.location.href = "index.html";
        return;
    }

    const divVazio     = document.getElementById("estado-vazio")    as HTMLDivElement;
    const divConteudo  = document.getElementById("conteudo-carrinho") as HTMLDivElement;
    const tbody        = document.getElementById("tbody-carrinho")  as HTMLTableSectionElement;
    const totalEl      = document.getElementById("total-carrinho")  as HTMLSpanElement;
    const selectPagto  = document.getElementById("forma-pagamento") as HTMLSelectElement;
    const textareaObs  = document.getElementById("observacoes")     as HTMLTextAreaElement;
    const pErro        = document.getElementById("mensagem-erro")   as HTMLParagraphElement;
    const btnConfirmar = document.getElementById("btn-confirmar")   as HTMLButtonElement;

    // Lê o carrinho do localStorage
    let carrinho: ItemCarrinho[] = [];
    try {
        carrinho = JSON.parse(localStorage.getItem("carrinho") ?? "[]") as ItemCarrinho[];
    } catch {
        carrinho = [];
    }

    // Exibe o estado vazio quando não há itens no carrinho
    if (carrinho.length === 0) {
        divVazio.classList.remove("d-none");
        return;
    }

    // Renderiza as linhas da tabela e calcula o total
    let total = 0;
    for (const item of carrinho) {
        const subtotal   = item.quantidade * parseFloat(item.preco);
        total           += subtotal;

        const precoBR    = parseFloat(item.preco).toFixed(2).replace(".", ",");
        const subtotalBR = subtotal.toFixed(2).replace(".", ",");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="ps-4 fw-semibold">${item.nome}</td>
            <td class="text-center">${item.quantidade}</td>
            <td class="text-end text-muted small">R$ ${precoBR}</td>
            <td class="text-end fw-semibold pe-4">R$ ${subtotalBR}</td>`;
        tbody.appendChild(tr);
    }

    // Exibe o total calculado a partir dos itens do carrinho
    totalEl.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;

    // Mostra o formulário de confirmação
    divConteudo.classList.remove("d-none");

    // Remove destaque de erro no select ao mudar a seleção
    selectPagto.addEventListener("change", () => {
        selectPagto.closest(".campo")?.classList.remove("campo-invalido");
        pErro.textContent = "";
    });

    // Handler de confirmação do pedido
    btnConfirmar.addEventListener("click", async () => {
        pErro.textContent = "";

        // Valida: forma de pagamento obrigatória
        if (!selectPagto.value) {
            selectPagto.closest(".campo")?.classList.add("campo-invalido");
            pErro.textContent = "Selecione a forma de pagamento.";
            return;
        }

        // Monta a lista de itens no formato esperado pelo backend
        const itensPedido = carrinho.map(i => ({ item: i.id, quantidade: i.quantidade }));

        // Loading state — desabilita o botão durante a requisição para evitar duplo envio
        btnConfirmar.disabled   = true;
        btnConfirmar.innerHTML  = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando…';

        try {
            // Envia POST ao backend para criar o pedido; o cliente é identificado pelo token
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
                // Limpa o carrinho do localStorage após pedido confirmado com sucesso
                localStorage.removeItem("carrinho");
                window.location.href = "meus-pedidos.html";
            } else if (res.status === 403) {
                pErro.textContent       = "Apenas clientes podem criar pedidos.";
                btnConfirmar.disabled   = false;
                btnConfirmar.innerHTML  = '<i class="bi bi-check-circle me-1"></i>Confirmar Pedido';
            } else {
                const dados = await res.json() as Record<string, unknown>;
                pErro.textContent       = extrairErro(dados);
                btnConfirmar.disabled   = false;
                btnConfirmar.innerHTML  = '<i class="bi bi-check-circle me-1"></i>Confirmar Pedido';
            }
        } catch {
            pErro.textContent       = "Não foi possível conectar ao servidor.";
            btnConfirmar.disabled   = false;
            btnConfirmar.innerHTML  = '<i class="bi bi-check-circle me-1"></i>Confirmar Pedido';
        }
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
