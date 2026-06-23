// Dashboard personalizado da página inicial — adapta o conteúdo ao tipo de perfil do usuário

// Aguarda autenticacao.ts terminar de renderizar o cabeçalho para que localStorage.tipo esteja disponível
function aguardarCabecalhoIndex(): Promise<void> {
    return new Promise(resolve => {
        const cab = document.getElementById("cabecalho");
        if (!cab || cab.innerHTML.trim() !== "") { resolve(); return; }
        const obs = new MutationObserver(() => { obs.disconnect(); resolve(); });
        obs.observe(cab, { childList: true });
        // Timeout de segurança: resolve após 2 s mesmo sem resposta do /me/
        setTimeout(() => { obs.disconnect(); resolve(); }, 2000);
    });
}

// Cria um card de ação clicável com ícone, título e descrição
function criarCardAcao(href: string, icone: string, titulo: string, descricao: string): HTMLElement {
    const col = document.createElement("div");
    col.className = "col-md-4 col-sm-6 fade-in";
    col.innerHTML = `
        <a href="${href}" class="text-decoration-none">
            <div class="card shadow-sm border-0 h-100 card-dashboard">
                <div class="card-body text-center p-5">
                    <i class="bi ${icone} fs-1 mb-3 d-block" style="color: var(--vermelho)"></i>
                    <h5 class="fw-semibold mb-2">${titulo}</h5>
                    <p class="text-muted small mb-0">${descricao}</p>
                </div>
            </div>
        </a>`;
    return col;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Aguarda autenticacao.ts terminar para que localStorage.tipo esteja disponível
    await aguardarCabecalhoIndex();

    const divCarregando = document.getElementById("carregando") as HTMLDivElement;
    const divVisitante  = document.getElementById("vista-visitante") as HTMLDivElement;
    const divLogada     = document.getElementById("vista-logada") as HTMLDivElement;
    const divBoasVindas = document.getElementById("boas-vindas") as HTMLDivElement;
    const divCards      = document.getElementById("cards-dashboard") as HTMLDivElement;

    divCarregando.classList.add("d-none");

    const token    = localStorage.getItem("token");
    const tipo     = localStorage.getItem("tipo");
    const username = localStorage.getItem("username");

    if (!token || !tipo) {
        // Visitante não autenticado — exibe página pública de apresentação
        divVisitante.classList.remove("d-none");
        return;
    }

    // Usuário autenticado — exibe dashboard personalizado por perfil
    divLogada.classList.remove("d-none");

    divBoasVindas.innerHTML = `
        <h2 class="fw-semibold mb-1">Bem-vindo, ${username}!</h2>
        <p class="text-muted mb-0">O que você deseja fazer hoje?</p>`;

    // Monta os cards de acesso rápido conforme o tipo de perfil
    if (tipo === "cliente") {
        divCards.appendChild(criarCardAcao(
            "cardapio.html",
            "bi-bag-plus",
            "Fazer um Pedido",
            "Navegue pelo cardápio e monte o seu pedido."
        ));
        divCards.appendChild(criarCardAcao(
            "meus-pedidos.html",
            "bi-receipt",
            "Meus Pedidos",
            "Acompanhe e gerencie os seus pedidos."
        ));
        divCards.appendChild(criarCardAcao(
            "perfil.html",
            "bi-person",
            "Meu Perfil",
            "Edite seus dados pessoais e senha."
        ));

    } else if (tipo === "gerente") {
        divCards.appendChild(criarCardAcao(
            "cardapio.html",
            "bi-menu-button-wide",
            "Gerenciar Cardápio",
            "Adicione, edite ou remova itens e categorias."
        ));
        divCards.appendChild(criarCardAcao(
            "pedidos-gerente.html",
            "bi-clipboard-data",
            "Ver Pedidos",
            "Acompanhe todos os pedidos do restaurante."
        ));
        divCards.appendChild(criarCardAcao(
            "perfil.html",
            "bi-person",
            "Meu Perfil",
            "Edite seus dados pessoais e senha."
        ));

    } else if (tipo === "atendente") {
        divCards.appendChild(criarCardAcao(
            "fila-pedidos.html",
            "bi-list-ul",
            "Fila de Pedidos",
            "Veja a fila de pedidos e avance os status."
        ));
        divCards.appendChild(criarCardAcao(
            "perfil.html",
            "bi-person",
            "Meu Perfil",
            "Edite seus dados pessoais e senha."
        ));
    }
});
