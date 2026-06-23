"use strict";
// Formulário para salvar um novo cartão de pagamento (acesso restrito a clientes)
document.addEventListener("DOMContentLoaded", () => {
    // Somente clientes autenticados podem cadastrar cartões
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    if (!token || tipo !== "cliente") {
        window.location.href = "index.html";
        return;
    }
    const form = document.getElementById("form-cartao");
    const inputApelido = document.getElementById("apelido");
    const inputTitular = document.getElementById("nome_titular");
    const inputNumero = document.getElementById("numero");
    const selectBand = document.getElementById("bandeira");
    const selectTipo = document.getElementById("tipo");
    const inputVal = document.getElementById("validade");
    const inputCvv = document.getElementById("cvv");
    const pErro = document.getElementById("mensagem-erro");
    const pSucesso = document.getElementById("mensagem-sucesso");
    const btnSalvar = document.getElementById("btn-salvar");
    // Remove destaque de erro ao redigitar nos campos com .campo wrapper
    form.querySelectorAll(".campo input, .campo select").forEach(el => {
        el.addEventListener("input", () => {
            var _a;
            (_a = el.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
            pErro.textContent = "";
        });
    });
    // Formata o número do cartão inserindo espaços a cada 4 dígitos
    inputNumero.addEventListener("input", () => {
        const digits = inputNumero.value.replace(/\D/g, "").slice(0, 16);
        inputNumero.value = digits.replace(/(.{4})/g, "$1 ").trim();
    });
    // Formata a validade inserindo "/" após os dois primeiros dígitos
    inputVal.addEventListener("input", () => {
        const digits = inputVal.value.replace(/\D/g, "").slice(0, 6);
        inputVal.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    });
    // Permite apenas dígitos no CVV
    inputCvv.addEventListener("input", () => {
        inputCvv.value = inputCvv.value.replace(/\D/g, "").slice(0, 4);
    });
    form.addEventListener("submit", async (e) => {
        var _a, _b, _c, _d;
        e.preventDefault();
        pErro.textContent = "";
        pSucesso.textContent = "";
        // Validação local — destaca campos obrigatórios não preenchidos
        let invalido = false;
        const obrigatorios = [inputApelido, inputTitular, inputNumero, inputVal, inputCvv];
        for (const campo of obrigatorios) {
            if (!campo.value.trim()) {
                (_a = campo.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
                invalido = true;
            }
        }
        if (!selectBand.value) {
            (_b = selectBand.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (!selectTipo.value) {
            (_c = selectTipo.closest(".campo")) === null || _c === void 0 ? void 0 : _c.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            pErro.textContent = "Preencha todos os campos obrigatórios.";
            return;
        }
        // Valida se a data de validade não está no passado (MM/YYYY)
        const partesValidade = inputVal.value.trim().split("/");
        if (partesValidade.length === 2) {
            const mesCartao = parseInt(partesValidade[0], 10);
            const anoCartao = parseInt(partesValidade[1], 10);
            const hoje = new Date();
            const anoHoje = hoje.getFullYear();
            const mesHoje = hoje.getMonth() + 1; // getMonth() retorna 0–11
            if (anoCartao < anoHoje || (anoCartao === anoHoje && mesCartao < mesHoje)) {
                (_d = inputVal.closest(".campo")) === null || _d === void 0 ? void 0 : _d.classList.add("campo-invalido");
                pErro.textContent = "A data de validade do cartão já expirou.";
                return;
            }
        }
        // Loading state — desabilita o botão durante o envio para evitar duplo clique
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando…';
        try {
            // Envia POST ao backend para criar o cartão salvo do cliente
            const res = await fetch(`${BASE_URL}/api/accounts/cartoes/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                },
                body: JSON.stringify({
                    apelido: inputApelido.value.trim(),
                    nome_titular: inputTitular.value.trim(),
                    numero: inputNumero.value.replace(/\s/g, ""),
                    bandeira: selectBand.value,
                    tipo: selectTipo.value,
                    validade: inputVal.value.trim(),
                    cvv: inputCvv.value.trim()
                })
            });
            if (res.status === 201) {
                // Redireciona para a lista de cartões após cadastro bem-sucedido
                window.location.href = "meus-cartoes.html";
            }
            else {
                const dados = await res.json();
                pErro.textContent = extrairErro(dados);
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar Cartão';
            }
        }
        catch (_e) {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar Cartão';
        }
    });
    // Extrai o primeiro erro legível de uma resposta do backend
    function extrairErro(dados) {
        if (typeof dados["erro"] === "string")
            return dados["erro"];
        for (const campo in dados) {
            const msgs = dados[campo];
            if (Array.isArray(msgs) && msgs.length > 0)
                return `${campo}: ${msgs[0]}`;
        }
        return "Erro ao salvar o cartão.";
    }
});
