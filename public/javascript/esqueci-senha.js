"use strict";
// Solicita o envio de token de redefinição de senha para o e-mail informado
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-esqueci-senha");
    const mensagemErro = document.getElementById("mensagem-erro");
    const btn = form.querySelector("button[type='submit']");
    const campoEmail = document.getElementById("email");
    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            var _a;
            (_a = input.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        });
    });
    const erroEmail = document.getElementById("erro-email");
    // Valida o formato do e-mail ao sair do campo (antes mesmo de tentar enviar)
    const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    campoEmail.addEventListener("blur", () => {
        var _a;
        const val = campoEmail.value.trim();
        if (val && !REGEX_EMAIL.test(val)) {
            (_a = campoEmail.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            erroEmail.textContent = "Informe um e-mail válido.";
            erroEmail.classList.remove("d-none");
        }
    });
    // Esconde o erro inline ao redigitar o e-mail
    campoEmail.addEventListener("input", () => {
        erroEmail.textContent = "";
        erroEmail.classList.add("d-none");
    });
    form.addEventListener("submit", async (evento) => {
        var _a, _b, _c, _d;
        evento.preventDefault();
        mensagemErro.textContent = "";
        const email = campoEmail.value.trim();
        // Validação local: destaca o campo de e-mail se vazio ou com formato inválido
        if (!email) {
            (_a = campoEmail.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            mensagemErro.textContent = "Informe seu e-mail.";
            return;
        }
        if (!REGEX_EMAIL.test(email)) {
            (_b = campoEmail.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            erroEmail.textContent = "Informe um e-mail válido.";
            erroEmail.classList.remove("d-none");
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
                // Exibe toast e redireciona para a página de confirmação após 2 segundos
                mostrarToast("Se o e-mail estiver cadastrado, você receberá as instruções em instantes.");
                btn.textContent = "Redirecionando…";
                setTimeout(() => {
                    window.location.href = "redefinir-senha.html";
                }, 2000);
            }
            else {
                const dados = await resposta.json();
                // O django-rest-passwordreset pode retornar o erro no campo "email" ou "detail"
                const msg = (_d = (_c = (dados.email && dados.email[0])) !== null && _c !== void 0 ? _c : dados.detail) !== null && _d !== void 0 ? _d : "Erro ao solicitar redefinição.";
                mensagemErro.textContent = msg;
                btn.disabled = false;
                btn.textContent = "Enviar token";
            }
        }
        catch (_e) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled = false;
            btn.textContent = "Enviar token";
        }
    });
});
