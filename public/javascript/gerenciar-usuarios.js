"use strict";
// Gerenciamento de usuários — somente gerente: lista todos os usuários e permite alterar o tipo de perfil
// Aguarda autenticacao.ts popular o localStorage antes de checar permissões
function aguardarCabecalhoGerenciarUsuarios() {
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
document.addEventListener("DOMContentLoaded", async () => {
    var _a;
    await aguardarCabecalhoGerenciarUsuarios();
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    // Apenas gerentes podem acessar esta página
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }
    const divCarregando = document.getElementById("carregando");
    const divErro = document.getElementById("mensagem-erro");
    const divTabela = document.getElementById("tabela-container");
    const divVazia = document.getElementById("lista-vazia");
    const corpoTabela = document.getElementById("corpo-tabela");
    function mostrarErroGlobal(msg) {
        divErro.textContent = msg;
        divErro.classList.remove("d-none");
    }
    // Carrega todos os usuários da API
    let usuarios = [];
    try {
        const resposta = await fetch(`${BASE_URL}/api/accounts/usuarios/`, {
            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
        });
        if (!resposta.ok) {
            const dados = await resposta.json().catch(() => ({}));
            mostrarErroGlobal((_a = dados.erro) !== null && _a !== void 0 ? _a : "Não foi possível carregar os usuários.");
            divCarregando.classList.add("d-none");
            return;
        }
        usuarios = await resposta.json();
    }
    catch (_b) {
        mostrarErroGlobal("Erro de conexão. Verifique se o servidor está rodando.");
        divCarregando.classList.add("d-none");
        return;
    }
    divCarregando.classList.add("d-none");
    if (usuarios.length === 0) {
        divVazia.classList.remove("d-none");
        return;
    }
    divTabela.classList.remove("d-none");
    // Monta uma linha da tabela para cada usuário
    usuarios.forEach(u => {
        var _a;
        const tr = document.createElement("tr");
        tr.id = `linha-usuario-${u.id}`;
        const nomeCompleto = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
        const tipoAtual = (_a = u.tipo) !== null && _a !== void 0 ? _a : "cliente";
        tr.innerHTML = `
            <td class="ps-4 fw-semibold">${u.username}</td>
            <td>${nomeCompleto}</td>
            <td class="text-muted small">${u.email || "—"}</td>
            <td class="text-muted small">${u.date_joined}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <select class="form-select form-select-sm select-tipo"
                            data-id="${u.id}"
                            data-original="${tipoAtual}"
                            style="max-width: 130px;">
                        <option value="cliente"   ${tipoAtual === "cliente" ? "selected" : ""}>Cliente</option>
                        <option value="atendente" ${tipoAtual === "atendente" ? "selected" : ""}>Atendente</option>
                        <option value="gerente"   ${tipoAtual === "gerente" ? "selected" : ""}>Gerente</option>
                    </select>
                    <span class="feedback-tipo small d-none"></span>
                </div>
            </td>
            <td class="pe-4">
                <button class="btn btn-sm btn-danger btn-salvar-tipo" data-id="${u.id}">
                    <i class="bi bi-check-lg me-1"></i>Salvar
                </button>
            </td>`;
        corpoTabela.appendChild(tr);
    });
    // Delegação de eventos: captura clique em qualquer botão "Salvar" da tabela
    corpoTabela.addEventListener("click", async (evento) => {
        var _a, _b, _c, _d;
        const alvo = evento.target;
        const btn = alvo.closest(".btn-salvar-tipo");
        if (!btn)
            return;
        const id = btn.dataset.id;
        const linha = document.getElementById(`linha-usuario-${id}`);
        const select = linha.querySelector(".select-tipo");
        const feedbackSpan = linha.querySelector(".feedback-tipo");
        const novoTipo = select.value;
        // Feedback visual durante o envio
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
        feedbackSpan.className = "feedback-tipo small d-none";
        feedbackSpan.textContent = "";
        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/usuarios/${id}/`, {
                method: "PATCH",
                headers: {
                    "Authorization": `${TOKEN_PREFIXO} ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tipo: novoTipo }),
            });
            if (resposta.ok) {
                const dados = await resposta.json();
                // Atualiza o valor original para o tipo recém-salvo
                select.dataset.original = (_a = dados.tipo) !== null && _a !== void 0 ? _a : novoTipo;
                feedbackSpan.textContent = "Salvo!";
                feedbackSpan.className = "feedback-tipo small text-success";
                feedbackSpan.classList.remove("d-none");
                // Remove o feedback após 2 s
                setTimeout(() => { feedbackSpan.classList.add("d-none"); }, 2000);
            }
            else {
                const dados = await resposta.json().catch(() => ({}));
                feedbackSpan.textContent = (_b = dados.erro) !== null && _b !== void 0 ? _b : "Erro ao salvar.";
                feedbackSpan.className = "feedback-tipo small text-danger";
                feedbackSpan.classList.remove("d-none");
                // Reverte o select para o valor anterior
                select.value = (_c = select.dataset.original) !== null && _c !== void 0 ? _c : "cliente";
            }
        }
        catch (_e) {
            feedbackSpan.textContent = "Erro de conexão.";
            feedbackSpan.className = "feedback-tipo small text-danger";
            feedbackSpan.classList.remove("d-none");
            select.value = (_d = select.dataset.original) !== null && _d !== void 0 ? _d : "cliente";
        }
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar`;
    });
});
