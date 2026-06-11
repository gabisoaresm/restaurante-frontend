"use strict";
// Solicita o envio de token de redefinição de senha para o e-mail informado
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-esqueci-senha");
    const mensagemErro = document.getElementById("mensagem-erro");
    const mensagemSucesso = document.getElementById("mensagem-sucesso");
    const btn = form.querySelector("button[type='submit']");
    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            var _a;
            (_a = input.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        });
    });
    form.addEventListener("submit", async (evento) => {
        var _a, _b, _c;
        evento.preventDefault();
        mensagemErro.textContent = "";
        mensagemSucesso.textContent = "";
        const campoEmail = document.getElementById("email");
        const email = campoEmail.value.trim();
        // Validação local: destaca o campo de e-mail se vazio
        if (!email) {
            (_a = campoEmail.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            mensagemErro.textContent = "Informe seu e-mail.";
            return;
        }
        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled = true;
        btn.textContent = "Enviando…";
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
                btn.textContent = "Redirecionando…";
                setTimeout(() => {
                    window.location.href = "redefinir-senha.html";
                }, 2000);
            }
            else {
                const dados = await resposta.json();
                // O django-rest-passwordreset pode retornar o erro no campo "email" ou "detail"
                const msg = (_c = (_b = (dados.email && dados.email[0])) !== null && _b !== void 0 ? _b : dados.detail) !== null && _c !== void 0 ? _c : "Erro ao solicitar redefinição.";
                mensagemErro.textContent = msg;
                btn.disabled = false;
                btn.textContent = "Enviar token";
            }
        }
        catch (_d) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled = false;
            btn.textContent = "Enviar token";
        }
    });
});
