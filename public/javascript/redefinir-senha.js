"use strict";
// Confirma a redefinição de senha usando o token recebido por e-mail
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-redefinir-senha");
    const mensagemErro = document.getElementById("mensagem-erro");
    const btn = form.querySelector("button[type='submit']");
    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            var _a;
            (_a = input.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        });
    });
    form.addEventListener("submit", async (evento) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        evento.preventDefault();
        mensagemErro.textContent = "";
        const campoToken = document.getElementById("token");
        const campoSenha = document.getElementById("password");
        const campoConfirm = document.getElementById("password_confirm");
        const token = campoToken.value.trim();
        const password = campoSenha.value;
        const confirm = campoConfirm.value;
        // Validação local: destaca visualmente os campos deixados em branco
        let invalido = false;
        if (!token) {
            (_a = campoToken.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            invalido = true;
        }
        if (!password) {
            (_b = campoSenha.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (!confirm) {
            (_c = campoConfirm.closest(".campo")) === null || _c === void 0 ? void 0 : _c.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            mensagemErro.textContent = "Preencha todos os campos.";
            return;
        }
        // Validação local: as senhas devem coincidir antes de enviar ao servidor
        if (password !== confirm) {
            (_d = campoSenha.closest(".campo")) === null || _d === void 0 ? void 0 : _d.classList.add("campo-invalido");
            (_e = campoConfirm.closest(".campo")) === null || _e === void 0 ? void 0 : _e.classList.add("campo-invalido");
            mensagemErro.textContent = "As senhas não coincidem.";
            return;
        }
        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled = true;
        btn.textContent = "Redefinindo…";
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
                const msg = (_h = (_g = (_f = dados.detail) !== null && _f !== void 0 ? _f : (dados.token && dados.token[0])) !== null && _g !== void 0 ? _g : (dados.password && dados.password[0])) !== null && _h !== void 0 ? _h : "Token inválido ou expirado.";
                mensagemErro.textContent = msg;
            }
        }
        catch (_j) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
        finally {
            btn.disabled = false;
            btn.textContent = "Redefinir senha";
        }
    });
});
