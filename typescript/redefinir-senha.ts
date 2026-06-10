// Confirma a redefinição de senha usando o token recebido por e-mail
document.addEventListener("DOMContentLoaded", () => {

    const form         = document.getElementById("form-redefinir-senha") as HTMLFormElement;
    const mensagemErro = document.getElementById("mensagem-erro")        as HTMLParagraphElement;

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        mensagemErro.textContent = "";

        const token    = (document.getElementById("token")            as HTMLInputElement).value.trim();
        const password = (document.getElementById("password")         as HTMLInputElement).value;
        const confirm  = (document.getElementById("password_confirm") as HTMLInputElement).value;

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
            } else {
                const dados = await resposta.json();
                // O django-rest-passwordreset pode retornar token inválido/expirado em vários campos
                const msg =
                    dados.detail ??
                    (dados.token  && dados.token[0])    ??
                    (dados.password && dados.password[0]) ??
                    "Token inválido ou expirado.";
                mensagemErro.textContent = msg;
            }
        } catch {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
    });
});
