"use strict";
// Carrega os dados do usuário autenticado e permite editar nome, sobrenome e e-mail
document.addEventListener("DOMContentLoaded", async () => {
    var _a, _b;
    // Somente usuários autenticados acessam o perfil
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    const divCarregando = document.getElementById("estado-carregando");
    const divConteudo = document.getElementById("conteudo-perfil");
    // Elementos da seção de leitura
    const spanUsername = document.getElementById("info-username");
    const spanNome = document.getElementById("info-nome");
    const spanEmail = document.getElementById("info-email");
    const spanTipo = document.getElementById("info-tipo");
    const spanMembro = document.getElementById("info-membro");
    // Elementos do formulário de edição
    const form = document.getElementById("form-perfil");
    const inputFirstName = document.getElementById("first_name");
    const inputLastName = document.getElementById("last_name");
    const inputEmail = document.getElementById("email");
    const pErro = document.getElementById("mensagem-erro");
    const btn = form.querySelector("button[type='submit']");
    // Remove o destaque de erro ao redigitar em qualquer campo
    [inputFirstName, inputLastName, inputEmail].forEach(input => {
        input.addEventListener("input", () => {
            var _a;
            (_a = input.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
            pErro.textContent = "";
        });
    });
    // Mapeamentos para o badge de tipo de perfil
    const tipoLabel = {
        cliente: "Cliente",
        atendente: "Atendente",
        gerente: "Gerente",
    };
    const tipoBadgeClasse = {
        cliente: "bg-success-subtle text-success-emphasis",
        atendente: "bg-warning-subtle text-warning-emphasis",
        gerente: "bg-primary-subtle text-primary-emphasis",
    };
    // Busca os dados atuais do usuário autenticado
    try {
        const res = await fetch(`${BASE_URL}/api/accounts/me/`, {
            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
        });
        if (!res.ok) {
            // Token inválido ou expirado
            window.location.href = "login.html";
            return;
        }
        const dados = await res.json();
        // Preenche a seção de leitura
        spanUsername.textContent = dados.username;
        spanNome.textContent = [dados.first_name, dados.last_name].filter(Boolean).join(" ") || "—";
        spanEmail.textContent = dados.email || "—";
        spanMembro.textContent = dados.date_joined || "—";
        if (dados.tipo) {
            const cls = (_a = tipoBadgeClasse[dados.tipo]) !== null && _a !== void 0 ? _a : "";
            spanTipo.innerHTML = `<span class="badge fw-normal ${cls}">${(_b = tipoLabel[dados.tipo]) !== null && _b !== void 0 ? _b : dados.tipo}</span>`;
        }
        else {
            spanTipo.textContent = "—";
        }
        // Preenche o formulário com os valores atuais para edição
        inputFirstName.value = dados.first_name;
        inputLastName.value = dados.last_name;
        inputEmail.value = dados.email;
        divCarregando.classList.add("d-none");
        divConteudo.classList.remove("d-none");
    }
    catch (_c) {
        // Falha de rede — redireciona para login como medida segura
        window.location.href = "login.html";
        return;
    }
    // Envia as alterações dos dados pessoais ao backend
    form.addEventListener("submit", async (evento) => {
        var _a, _b, _c, _d;
        evento.preventDefault();
        pErro.textContent = "";
        const firstName = inputFirstName.value.trim();
        const lastName = inputLastName.value.trim();
        const email = inputEmail.value.trim();
        // Validação local antes de ir ao servidor
        let invalido = false;
        if (!firstName) {
            (_a = inputFirstName.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            invalido = true;
        }
        if (!lastName) {
            (_b = inputLastName.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (!email) {
            (_c = inputEmail.closest(".campo")) === null || _c === void 0 ? void 0 : _c.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            pErro.textContent = "Preencha todos os campos obrigatórios.";
            return;
        }
        // Loading state — impede envio duplicado durante a requisição
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando…';
        try {
            // Envia PATCH com os campos editáveis
            const res = await fetch(`${BASE_URL}/api/accounts/me/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`,
                },
                body: JSON.stringify({ first_name: firstName, last_name: lastName, email }),
            });
            const dados = await res.json();
            if (res.ok) {
                // Atualiza a seção de leitura com os novos valores
                spanNome.textContent = [firstName, lastName].filter(Boolean).join(" ");
                spanEmail.textContent = email;
                mostrarToast("Dados atualizados com sucesso!");
            }
            else {
                pErro.textContent = (_d = dados["erro"]) !== null && _d !== void 0 ? _d : "Erro ao salvar as alterações.";
            }
        }
        catch (_e) {
            pErro.textContent = "Não foi possível conectar ao servidor.";
        }
        finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar Alterações';
        }
    });
});
