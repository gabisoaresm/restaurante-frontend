"use strict";
// Página de troca de senha para usuário logado
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    // Apenas usuários autenticados podem acessar esta página
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    const form = document.getElementById("form-trocar-senha");
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
        var _a, _b, _c, _d, _e, _f;
        evento.preventDefault();
        mensagemErro.textContent = "";
        mensagemSucesso.textContent = "";
        const campoOld = document.getElementById("old_password");
        const campoNew1 = document.getElementById("new_password1");
        const campoNew2 = document.getElementById("new_password2");
        const oldPassword = campoOld.value;
        const newPassword1 = campoNew1.value;
        const newPassword2 = campoNew2.value;
        // Validação local: destaca visualmente os campos deixados em branco
        let invalido = false;
        if (!oldPassword) {
            (_a = campoOld.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            invalido = true;
        }
        if (!newPassword1) {
            (_b = campoNew1.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (!newPassword2) {
            (_c = campoNew2.closest(".campo")) === null || _c === void 0 ? void 0 : _c.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            mensagemErro.textContent = "Preencha todos os campos.";
            return;
        }
        // Validação local: evita viagem desnecessária ao servidor se as novas senhas divergem
        if (newPassword1 !== newPassword2) {
            (_d = campoNew1.closest(".campo")) === null || _d === void 0 ? void 0 : _d.classList.add("campo-invalido");
            (_e = campoNew2.closest(".campo")) === null || _e === void 0 ? void 0 : _e.classList.add("campo-invalido");
            mensagemErro.textContent = "As novas senhas não coincidem.";
            return;
        }
        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled = true;
        btn.textContent = "Salvando…";
        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/troca-senha/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`,
                },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password1: newPassword1,
                    new_password2: newPassword2,
                }),
            });
            const dados = await resposta.json();
            if (resposta.ok) {
                // O backend invalida o token antigo e retorna um novo — obrigatório atualizar
                localStorage.setItem("token", dados.token);
                mensagemSucesso.textContent = "Senha alterada com sucesso!";
                form.reset();
            }
            else {
                mensagemErro.textContent = (_f = dados.erro) !== null && _f !== void 0 ? _f : "Erro ao alterar a senha.";
            }
        }
        catch (_g) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
        finally {
            btn.disabled = false;
            btn.textContent = "Salvar nova senha";
        }
    });
});
