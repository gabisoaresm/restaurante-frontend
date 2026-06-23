"use strict";
// Exibe os itens do carrinho, carrega os cartões do cliente e envia o pedido ao confirmar
// (acesso restrito a clientes autenticados)
document.addEventListener("DOMContentLoaded", async () => {
    var _a, _b;
    // Somente clientes autenticados podem acessar o carrinho e criar pedidos
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    if (!token || tipo !== "cliente") {
        window.location.href = "index.html";
        return;
    }
    const divVazio = document.getElementById("estado-vazio");
    const divConteudo = document.getElementById("conteudo-carrinho");
    const tbody = document.getElementById("tbody-carrinho");
    const totalEl = document.getElementById("total-carrinho");
    const textareaObs = document.getElementById("observacoes");
    const divPgtoCarregando = document.getElementById("pagamento-carregando");
    const divPgtoSemCartao = document.getElementById("pagamento-sem-cartao");
    const divPgtoForm = document.getElementById("pagamento-form");
    const selectCartao = document.getElementById("cartao-select");
    const inputCvv = document.getElementById("cvv-input");
    // Lê o carrinho e as observações do localStorage
    let carrinho = [];
    try {
        carrinho = JSON.parse((_a = localStorage.getItem("carrinho")) !== null && _a !== void 0 ? _a : "[]");
    }
    catch (_c) {
        carrinho = [];
    }
    textareaObs.value = (_b = localStorage.getItem("carrinho_observacoes")) !== null && _b !== void 0 ? _b : "";
    // Persiste as observações no localStorage a cada alteração
    textareaObs.addEventListener("input", () => {
        localStorage.setItem("carrinho_observacoes", textareaObs.value);
    });
    // Exibe o estado vazio quando não há itens no carrinho
    if (carrinho.length === 0) {
        divVazio.classList.remove("d-none");
        return;
    }
    // Renderiza as linhas da tabela de itens e calcula o total
    let total = 0;
    for (const item of carrinho) {
        const subtotal = item.quantidade * parseFloat(item.preco);
        total += subtotal;
        const precoBR = parseFloat(item.preco).toFixed(2).replace(".", ",");
        const subtotalBR = subtotal.toFixed(2).replace(".", ",");
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="ps-4 fw-semibold">${item.nome}</td>
            <td class="text-center">${item.quantidade}</td>
            <td class="text-end text-muted small">R$ ${precoBR}</td>
            <td class="text-end fw-semibold pe-4">R$ ${subtotalBR}</td>`;
        tbody.appendChild(tr);
    }
    totalEl.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
    // Mostra o formulário de confirmação
    divConteudo.classList.remove("d-none");
    // Busca os cartões salvos do cliente para preencher o seletor de pagamento
    try {
        const resCartoes = await fetch(`${BASE_URL}/api/accounts/cartoes/`, {
            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
        });
        divPgtoCarregando.classList.add("d-none");
        if (!resCartoes.ok) {
            divPgtoSemCartao.classList.remove("d-none");
            return;
        }
        const cartoes = await resCartoes.json();
        if (cartoes.length === 0) {
            // Sem cartões: pede ao cliente que cadastre um antes de prosseguir
            divPgtoSemCartao.classList.remove("d-none");
            return;
        }
        // Preenche o select com os cartões disponíveis
        for (const cartao of cartoes) {
            const opt = document.createElement("option");
            opt.value = String(cartao.id);
            opt.textContent = `${cartao.apelido} — ${cartao.numero_mascarado} (${cartao.tipo === "credito" ? "Crédito" : "Débito"})`;
            selectCartao.appendChild(opt);
        }
        divPgtoForm.classList.remove("d-none");
    }
    catch (_d) {
        divPgtoCarregando.classList.add("d-none");
        divPgtoSemCartao.classList.remove("d-none");
        return;
    }
    const pErro = document.getElementById("mensagem-erro");
    const btnConfirmar = document.getElementById("btn-confirmar");
    // Remove destaque de erro ao interagir com os campos de pagamento
    selectCartao.addEventListener("change", () => {
        var _a;
        (_a = selectCartao.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        pErro.textContent = "";
    });
    inputCvv.addEventListener("input", () => {
        var _a;
        inputCvv.value = inputCvv.value.replace(/\D/g, "").slice(0, 4);
        (_a = inputCvv.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        pErro.textContent = "";
    });
    btnConfirmar.addEventListener("click", async () => {
        var _a, _b;
        pErro.textContent = "";
        // Valida a seleção de cartão e o CVV antes de enviar
        let invalido = false;
        if (!selectCartao.value) {
            (_a = selectCartao.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            invalido = true;
        }
        if (!inputCvv.value.trim()) {
            (_b = inputCvv.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            pErro.textContent = "Selecione um cartão e informe o CVV.";
            return;
        }
        // Monta a lista de itens no formato esperado pelo backend
        const itensPedido = carrinho.map(i => ({ item: i.id, quantidade: i.quantidade }));
        // Loading state — desabilita o botão durante a requisição para evitar duplo envio
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando…';
        try {
            // Envia POST ao backend para criar o pedido com o cartão e CVV selecionados
            const res = await fetch(`${BASE_URL}/api/pedidos/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                },
                body: JSON.stringify({
                    cartao_id: Number(selectCartao.value),
                    cvv: inputCvv.value.trim(),
                    observacoes: textareaObs.value.trim(),
                    itens: itensPedido
                })
            });
            if (res.status === 201) {
                // Limpa o carrinho e as observações do localStorage após pedido confirmado
                localStorage.removeItem("carrinho");
                localStorage.removeItem("carrinho_observacoes");
                window.location.href = "meus-pedidos.html";
            }
            else if (res.status === 403) {
                pErro.textContent = "Apenas clientes podem criar pedidos.";
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="bi bi-check-circle me-1"></i>Confirmar Pedido';
            }
            else {
                const dados = await res.json();
                pErro.textContent = extrairErro(dados);
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="bi bi-check-circle me-1"></i>Confirmar Pedido';
            }
        }
        catch (_c) {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="bi bi-check-circle me-1"></i>Confirmar Pedido';
        }
    });
    // Extrai o primeiro erro legível de uma resposta de erro do backend
    function extrairErro(dados) {
        if (typeof dados["erro"] === "string")
            return dados["erro"];
        for (const campo in dados) {
            const msgs = dados[campo];
            if (Array.isArray(msgs) && msgs.length > 0)
                return String(msgs[0]);
        }
        return "Erro ao criar o pedido.";
    }
});
