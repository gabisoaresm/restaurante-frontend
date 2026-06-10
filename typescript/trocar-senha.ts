// Página de troca de senha para usuário logado
document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");

    // Apenas usuários autenticados podem acessar esta página
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const form             = document.getElementById("form-trocar-senha")  as HTMLFormElement;
    const mensagemErro     = document.getElementById("mensagem-erro")       as HTMLParagraphElement;
    const mensagemSucesso  = document.getElementById("mensagem-sucesso")    as HTMLParagraphElement;

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        mensagemErro.textContent    = "";
        mensagemSucesso.textContent = "";

        const oldPassword  = (document.getElementById("old_password")  as HTMLInputElement).value;
        const newPassword1 = (document.getElementById("new_password1") as HTMLInputElement).value;
        const newPassword2 = (document.getElementById("new_password2") as HTMLInputElement).value;

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
                    old_password:  oldPassword,
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
            } else {
                mensagemErro.textContent = dados.erro ?? "Erro ao alterar a senha.";
            }
        } catch {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
    });
});
