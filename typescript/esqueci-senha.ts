// Solicita o envio de token de redefinição de senha para o e-mail informado
document.addEventListener("DOMContentLoaded", () => {

    const form            = document.getElementById("form-esqueci-senha") as HTMLFormElement;
    const mensagemErro    = document.getElementById("mensagem-erro")      as HTMLParagraphElement;
    const mensagemSucesso = document.getElementById("mensagem-sucesso")   as HTMLParagraphElement;

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        mensagemErro.textContent    = "";
        mensagemSucesso.textContent = "";

        const email = (document.getElementById("email") as HTMLInputElement).value.trim();

        try {
            // O backend envia o token de redefinição para o e-mail via django-rest-passwordreset
            const resposta = await fetch(`${BASE_URL}/api/accounts/password_reset/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (resposta.ok) {
                // Informa ao usuário e redireciona para a página de confirmação após 2 segundos
                mensagemSucesso.textContent =
                    "Se o e-mail estiver cadastrado, você receberá as instruções em instantes. Redirecionando…";
                setTimeout(() => {
                    window.location.href = "redefinir-senha.html";
                }, 2000);
            } else {
                const dados = await resposta.json();
                // O django-rest-passwordreset pode retornar o erro no campo "email" ou "detail"
                const msg = (dados.email && dados.email[0]) ?? dados.detail ?? "Erro ao solicitar redefinição.";
                mensagemErro.textContent = msg;
            }
        } catch {
            mensagemErro.textContent = "Não foi possível conectar ao servidor.";
        }
    });
});
