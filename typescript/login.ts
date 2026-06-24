// Lida com o formulário de login: envia as credenciais e armazena o token recebido
document.addEventListener("DOMContentLoaded", () => {

    // Se já há token salvo, redireciona direto para a home sem exibir o formulário
    if (localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    // Exibe toast de sucesso quando o usuário chega vindo de registro ou redefinição de senha
    const params = new URLSearchParams(window.location.search);
    if (params.get("cadastro") === "ok") {
        mostrarToast("Cadastro realizado com sucesso! Faça login para continuar.");
    } else if (params.get("senha_redefinida") === "ok") {
        mostrarToast("Senha redefinida com sucesso! Faça login com a nova senha.");
    }

    const form    = document.getElementById("form-login")    as HTMLFormElement | null;
    const msgErro = document.getElementById("mensagem-erro") as HTMLElement | null;

    if (!form) return;

    const btn = form.querySelector("button[type='submit']") as HTMLButtonElement;

    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            input.closest(".campo")?.classList.remove("campo-invalido");
        });
    });

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        if (msgErro) msgErro.textContent = "";

        const campoUsername = document.getElementById("username") as HTMLInputElement;
        const campoPassword = document.getElementById("password") as HTMLInputElement;
        const username      = campoUsername.value.trim();
        const password      = campoPassword.value;

        // Validação local: destaca visualmente os campos deixados em branco
        let invalido = false;
        if (!username) { campoUsername.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (!password) { campoPassword.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (invalido) {
            if (msgErro) msgErro.textContent = "Preencha todos os campos.";
            return;
        }

        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled    = true;
        btn.textContent = "Entrando…";

        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/token-auth/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (resposta.ok) {
                const dados = await resposta.json();
                // Armazena o token e dados básicos para uso nas demais páginas
                localStorage.setItem("token",    dados.token);
                localStorage.setItem("user_id",  String(dados.user_id));
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
        } finally {
            btn.disabled    = false;
            btn.textContent = "Entrar";
        }
    });
});
