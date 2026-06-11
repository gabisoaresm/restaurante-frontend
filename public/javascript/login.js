"use strict";
// Lida com o formulário de login: envia as credenciais e armazena o token recebido
document.addEventListener("DOMContentLoaded", () => {
    // Se já há token salvo, redireciona direto para a home sem exibir o formulário
    if (localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }
    // Exibe mensagem de sucesso quando o usuário chega vindo de registro ou redefinição de senha
    const params = new URLSearchParams(window.location.search);
    const msgSucesso = document.getElementById("mensagem-sucesso");
    if (msgSucesso) {
        if (params.get("cadastro") === "ok") {
            msgSucesso.textContent = "Cadastro realizado com sucesso! Faça login para continuar.";
        }
        else if (params.get("senha_redefinida") === "ok") {
            msgSucesso.textContent = "Senha redefinida com sucesso! Faça login com a nova senha.";
        }
    }
    const form = document.getElementById("form-login");
    const msgErro = document.getElementById("mensagem-erro");
    if (!form)
        return;
    const btn = form.querySelector("button[type='submit']");
    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            var _a;
            (_a = input.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        });
    });
    form.addEventListener("submit", async (evento) => {
        var _a, _b;
        evento.preventDefault();
        if (msgErro)
            msgErro.textContent = "";
        const campoUsername = document.getElementById("username");
        const campoPassword = document.getElementById("password");
        const username = campoUsername.value.trim();
        const password = campoPassword.value;
        // Validação local: destaca visualmente os campos deixados em branco
        let invalido = false;
        if (!username) {
            (_a = campoUsername.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            invalido = true;
        }
        if (!password) {
            (_b = campoPassword.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            if (msgErro)
                msgErro.textContent = "Preencha todos os campos.";
            return;
        }
        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled = true;
        btn.textContent = "Entrando…";
        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/token-auth/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            if (resposta.ok) {
                const dados = await resposta.json();
                // Armazena o token e dados básicos para uso nas demais páginas
                localStorage.setItem("token", dados.token);
                localStorage.setItem("user_id", String(dados.user_id));
                localStorage.setItem("username", dados.username);
                // Redireciona para a home após login bem-sucedido
                window.location.href = "index.html";
            }
            else if (resposta.status === 401) {
                if (msgErro)
                    msgErro.textContent = "Usuário ou senha incorretos.";
            }
            else {
                if (msgErro)
                    msgErro.textContent = "Erro ao fazer login. Tente novamente.";
            }
        }
        catch (_c) {
            if (msgErro)
                msgErro.textContent = "Não foi possível conectar ao servidor.";
        }
        finally {
            btn.disabled = false;
            btn.textContent = "Entrar";
        }
    });
});
