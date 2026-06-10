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
    form.addEventListener("submit", async (evento) => {
        var _a;
        evento.preventDefault();
        mensagemErro.textContent = "";
        mensagemSucesso.textContent = "";
        const oldPassword = document.getElementById("old_password").value;
        const newPassword1 = document.getElementById("new_password1").value;
        const newPassword2 = document.getElementById("new_password2").value;
        // Validação local: evita viagem desnecessária ao servidor se as novas senhas divergem
        if (newPassword1 !== newPassword2) {
            mensagemErro.textContent = "As novas senhas não coincidem.";
            return;
        }
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
                mensagemErro.textContent = (_a = dados.erro) !== null && _a !== void 0 ? _a : "Erro ao alterar a senha.";
            }
        }
        catch (_b) {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
    });
});
