"use strict";
// Confirma a redefinição de senha usando o token recebido por e-mail
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-redefinir-senha");
    const mensagemErro = document.getElementById("mensagem-erro");
    form.addEventListener("submit", async (evento) => {
        var _a, _b, _c;
        evento.preventDefault();
        mensagemErro.textContent = "";
        const token = document.getElementById("token").value.trim();
        const password = document.getElementById("password").value;
        const confirm = document.getElementById("password_confirm").value;
        // Validação local antes de enviar ao servidor
        if (password !== confirm) {
            mensagemErro.textContent = "As senhas não coincidem.";
            return;
        }
        try {
            // O django-rest-passwordreset espera {token, password} no corpo
            const resposta = await fetch(`${BASE_URL}/api/accounts/password_reset/confirm/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            if (resposta.ok) {
                // Senha redefinida — redireciona para o login com mensagem de confirmação
                window.location.href = "login.html?senha_redefinida=ok";
            }
            else {
                const dados = await resposta.json();
                // O django-rest-passwordreset pode retornar token inválido/expirado em vários campos
                const msg = (_c = (_b = (_a = dados.detail) !== null && _a !== void 0 ? _a : (dados.token && dados.token[0])) !== null && _b !== void 0 ? _b : (dados.password && dados.password[0])) !== null && _c !== void 0 ? _c : "Token inválido ou expirado.";
                mensagemErro.textContent = msg;
            }
        }
        catch (_d) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
    });
});
