// Confirma a redefinição de senha usando o token recebido por e-mail
document.addEventListener("DOMContentLoaded", () => {

    const form         = document.getElementById("form-redefinir-senha") as HTMLFormElement;
    const mensagemErro = document.getElementById("mensagem-erro")        as HTMLParagraphElement;
    const btn          = form.querySelector("button[type='submit']")     as HTMLButtonElement;

    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            input.closest(".campo")?.classList.remove("campo-invalido");
        });
    });

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        mensagemErro.textContent = "";

        const campoToken   = document.getElementById("token")            as HTMLInputElement;
        const campoSenha   = document.getElementById("password")         as HTMLInputElement;
        const campoConfirm = document.getElementById("password_confirm") as HTMLInputElement;

        const token    = campoToken.value.trim();
        const password = campoSenha.value;
        const confirm  = campoConfirm.value;

        // Validação local: destaca visualmente os campos deixados em branco
        let invalido = false;
        if (!token)   { campoToken.closest(".campo")?.classList.add("campo-invalido");   invalido = true; }
        if (!password) { campoSenha.closest(".campo")?.classList.add("campo-invalido");  invalido = true; }
        if (!confirm)  { campoConfirm.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (invalido) {
            mensagemErro.textContent = "Preencha todos os campos.";
            return;
        }

        // Validação local: as senhas devem coincidir antes de enviar ao servidor
        if (password !== confirm) {
            campoSenha.closest(".campo")?.classList.add("campo-invalido");
            campoConfirm.closest(".campo")?.classList.add("campo-invalido");
            mensagemErro.textContent = "As senhas não coincidem.";
            return;
        }

        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled    = true;
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
            } else {
                const dados = await resposta.json();
                // O django-rest-passwordreset pode retornar token inválido/expirado em vários campos
                const msg =
                    dados.detail                        ??
                    (dados.token    && dados.token[0])   ??
                    (dados.password && dados.password[0]) ??
                    "Token inválido ou expirado.";
                mensagemErro.textContent = msg;
            }
        } catch {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        } finally {
            btn.disabled    = false;
            btn.textContent = "Redefinir senha";
        }
    });
});
