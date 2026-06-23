"use strict";
// Monta o cabeçalho para usuário logado, adaptando os links de menu ao tipo do perfil
function renderizarCabecalhoLogado(usuario) {
    const cabecalho = document.getElementById("cabecalho");
    if (!cabecalho)
        return;
    // Cada perfil vê apenas os links relevantes para o seu fluxo de trabalho
    let linksMenu = "";
    if (usuario.tipo === "cliente") {
        linksMenu = `
            <a href="cardapio.html">Cardápio</a>
            <a href="carrinho.html">Carrinho</a>
            <a href="meus-pedidos.html">Meus Pedidos</a>
            <a href="meus-cartoes.html">Meus Cartões</a>
            <a href="trocar-senha.html">Trocar Senha</a>`;
    }
    else if (usuario.tipo === "atendente") {
        linksMenu = `
            <a href="fila-pedidos.html">Fila de Pedidos</a>
            <a href="trocar-senha.html">Trocar Senha</a>`;
    }
    else if (usuario.tipo === "gerente") {
        linksMenu = `
            <a href="cardapio.html">Gerenciar Cardápio</a>
            <a href="pedidos-gerente.html">Pedidos</a>
            <a href="trocar-senha.html">Trocar Senha</a>`;
    }
    cabecalho.innerHTML = `
        <div class="cabecalho-interno">
            <a class="logo" href="index.html">Restaurante</a>
            <nav>
                ${linksMenu}
                <button id="btn-logout">Sair</button>
            </nav>
            <span class="usuario-info">Olá, ${usuario.username} (${usuario.tipo})</span>
        </div>`;
    // Vincula o botão de logout à função definida em logout.ts
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => { void realizarLogout(); });
    }
}
// Monta o cabeçalho para visitante (sem token ou token expirado)
function renderizarCabecalhoVisitante() {
    const cabecalho = document.getElementById("cabecalho");
    if (!cabecalho)
        return;
    cabecalho.innerHTML = `
        <div class="cabecalho-interno">
            <a class="logo" href="index.html">Restaurante</a>
            <nav>
                <a href="index.html">Home</a>
                <a href="login.html">Entrar</a>
                <a href="registro.html">Registrar</a>
            </nav>
        </div>`;
}
// Verifica o token salvo e constrói o cabeçalho conforme o estado de autenticação
async function inicializarCabecalho() {
    const token = localStorage.getItem("token");
    // Sem token: exibe menu de visitante sem chamar a API
    if (!token) {
        renderizarCabecalhoVisitante();
        return;
    }
    try {
        const resposta = await fetch(`${BASE_URL}/api/accounts/me/`, {
            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
        });
        if (resposta.ok) {
            const usuario = await resposta.json();
            // Persiste o tipo no localStorage para uso nas demais telas
            if (usuario.tipo) {
                localStorage.setItem("tipo", usuario.tipo);
            }
            renderizarCabecalhoLogado(usuario);
        }
        else {
            // Token inválido ou expirado — limpa o armazenamento local
            localStorage.removeItem("token");
            renderizarCabecalhoVisitante();
        }
    }
    catch (_a) {
        // Falha de rede — exibe cabeçalho de visitante sem travar a página
        renderizarCabecalhoVisitante();
    }
}
// Inicializa o cabeçalho assim que o DOM estiver pronto
document.addEventListener("DOMContentLoaded", inicializarCabecalho);
