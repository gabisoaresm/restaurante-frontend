// Realiza logout: invalida o token no backend e limpa o armazenamento local
async function realizarLogout(): Promise<void> {
    const token = localStorage.getItem("token");

    // Chama o backend para invalidar o token, mesmo que o localStorage já esteja vazio
    if (token) {
        try {
            await fetch(`${BASE_URL}/api/accounts/token-auth/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
        } catch {
            // Falha de rede: prossegue com o logout local mesmo sem confirmar no backend
        }
    }

    // Remove todos os dados da sessão do armazenamento local
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("tipo");

    // Redireciona para a página de login após o logout
    window.location.href = "login.html";
}
