// Dashboard personalizado da página inicial — adapta o conteúdo ao tipo de perfil do usuário

interface CategoriaSimples {
    id: number;
    nome: string;
}

interface ItemCardapioSimples {
    id: number;
    nome: string;
    descricao: string;
    preco: string;
    categoria: number;
    disponivel: boolean;
}

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
// colClass permite ajustar o número de colunas por linha (default: 3 por linha em md+)
function criarCardAcao(href: string, icone: string, titulo: string, descricao: string, colClass: string = "col-md-4 col-sm-6 fade-in"): HTMLElement {
    const col = document.createElement("div");
    col.className = colClass;
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
        // Visitante não autenticado — exibe hero compacto e cardápio em modo somente leitura
        divVisitante.classList.remove("d-none");

        const divFiltros        = document.getElementById("filtros-visitante") as HTMLDivElement;
        const divCarregandoMenu = document.getElementById("carregando-cardapio-visitante") as HTMLDivElement;
        const pErroMenu         = document.getElementById("erro-cardapio-visitante") as HTMLParagraphElement;
        const divLista          = document.getElementById("lista-itens-visitante") as HTMLDivElement;

        const params         = new URLSearchParams(window.location.search);
        const categoriaAtiva = params.get("categoria");

        try {
            // Busca categorias e itens em paralelo — endpoints públicos, sem autenticação
            const [resCateg, resItens] = await Promise.all([
                fetch(`${BASE_URL}/api/cardapio/categorias/`),
                fetch(categoriaAtiva
                    ? `${BASE_URL}/api/cardapio/itens/?categoria=${categoriaAtiva}`
                    : `${BASE_URL}/api/cardapio/itens/`)
            ]);

            const categorias: CategoriaSimples[]   = await resCateg.json();
            const todosItens: ItemCardapioSimples[] = await resItens.json();

            // Visitante vê apenas itens marcados como disponíveis
            const itens = todosItens.filter(item => item.disponivel);

            // Monta pills de filtro por categoria — links relativos para suportar ?categoria=<id>
            const paginaBase = window.location.pathname;
            const pillTodas  = document.createElement("a");
            pillTodas.href        = paginaBase;
            pillTodas.className   = `btn btn-sm ${!categoriaAtiva ? "btn-dark" : "btn-outline-dark"}`;
            pillTodas.textContent = "Todas";
            divFiltros.appendChild(pillTodas);

            for (const cat of categorias) {
                const pill = document.createElement("a");
                pill.href        = `${paginaBase}?categoria=${cat.id}`;
                pill.className   = `btn btn-sm ${categoriaAtiva === String(cat.id) ? "btn-secondary" : "btn-outline-secondary"}`;
                pill.textContent = cat.nome;
                divFiltros.appendChild(pill);
            }

            divCarregandoMenu.classList.add("d-none");

            if (itens.length === 0) {
                divLista.innerHTML = `
                    <div class="card shadow-sm border-0">
                      <div class="card-body text-center py-5 text-muted">
                        <i class="bi bi-journal-x fs-2 d-block mb-2"></i>
                        Nenhum item disponível no momento.
                      </div>
                    </div>`;
                return;
            }

            // Agrupa os itens por categoria respeitando a ordem retornada pelo backend
            const itensPorCategoria = new Map<number, { nome: string; itens: ItemCardapioSimples[] }>();
            for (const cat of categorias) {
                itensPorCategoria.set(cat.id, { nome: cat.nome, itens: [] });
            }
            for (const item of itens) {
                itensPorCategoria.get(item.categoria)?.itens.push(item);
            }

            // Renderiza uma seção por categoria com cards somente leitura (sem stepper nem ações)
            for (const [, { nome: catNome, itens: itensCategoria }] of itensPorCategoria) {
                if (itensCategoria.length === 0) continue;

                const secao = document.createElement("section");
                secao.className = "mb-5";
                secao.innerHTML = `
                    <h6 class="fw-semibold text-uppercase text-muted mb-3"
                        style="font-size: .7rem; letter-spacing: .07em;">
                      <i class="bi bi-tag me-1"></i>${catNome}
                    </h6>
                    <div class="row g-3"></div>`;

                const row = secao.querySelector(".row")!;

                for (const item of itensCategoria) {
                    const col  = document.createElement("div");
                    col.className = "col-md-4 col-sm-6 fade-in";
                    const precoBR = Number(item.preco).toFixed(2).replace(".", ",");
                    col.innerHTML = `
                        <div class="card h-100 shadow-sm border-0">
                          <div class="card-body d-flex flex-column p-4">
                            <h6 class="card-title fw-semibold mb-1">${item.nome}</h6>
                            <p class="card-text text-muted small flex-grow-1 my-2">${item.descricao}</p>
                            <div class="d-flex justify-content-end align-items-center mt-auto">
                              <span class="fw-semibold" style="color: var(--vermelho)">R$ ${precoBR}</span>
                            </div>
                          </div>
                        </div>`;
                    row.appendChild(col);
                }

                divLista.appendChild(secao);
            }

        } catch {
            divCarregandoMenu.classList.add("d-none");
            pErroMenu.textContent = "Não foi possível carregar o cardápio. Verifique sua conexão com o servidor.";
        }

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
        // 4 cards → grade 2×2 em md, 4 em linha em lg
        const col4 = "col-lg-3 col-md-6 col-sm-6 fade-in";
        divCards.appendChild(criarCardAcao(
            "cardapio.html",
            "bi-menu-button-wide",
            "Gerenciar Cardápio",
            "Adicione, edite ou remova itens e categorias.",
            col4
        ));
        divCards.appendChild(criarCardAcao(
            "pedidos-gerente.html",
            "bi-clipboard-data",
            "Ver Pedidos",
            "Acompanhe todos os pedidos do restaurante.",
            col4
        ));
        divCards.appendChild(criarCardAcao(
            "gerenciar-usuarios.html",
            "bi-people",
            "Gerenciar Usuários",
            "Altere o tipo de perfil dos usuários cadastrados.",
            col4
        ));
        divCards.appendChild(criarCardAcao(
            "perfil.html",
            "bi-person",
            "Meu Perfil",
            "Edite seus dados pessoais e senha.",
            col4
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
