"use strict";
// Gerenciamento de usuários — somente gerente: lista todos os usuários e permite alterar o tipo de perfil
// Monta o badge visual do perfil atual (referência: Trab1 gerenciarUsuarios.html)
function htmlBadgePerfilUsuarios(tipo) {
    var _a, _b;
    const rotulos = {
        cliente: "Cliente",
        atendente: "Atendente",
        gerente: "Gerente",
    };
    const classes = {
        cliente: "bg-secondary-subtle text-secondary-emphasis",
        atendente: "bg-secondary-subtle text-secondary-emphasis",
        gerente: "bg-secondary-subtle text-secondary-emphasis",
    };
    const rotulo = (_a = rotulos[tipo]) !== null && _a !== void 0 ? _a : "—";
    const classe = (_b = classes[tipo]) !== null && _b !== void 0 ? _b : "bg-secondary-subtle text-secondary-emphasis";
    return `<span class="badge badge-perfil-atual ${classe} fw-normal">${rotulo}</span>`;
}
document.addEventListener("DOMContentLoaded", async () => {
    var _a;
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    let tipo = localStorage.getItem("tipo");
    // Se o tipo ainda não está em cache, busca via /me/ antes de checar permissões
    if (!tipo) {
        try {
            const res = await fetch(`${BASE_URL}/api/accounts/me/`, {
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
            if (res.ok) {
                const dados = await res.json();
                tipo = dados.tipo;
                localStorage.setItem("tipo", tipo);
            }
        }
        catch (_b) {
            // Falha de rede — nega o acesso por segurança
        }
    }
    if (tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }
    const divCarregando = document.getElementById("carregando");
    const pErro = document.getElementById("mensagem-erro");
    const divConteudo = document.getElementById("conteudo-principal");
    const divVazia = document.getElementById("lista-vazia");
    const corpoTabela = document.getElementById("corpo-tabela");
    const spanContador = document.getElementById("contador-usuarios");
    function mostrarErroGlobal(msg) {
        pErro.textContent = msg;
    }
    function atualizarContador(total) {
        spanContador.textContent = total === 1
            ? "1 usuário cadastrado"
            : `${total} usuários cadastrados`;
    }
    function verificarListaVazia() {
        if (corpoTabela.children.length > 0)
            return;
        divConteudo.classList.add("d-none");
        divVazia.classList.remove("d-none");
    }
    // Atualiza o badge de perfil exibido abaixo do username após salvar
    function atualizarBadgePerfil(linha, tipo) {
        const badge = linha.querySelector(".badge-perfil-atual");
        if (badge) {
            badge.outerHTML = htmlBadgePerfilUsuarios(tipo);
        }
    }
    let modalExcluirConfigurado = false;
    let usuarioExclusaoPendente = null;
    // HTML do modal de confirmação — Bootstrap CSS only (sem bootstrap.bundle.js)
    function htmlModalExcluirUsuario() {
        return `
        <div class="modal fade" id="modal-excluir-usuario" tabindex="-1"
             aria-labelledby="modal-excluir-usuario-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-sm border-0">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-semibold" id="modal-excluir-usuario-titulo">Excluir usuário</h5>
                        <button type="button" class="btn-close" id="btn-fechar-modal-excluir-usuario"
                                aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body pt-3">
                        <p class="text-muted text-center mb-0">
                            Deseja excluir o usuário
                            <strong id="modal-excluir-username"></strong>?
                            Esta ação não pode ser desfeita.
                        </p>
                    </div>
                    <div class="modal-footer border-0 pt-0 gap-2">
                        <button type="button" class="btn btn-outline-secondary" id="btn-cancelar-excluir-usuario">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="btn-confirmar-excluir-usuario">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop fade" id="backdrop-modal-excluir-usuario"></div>`;
    }
    function restaurarBotaoConfirmarExcluir() {
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-usuario");
        if (!btnConfirmar)
            return;
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = `Excluir`;
    }
    // Fecha o modal de confirmação de exclusão
    function fecharModalExcluirUsuario() {
        const modal = document.getElementById("modal-excluir-usuario");
        const backdrop = document.getElementById("backdrop-modal-excluir-usuario");
        if (!modal || !backdrop)
            return;
        modal.classList.remove("show");
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        modal.removeAttribute("aria-modal");
        backdrop.classList.remove("show");
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
        restaurarBotaoConfirmarExcluir();
        usuarioExclusaoPendente = null;
    }
    // Exibe o modal de confirmação antes de excluir um usuário
    function abrirModalExcluirUsuario(id, username, btn) {
        if (!document.getElementById("modal-excluir-usuario")) {
            document.body.insertAdjacentHTML("beforeend", htmlModalExcluirUsuario());
            configurarEventosModalExcluir();
        }
        usuarioExclusaoPendente = { id, username, btn };
        const spanUsername = document.getElementById("modal-excluir-username");
        if (spanUsername)
            spanUsername.textContent = username;
        restaurarBotaoConfirmarExcluir();
        const modal = document.getElementById("modal-excluir-usuario");
        const backdrop = document.getElementById("backdrop-modal-excluir-usuario");
        if (!modal || !backdrop)
            return;
        modal.classList.add("show");
        modal.style.display = "block";
        modal.setAttribute("aria-modal", "true");
        modal.removeAttribute("aria-hidden");
        backdrop.classList.add("show");
        document.body.classList.add("modal-open");
        document.body.style.overflow = "hidden";
    }
    // Remove o usuário selecionado via DELETE na API
    async function executarExclusaoUsuario() {
        var _a, _b;
        if (!usuarioExclusaoPendente)
            return;
        const { id, btn } = usuarioExclusaoPendente;
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-usuario");
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Excluindo…`;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/usuarios/${id}/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` },
            });
            if (resposta.status === 204) {
                fecharModalExcluirUsuario();
                (_a = document.getElementById(`linha-usuario-${id}`)) === null || _a === void 0 ? void 0 : _a.remove();
                atualizarContador(corpoTabela.children.length);
                verificarListaVazia();
                return;
            }
            const dados = await resposta.json().catch(() => ({}));
            mostrarErroGlobal((_b = dados.erro) !== null && _b !== void 0 ? _b : "Não foi possível excluir o usuário.");
            fecharModalExcluirUsuario();
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-trash"></i>`;
        }
        catch (_c) {
            mostrarErroGlobal("Erro de conexão. Verifique se o servidor está rodando.");
            fecharModalExcluirUsuario();
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-trash"></i>`;
        }
    }
    // Vincula os botões do modal de exclusão (executado uma única vez)
    function configurarEventosModalExcluir() {
        var _a, _b, _c, _d;
        if (modalExcluirConfigurado)
            return;
        modalExcluirConfigurado = true;
        (_a = document.getElementById("btn-cancelar-excluir-usuario")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", fecharModalExcluirUsuario);
        (_b = document.getElementById("btn-fechar-modal-excluir-usuario")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", fecharModalExcluirUsuario);
        (_c = document.getElementById("backdrop-modal-excluir-usuario")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", fecharModalExcluirUsuario);
        (_d = document.getElementById("btn-confirmar-excluir-usuario")) === null || _d === void 0 ? void 0 : _d.addEventListener("click", () => {
            void executarExclusaoUsuario();
        });
        // Fecha o modal ao pressionar Escape
        document.addEventListener("keydown", (evento) => {
            if (evento.key !== "Escape")
                return;
            const modal = document.getElementById("modal-excluir-usuario");
            if (modal === null || modal === void 0 ? void 0 : modal.classList.contains("show")) {
                fecharModalExcluirUsuario();
            }
        });
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
    catch (_c) {
        mostrarErroGlobal("Erro de conexão. Verifique se o servidor está rodando.");
        divCarregando.classList.add("d-none");
        return;
    }
    divCarregando.classList.add("d-none");
    if (usuarios.length === 0) {
        divVazia.classList.remove("d-none");
        return;
    }
    divConteudo.classList.remove("d-none");
    atualizarContador(usuarios.length);
    // Monta uma linha da tabela para cada usuário
    usuarios.forEach(u => {
        var _a;
        const tr = document.createElement("tr");
        tr.id = `linha-usuario-${u.id}`;
        const nomeCompleto = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
        const tipoAtual = (_a = u.tipo) !== null && _a !== void 0 ? _a : "cliente";
        const badgeHtml = htmlBadgePerfilUsuarios(tipoAtual);
        tr.innerHTML = `
            <td class="ps-4">
                <div class="fw-semibold">${u.username}</div>
                <div class="mt-1">${badgeHtml}</div>
            </td>
            <td>${nomeCompleto}</td>
            <td class="text-muted small">${u.email || "—"}</td>
            <td class="text-muted small text-nowrap">${u.date_joined}</td>
            <td>
                <div class="campo mb-0">
                    <select class="form-select form-select-sm select-tipo"
                            data-id="${u.id}"
                            data-original="${tipoAtual}"
                            aria-label="Novo perfil de ${u.username}">
                        <option value="cliente"   ${tipoAtual === "cliente" ? "selected" : ""}>Cliente</option>
                        <option value="atendente" ${tipoAtual === "atendente" ? "selected" : ""}>Atendente</option>
                        <option value="gerente"   ${tipoAtual === "gerente" ? "selected" : ""}>Gerente</option>
                    </select>
                    <span class="feedback-tipo small d-none mt-1 d-block"></span>
                </div>
            </td>
            <td class="pe-4 text-end">
                <div class="d-flex gap-1 justify-content-end flex-nowrap">
                    <button type="button" class="btn btn-sm btn-danger btn-salvar-tipo"
                            data-id="${u.id}" disabled title="Salvar perfil">
                        <i class="bi bi-check-lg me-1"></i>Salvar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-excluir-usuario"
                            data-id="${u.id}" data-username="${u.username}" title="Excluir usuário">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>`;
        corpoTabela.appendChild(tr);
        const select = tr.querySelector(".select-tipo");
        const btnSalvar = tr.querySelector(".btn-salvar-tipo");
        // Habilita Salvar somente quando o perfil selecionado difere do atual
        select.addEventListener("change", () => {
            var _a;
            btnSalvar.disabled = select.value === select.dataset.original;
            (_a = tr.querySelector(".feedback-tipo")) === null || _a === void 0 ? void 0 : _a.classList.add("d-none");
        });
    });
    // Delegação de eventos: captura cliques nos botões "Salvar" e "Excluir" da tabela
    corpoTabela.addEventListener("click", async (evento) => {
        var _a, _b, _c, _d;
        const alvo = evento.target;
        // Botão excluir usuário — abre modal de confirmação
        const btnExcluir = alvo.closest(".btn-excluir-usuario");
        if (btnExcluir) {
            abrirModalExcluirUsuario(btnExcluir.dataset.id, btnExcluir.dataset.username, btnExcluir);
            return;
        }
        const btn = alvo.closest(".btn-salvar-tipo");
        if (!btn || btn.disabled)
            return;
        const id = btn.dataset.id;
        const linha = document.getElementById(`linha-usuario-${id}`);
        const select = linha.querySelector(".select-tipo");
        const feedbackSpan = linha.querySelector(".feedback-tipo");
        const novoTipo = select.value;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
        feedbackSpan.className = "feedback-tipo small d-none mt-1 d-block";
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
                const tipoSalvo = (_a = dados.tipo) !== null && _a !== void 0 ? _a : novoTipo;
                select.dataset.original = tipoSalvo;
                atualizarBadgePerfil(linha, tipoSalvo);
                feedbackSpan.textContent = "Perfil atualizado!";
                feedbackSpan.className = "feedback-tipo small sucesso mt-1 d-block";
                feedbackSpan.classList.remove("d-none");
                setTimeout(() => { feedbackSpan.classList.add("d-none"); }, 2500);
            }
            else {
                const dados = await resposta.json().catch(() => ({}));
                feedbackSpan.textContent = (_b = dados.erro) !== null && _b !== void 0 ? _b : "Erro ao salvar.";
                feedbackSpan.className = "feedback-tipo small erro mt-1 d-block";
                feedbackSpan.classList.remove("d-none");
                select.value = (_c = select.dataset.original) !== null && _c !== void 0 ? _c : "cliente";
            }
        }
        catch (_e) {
            feedbackSpan.textContent = "Erro de conexão.";
            feedbackSpan.className = "feedback-tipo small erro mt-1 d-block";
            feedbackSpan.classList.remove("d-none");
            select.value = (_d = select.dataset.original) !== null && _d !== void 0 ? _d : "cliente";
        }
        btn.disabled = select.value === select.dataset.original;
        btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar`;
    });
});
