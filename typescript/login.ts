// Lida com o formulário de login: envia as credenciais e armazena o token recebido
document.addEventListener("DOMContentLoaded", () => {

    // Se já há token salvo, redireciona direto para a home sem exibir o formulário
    if (localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    const form = document.getElementById("form-login") as HTMLFormElement | null;
    const msgErro = document.getElementById("mensagem-erro") as HTMLElement | null;

    if (!form) return;

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();

        // Limpa mensagem de erro anterior antes de nova tentativa
        if (msgErro) msgErro.textContent = "";

        const username = (document.getElementById("username") as HTMLInputElement).value.trim();
        const password = (document.getElementById("password") as HTMLInputElement).value;

        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/token-auth/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (resposta.ok) {
                const dados = await resposta.json();
                // Armazena o token e dados básicos para uso nas demais páginas
                localStorage.setItem("token", dados.token);
                localStorage.setItem("user_id", String(dados.user_id));
                localStorage.setItem("username", dados.username);
                // Redireciona para a home após login bem-sucedido
                window.location.href = "index.html";
            } else if (resposta.status === 401) {
                if (msgErro) msgErro.textContent = "Usuário ou senha incorretos.";
            } else {
                if (msgErro) msgErro.textContent = "Erro ao fazer login. Tente novamente.";
            }
        } catch {
            if (msgErro) msgErro.textContent = "Não foi possível conectar ao servidor.";
        }
    });
});
