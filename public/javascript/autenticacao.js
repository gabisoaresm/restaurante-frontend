"use strict";
// Retorna o nome do arquivo HTML da página atual (ex.: "cardapio.html")
function paginaAtual() {
    const caminho = window.location.pathname.split("/").pop();
    return caminho && caminho.length > 0 ? caminho : "index.html";
}
// Monta um item de navegação Bootstrap com destaque na página ativa
function linkNav(href, texto) {
    const ativo = paginaAtual() === href;
    const classeAtiva = ativo ? " active" : "";
    const ariaAtual = ativo ? ' aria-current="page"' : "";
    return `<li class="nav-item">
                <a class="nav-link px-lg-2${classeAtiva}" href="${href}"${ariaAtual}>${texto}</a>
            </li>`;
}
// Marca do restaurante (compartilhada por visitante e usuário logado)
function htmlMarcaCabecalho() {
    return `<a class="navbar-brand logo d-flex align-items-center gap-2 fw-bold py-0 text-nowrap text-white" href="index.html">
                <i class="bi bi-fork-knife fs-5 flex-shrink-0" aria-hidden="true"></i>
                <span>Cucina Italiana</span>
            </a>`;
}
// Botão hambúrguer — apenas links de navegação entram no painel colapsável
function htmlTogglerNavbar() {
    return `<button id="navbar-toggler" class="navbar-toggler d-lg-none border-0 shadow-none" type="button"
                    aria-controls="navbar-principal" aria-expanded="false" aria-label="Alternar menu de navegação">
                <span class="navbar-toggler-icon"></span>
            </button>`;
}
// Monta um item do menu dropdown do perfil com destaque na página ativa
function itemDropdownPerfil(href, texto, icone) {
    const ativo = paginaAtual() === href;
    const classeAtiva = ativo ? " dropdown-item-ativo fw-semibold" : "";
    return `<li>
                <a class="dropdown-item link-body-emphasis text-decoration-none${classeAtiva}" href="${href}">
                    <i class="bi ${icone} me-2"></i>${texto}
                </a>
            </li>`;
}
// Monta o menu dropdown do usuário logado (Meu Perfil, atalhos do cliente e Sair)
function htmlDropdownPerfil(usuario, nomeDisplay) {
    let itensCliente = "";
    if (usuario.tipo === "cliente") {
        itensCliente = `
                ${itemDropdownPerfil("meus-pedidos.html", "Meus Pedidos", "bi-receipt")}
                ${itemDropdownPerfil("meus-cartoes.html", "Meus Cartões", "bi-credit-card")}`;
    }
    return `
        <div class="dropdown position-relative" id="dropdown-perfil-container">
            <button type="button"
                    class="btn btn-link nav-link dropdown-toggle d-inline-flex align-items-center gap-2 py-2 px-lg-2 text-nowrap text-white text-decoration-none shadow-none border-0 usuario-info"
                    id="dropdown-perfil"
                    aria-expanded="false"
                    aria-label="Menu do perfil">
                <i class="bi bi-person-circle fs-5"></i>
                <span class="fw-semibold nome-usuario-header d-none d-lg-inline">${nomeDisplay}</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded py-2 bg-white"
                id="dropdown-menu-perfil" aria-labelledby="dropdown-perfil">
                ${itemDropdownPerfil("perfil.html", "Meu Perfil", "bi-person")}
                ${itensCliente}
                <li><hr class="dropdown-divider my-2"></li>
                <li>
                    <button type="button" class="dropdown-item text-danger fw-semibold" id="btn-logout">
                        <i class="bi bi-box-arrow-right me-2"></i>Sair
                    </button>
                </li>
            </ul>
        </div>`;
}
// Fecha o menu dropdown do perfil
function fecharDropdownPerfil() {
    const container = document.getElementById("dropdown-perfil-container");
    const toggle = document.getElementById("dropdown-perfil");
    const menu = document.getElementById("dropdown-menu-perfil");
    if (!container || !toggle || !menu)
        return;
    menu.classList.remove("show");
    container.classList.remove("show");
    toggle.setAttribute("aria-expanded", "false");
    menu.style.removeProperty("top");
}
// Garante destaque vinho no item da página atual e remove .active do Bootstrap (azul)
function sincronizarItensDropdownAtivos() {
    document.querySelectorAll("#dropdown-menu-perfil a.dropdown-item[href]").forEach(link => {
        const href = link.getAttribute("href");
        const ativo = href === paginaAtual();
        link.classList.toggle("dropdown-item-ativo", ativo);
        link.classList.toggle("fw-semibold", ativo);
        link.classList.remove("active");
    });
}
// Controla abertura/fechamento do dropdown do perfil via TypeScript (sem bootstrap.bundle.js)
function configurarDropdownPerfil() {
    const container = document.getElementById("dropdown-perfil-container");
    const toggle = document.getElementById("dropdown-perfil");
    const menu = document.getElementById("dropdown-menu-perfil");
    if (!container || !toggle || !menu)
        return;
    toggle.addEventListener("click", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        const abrir = !menu.classList.contains("show");
        fecharDropdownPerfil();
        // Fecha o menu hambúrguer ao abrir o dropdown — perfil fica fora do painel colapsável
        const menuNav = document.getElementById("navbar-principal");
        const togglerNav = document.getElementById("navbar-toggler");
        menuNav === null || menuNav === void 0 ? void 0 : menuNav.classList.remove("show");
        togglerNav === null || togglerNav === void 0 ? void 0 : togglerNav.setAttribute("aria-expanded", "false");
        if (abrir) {
            menu.classList.add("show");
            container.classList.add("show");
            toggle.setAttribute("aria-expanded", "true");
            // Mobile: posiciona o dropdown abaixo do header sem ser cortado pelo flex da navbar
            if (window.matchMedia("(max-width: 991.98px)").matches) {
                const cabecalho = document.getElementById("cabecalho");
                if (cabecalho) {
                    menu.style.top = `${cabecalho.getBoundingClientRect().bottom + 4}px`;
                }
            }
        }
    });
    // Fecha ao clicar fora do dropdown
    document.addEventListener("click", () => {
        fecharDropdownPerfil();
    });
    // Impede que cliques dentro do menu fechem o dropdown antes da ação
    menu.addEventListener("click", (evento) => {
        evento.stopPropagation();
    });
    // Fecha dropdown e menu mobile ao navegar por um link do dropdown
    menu.querySelectorAll("a.dropdown-item").forEach(link => {
        link.addEventListener("click", () => {
            fecharDropdownPerfil();
            const menuNav = document.getElementById("navbar-principal");
            const togglerNav = document.getElementById("navbar-toggler");
            menuNav === null || menuNav === void 0 ? void 0 : menuNav.classList.remove("show");
            togglerNav === null || togglerNav === void 0 ? void 0 : togglerNav.setAttribute("aria-expanded", "false");
        });
    });
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            fecharDropdownPerfil();
            solicitarLogout();
        });
    }
    sincronizarItensDropdownAtivos();
}
// Controla o menu colapsável no mobile via TypeScript (Bootstrap CSS only — sem bootstrap.bundle.js)
function configurarMenuMobile() {
    const toggler = document.getElementById("navbar-toggler");
    const menu = document.getElementById("navbar-principal");
    if (!toggler || !menu)
        return;
    toggler.addEventListener("click", () => {
        const aberto = menu.classList.toggle("show");
        toggler.setAttribute("aria-expanded", aberto ? "true" : "false");
        fecharDropdownPerfil();
    });
    // Fecha o menu após navegar — evita que o painel fique aberto no mobile
    menu.querySelectorAll("a.nav-link, a.btn, a.dropdown-item").forEach(link => {
        link.addEventListener("click", () => {
            menu.classList.remove("show");
            toggler.setAttribute("aria-expanded", "false");
        });
    });
}
// Aplica classes Bootstrap ao elemento <header> antes de renderizar o conteúdo
function prepararElementoCabecalho(cabecalho) {
    cabecalho.className = "navbar navbar-expand-lg navbar-dark py-2 shadow-sm";
}
// Monta o cabeçalho para usuário logado, adaptando os links de menu ao tipo do perfil
function renderizarCabecalhoLogado(usuario) {
    const cabecalho = document.getElementById("cabecalho");
    if (!cabecalho)
        return;
    prepararElementoCabecalho(cabecalho);
    // Nome de exibição: primeiro nome quando disponível, fallback para username
    const nomeDisplay = usuario.first_name.trim() || usuario.username;
    // Cada perfil vê apenas os links relevantes para o seu fluxo de trabalho
    let linksMenu = "";
    if (usuario.tipo === "cliente") {
        linksMenu = `
                ${linkNav("cardapio.html", "Cardápio")}
                ${linkNav("carrinho.html", "Carrinho")}`;
    }
    else if (usuario.tipo === "atendente") {
        linksMenu = linkNav("fila-pedidos.html", "Fila de Pedidos");
    }
    else if (usuario.tipo === "gerente") {
        linksMenu = `
                ${linkNav("cardapio.html", "Cardápio")}
                ${linkNav("pedidos-gerente.html", "Pedidos")}
                ${linkNav("gerenciar-usuarios.html", "Usuários")}`;
    }
    cabecalho.innerHTML = `
        <div class="cabecalho-interno container-fluid">
            ${htmlMarcaCabecalho()}
            <div class="cabecalho-acoes-usuario d-flex align-items-center gap-1 order-2 order-lg-3 ms-auto ms-lg-0 flex-shrink-0">
                ${htmlDropdownPerfil(usuario, nomeDisplay)}
                ${htmlTogglerNavbar()}
            </div>
            <div class="collapse navbar-collapse order-3 order-lg-2 flex-lg-grow-1 w-100 w-lg-auto" id="navbar-principal">
                <ul class="navbar-nav me-lg-auto mb-2 mb-lg-0 gap-lg-1">
                    ${linksMenu}
                </ul>
            </div>
        </div>`;
    configurarDropdownPerfil();
    configurarMenuMobile();
}
// Monta o cabeçalho para visitante (sem token ou token expirado)
function renderizarCabecalhoVisitante() {
    const cabecalho = document.getElementById("cabecalho");
    if (!cabecalho)
        return;
    prepararElementoCabecalho(cabecalho);
    cabecalho.innerHTML = `
        <div class="cabecalho-interno container-fluid">
            ${htmlMarcaCabecalho()}
            <div class="cabecalho-acoes-usuario d-flex align-items-center gap-1 order-2 order-lg-3 ms-auto ms-lg-0 flex-shrink-0">
                ${htmlTogglerNavbar()}
            </div>
            <div class="collapse navbar-collapse order-3 order-lg-2 flex-lg-grow-1 w-100 w-lg-auto" id="navbar-principal">
                <ul class="navbar-nav navbar-nav-visitante ms-lg-auto mb-2 mb-lg-0 align-items-lg-center gap-2">
                    <li class="nav-item">
                        <a class="btn btn-outline-light btn-sm px-3" href="login.html">
                            <i class="bi bi-box-arrow-in-right me-1"></i>Entrar
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="btn btn-outline-light btn-sm px-3" href="registro.html">
                            <i class="bi bi-person-plus me-1"></i>Registrar
                        </a>
                    </li>
                </ul>
            </div>
        </div>`;
    configurarMenuMobile();
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
