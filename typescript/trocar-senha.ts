// Página de troca de senha para usuário logado
document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");

    // Apenas usuários autenticados podem acessar esta página
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const form            = document.getElementById("form-trocar-senha") as HTMLFormElement;
    const mensagemErro    = document.getElementById("mensagem-erro")      as HTMLParagraphElement;
    const btn             = form.querySelector("button[type='submit']")   as HTMLButtonElement;

    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            input.closest(".campo")?.classList.remove("campo-invalido");
        });
    });

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        mensagemErro.textContent = "";

        const campoOld  = document.getElementById("old_password")  as HTMLInputElement;
        const campoNew1 = document.getElementById("new_password1") as HTMLInputElement;
        const campoNew2 = document.getElementById("new_password2") as HTMLInputElement;

        const oldPassword  = campoOld.value;
        const newPassword1 = campoNew1.value;
        const newPassword2 = campoNew2.value;

        // Validação local: destaca visualmente os campos deixados em branco
        let invalido = false;
        if (!oldPassword)  { campoOld.closest(".campo")?.classList.add("campo-invalido");  invalido = true; }
        if (!newPassword1) { campoNew1.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (!newPassword2) { campoNew2.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (invalido) {
            mensagemErro.textContent = "Preencha todos os campos.";
            return;
        }

        // Validação local: evita viagem desnecessária ao servidor se as novas senhas divergem
        if (newPassword1 !== newPassword2) {
            campoNew1.closest(".campo")?.classList.add("campo-invalido");
            campoNew2.closest(".campo")?.classList.add("campo-invalido");
            mensagemErro.textContent = "As novas senhas não coincidem.";
            return;
        }

        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled    = true;
        btn.textContent = "Salvando…";

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
                mostrarToast("Senha alterada com sucesso!");
                form.reset();
            } else {
                mensagemErro.textContent = dados.erro ?? "Erro ao alterar a senha.";
            }
        } catch {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        } finally {
            btn.disabled    = false;
            btn.textContent = "Salvar nova senha";
        }
    });
});
