"use strict";
// Lida com o formulário de registro de novo cliente
document.addEventListener("DOMContentLoaded", () => {
    // Usuário já logado não precisa se registrar
    if (localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }
    const form = document.getElementById("form-registro");
    const mensagemErro = document.getElementById("mensagem-erro");
    form.addEventListener("submit", async (evento) => {
        var _a;
        evento.preventDefault();
        mensagemErro.textContent = "";
        // Coleta todos os campos — todos são obrigatórios
        const username = document.getElementById("username").value.trim();
        const firstName = document.getElementById("first_name").value.trim();
        const lastName = document.getElementById("last_name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("password_confirm").value;
        // Validação local: garante que nenhum campo foi deixado em branco
        if (!username || !firstName || !lastName || !email || !password || !passwordConfirm) {
            mensagemErro.textContent = "Preencha todos os campos obrigatórios.";
            return;
        }
        // Validação local: as senhas devem coincidir antes de enviar ao servidor
        if (password !== passwordConfirm) {
            mensagemErro.textContent = "As senhas não coincidem.";
            return;
        }
        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/registro/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    password,
                    email,
                    first_name: firstName,
                    last_name: lastName,
                }),
            });
            if (resposta.status === 201) {
                // Cadastro realizado — redireciona para o login com aviso de sucesso
                window.location.href = "login.html?cadastro=ok";
            }
            else {
                const dados = await resposta.json();
                mensagemErro.textContent = (_a = dados.erro) !== null && _a !== void 0 ? _a : "Erro ao registrar. Tente novamente.";
            }
        }
        catch (_b) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor. Verifique sua conexão.";
        }
    });
});
