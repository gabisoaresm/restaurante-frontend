// Lida com o formulário de registro de novo cliente
document.addEventListener("DOMContentLoaded", () => {

    // Usuário já logado não precisa se registrar
    if (localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    const form         = document.getElementById("form-registro") as HTMLFormElement;
    const mensagemErro = document.getElementById("mensagem-erro") as HTMLParagraphElement;
    const btn          = form.querySelector("button[type='submit']") as HTMLButtonElement;

    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            input.closest(".campo")?.classList.remove("campo-invalido");
        });
    });

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        mensagemErro.textContent = "";

        const campoFirstName       = document.getElementById("first_name")       as HTMLInputElement;
        const campoLastName        = document.getElementById("last_name")         as HTMLInputElement;
        const campoUsername        = document.getElementById("username")          as HTMLInputElement;
        const campoEmail           = document.getElementById("email")             as HTMLInputElement;
        const campoPassword        = document.getElementById("password")          as HTMLInputElement;
        const campoPasswordConfirm = document.getElementById("password_confirm")  as HTMLInputElement;

        const firstName       = campoFirstName.value.trim();
        const lastName        = campoLastName.value.trim();
        const username        = campoUsername.value.trim();
        const email           = campoEmail.value.trim();
        const password        = campoPassword.value;
        const passwordConfirm = campoPasswordConfirm.value;

        // Validação local: destaca visualmente os campos obrigatórios deixados em branco
        let invalido = false;
        if (!firstName)       { campoFirstName.closest(".campo")?.classList.add("campo-invalido");       invalido = true; }
        if (!lastName)        { campoLastName.closest(".campo")?.classList.add("campo-invalido");        invalido = true; }
        if (!username)        { campoUsername.closest(".campo")?.classList.add("campo-invalido");        invalido = true; }
        if (!email)           { campoEmail.closest(".campo")?.classList.add("campo-invalido");           invalido = true; }
        if (!password)        { campoPassword.closest(".campo")?.classList.add("campo-invalido");        invalido = true; }
        if (!passwordConfirm) { campoPasswordConfirm.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (invalido) {
            mensagemErro.textContent = "Preencha todos os campos obrigatórios.";
            return;
        }

        // Validação local: as senhas devem coincidir antes de enviar ao servidor
        if (password !== passwordConfirm) {
            campoPassword.closest(".campo")?.classList.add("campo-invalido");
            campoPasswordConfirm.closest(".campo")?.classList.add("campo-invalido");
            mensagemErro.textContent = "As senhas não coincidem.";
            return;
        }

        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled    = true;
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
                    last_name:  lastName,
                }),
            });

            if (resposta.status === 201) {
                // Cadastro realizado — redireciona para o login com aviso de sucesso
                window.location.href = "login.html?cadastro=ok";
            } else {
                const dados = await resposta.json();
                mensagemErro.textContent = dados.erro ?? "Erro ao registrar. Tente novamente.";
            }
        } catch {
            mensagemErro.textContent = "Não foi possível conectar ao servidor. Verifique sua conexão.";
        } finally {
            btn.disabled    = false;
            btn.textContent = "Criar conta";
        }
    });
});
