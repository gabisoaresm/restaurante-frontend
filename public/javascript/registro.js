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
    const btn = form.querySelector("button[type='submit']");
    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            var _a;
            (_a = input.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        });
    });
    form.addEventListener("submit", async (evento) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        evento.preventDefault();
        mensagemErro.textContent = "";
        const campoFirstName = document.getElementById("first_name");
        const campoLastName = document.getElementById("last_name");
        const campoUsername = document.getElementById("username");
        const campoEmail = document.getElementById("email");
        const campoPassword = document.getElementById("password");
        const campoPasswordConfirm = document.getElementById("password_confirm");
        const firstName = campoFirstName.value.trim();
        const lastName = campoLastName.value.trim();
        const username = campoUsername.value.trim();
        const email = campoEmail.value.trim();
        const password = campoPassword.value;
        const passwordConfirm = campoPasswordConfirm.value;
        // Validação local: destaca visualmente os campos obrigatórios deixados em branco
        let invalido = false;
        if (!firstName) {
            (_a = campoFirstName.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            invalido = true;
        }
        if (!lastName) {
            (_b = campoLastName.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (!username) {
            (_c = campoUsername.closest(".campo")) === null || _c === void 0 ? void 0 : _c.classList.add("campo-invalido");
            invalido = true;
        }
        if (!email) {
            (_d = campoEmail.closest(".campo")) === null || _d === void 0 ? void 0 : _d.classList.add("campo-invalido");
            invalido = true;
        }
        if (!password) {
            (_e = campoPassword.closest(".campo")) === null || _e === void 0 ? void 0 : _e.classList.add("campo-invalido");
            invalido = true;
        }
        if (!passwordConfirm) {
            (_f = campoPasswordConfirm.closest(".campo")) === null || _f === void 0 ? void 0 : _f.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            mensagemErro.textContent = "Preencha todos os campos obrigatórios.";
            return;
        }
        // Validação local: as senhas devem coincidir antes de enviar ao servidor
        if (password !== passwordConfirm) {
            (_g = campoPassword.closest(".campo")) === null || _g === void 0 ? void 0 : _g.classList.add("campo-invalido");
            (_h = campoPasswordConfirm.closest(".campo")) === null || _h === void 0 ? void 0 : _h.classList.add("campo-invalido");
            mensagemErro.textContent = "As senhas não coincidem.";
            return;
        }
        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled = true;
        btn.textContent = "Criando conta…";
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
                mensagemErro.textContent = (_j = dados.erro) !== null && _j !== void 0 ? _j : "Erro ao registrar. Tente novamente.";
            }
        }
        catch (_k) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor. Verifique sua conexão.";
        }
        finally {
            btn.disabled = false;
            btn.textContent = "Criar conta";
        }
    });
});
