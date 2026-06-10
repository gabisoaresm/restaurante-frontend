"use strict";
// Solicita o envio de token de redefinição de senha para o e-mail informado
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-esqueci-senha");
    const mensagemErro = document.getElementById("mensagem-erro");
    const mensagemSucesso = document.getElementById("mensagem-sucesso");
    form.addEventListener("submit", async (evento) => {
        var _a, _b;
        evento.preventDefault();
        mensagemErro.textContent = "";
        mensagemSucesso.textContent = "";
        const email = document.getElementById("email").value.trim();
        try {
            // O backend envia o token de redefinição para o e-mail via django-rest-passwordreset
            const resposta = await fetch(`${BASE_URL}/api/accounts/password_reset/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (resposta.ok) {
                // Informa ao usuário e redireciona para a página de confirmação após 2 segundos
                mensagemSucesso.textContent =
                    "Se o e-mail estiver cadastrado, você receberá as instruções em instantes. Redirecionando…";
                setTimeout(() => {
                    window.location.href = "redefinir-senha.html";
                }, 2000);
            }
            else {
                const dados = await resposta.json();
                // O django-rest-passwordreset pode retornar o erro no campo "email" ou "detail"
                const msg = (_b = (_a = (dados.email && dados.email[0])) !== null && _a !== void 0 ? _a : dados.detail) !== null && _b !== void 0 ? _b : "Erro ao solicitar redefinição.";
                mensagemErro.textContent = msg;
            }
        }
        catch (_c) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
    });
});
