// Exibe o cardápio público por categoria com navegação em abas; clientes selecionam
// quantidades diretamente no card (fluxo de carrinho); gerentes veem controles de gestão

interface Categoria {
    id: number;
    nome: string;
}

interface ItemCardapio {
    id: number;
    nome: string;
    descricao: string;
    preco: string;
    categoria: number;
    categoria_nome: string;
    disponivel: boolean;
    imagem: string | null;
}

// Item persistido no localStorage["carrinho"] durante a montagem do pedido
interface ItemCarrinho {
    id: number;
    nome: string;
    preco: string;
    quantidade: number;
}

// Ordem desejada das abas no cardápio — categorias fora da lista ficam ao final
const ORDEM_CATEGORIAS = ["entradas", "pratos principais", "sobremesas", "bebidas"];

// Ordena as categorias de acordo com ORDEM_CATEGORIAS; não listadas vão ao final
function ordenarCategorias(cats: Categoria[]): Categoria[] {
    return [...cats].sort((a, b) => {
        const ia = ORDEM_CATEGORIAS.indexOf(a.nome.toLowerCase());
        const ib = ORDEM_CATEGORIAS.indexOf(b.nome.toLowerCase());
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

// Aguarda o cabeçalho ser renderizado pelo autenticacao.ts para garantir
// que o tipo do usuário já foi persistido no localStorage
function aguardarCabecalho(): Promise<void> {
    return new Promise(resolve => {
        const cab = document.getElementById("cabecalho");
        if (!cab || cab.innerHTML.trim() !== "") { resolve(); return; }
        const obs = new MutationObserver(() => { obs.disconnect(); resolve(); });
        obs.observe(cab, { childList: true });
        // Timeout de segurança: resolve após 2 s mesmo sem resposta do /me/
        setTimeout(() => { obs.disconnect(); resolve(); }, 2000);
    });
}

// Extrai o primeiro erro legível de uma resposta de erro do backend
function extrairErro(dados: Record<string, unknown>): string {
    if (typeof dados["erro"] === "string") return dados["erro"];
    for (const campo in dados) {
        const msgs = dados[campo];
        if (Array.isArray(msgs) && msgs.length > 0) return String(msgs[0]);
    }
    return "Erro inesperado.";
}

// Lê o carrinho do localStorage e retorna um array vazio em caso de falha
function carregarCarrinho(): ItemCarrinho[] {
    try {
        return JSON.parse(localStorage.getItem("carrinho") ?? "[]") as ItemCarrinho[];
    } catch {
        return [];
    }
}

// Persiste o carrinho no localStorage
function salvarCarrinho(carrinho: ItemCarrinho[]): void {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

// Atualiza o rodapé fixo com o total atual e o número de itens no carrinho
function atualizarBarraCarrinho(): void {
    const barra   = document.getElementById("barra-carrinho");
    const resumo  = document.getElementById("barra-resumo");
    const totalEl = document.getElementById("barra-total");
    if (!barra || !resumo || !totalEl) return;

    const carrinho   = carregarCarrinho();
    const totalQtd   = carrinho.reduce((s, i) => s + i.quantidade, 0);
    const totalValor = carrinho.reduce((s, i) => s + i.quantidade * parseFloat(i.preco), 0);

    resumo.textContent  = totalQtd === 1 ? "1 item" : `${totalQtd} itens`;
    totalEl.textContent = `R$ ${totalValor.toFixed(2).replace(".", ",")}`;

    // Aumenta o padding do main para o conteúdo não ficar escondido atrás da barra
    const main = document.querySelector("main") as HTMLElement | null;
    if (totalQtd > 0) {
        barra.classList.remove("oculta");
        if (main) {
            const mobile = window.matchMedia("(max-width: 575.98px)").matches;
            main.style.paddingBottom = mobile ? "120px" : "80px";
        }
    } else {
        barra.classList.add("oculta");
        if (main) main.style.paddingBottom = "";
    }
}

// Sincroniza o input de quantidade com o carrinho e atualiza a borda do card
function sincronizarQuantidade(input: HTMLInputElement): void {
    const itemId    = Number(input.dataset["itemId"]);
    const itemNome  = input.dataset["itemNome"]!;
    const itemPreco = input.dataset["itemPreco"]!;
    const qtd       = Math.max(0, Math.floor(Number(input.value) || 0));
    input.value     = String(qtd);

    // Atualiza ou remove o item no carrinho conforme a quantidade
    const carrinho = carregarCarrinho();
    const idx = carrinho.findIndex(i => i.id === itemId);
    if (qtd > 0) {
        if (idx >= 0) carrinho[idx].quantidade = qtd;
        else carrinho.push({ id: itemId, nome: itemNome, preco: itemPreco, quantidade: qtd });
    } else {
        if (idx >= 0) carrinho.splice(idx, 1);
    }
    salvarCarrinho(carrinho);

    // Destaca o card com borda vinho quando há itens selecionados
    const card = input.closest(".card") as HTMLElement | null;
    if (card) {
        card.style.border = qtd > 0
            ? "2px solid var(--vermelho)"
            : "1px solid rgba(0,0,0,.125)";
    }

    atualizarBarraCarrinho();
}

document.addEventListener("DOMContentLoaded", async () => {

    // Aguarda autenticacao.ts terminar para que localStorage.tipo esteja disponível
    await aguardarCabecalho();

    const tipo  = localStorage.getItem("tipo");
    const token = localStorage.getItem("token");

    const divCarregando = document.getElementById("carregando") as HTMLDivElement;
    const divLista      = document.getElementById("lista-itens") as HTMLDivElement;
    const divAbas       = document.getElementById("abas-categoria") as HTMLUListElement;
    const pErro         = document.getElementById("mensagem-erro") as HTMLParagraphElement;

    let modalItemConfigurado = false;
    let itemExclusaoPendente: { id: string; nome: string; btn: HTMLButtonElement } | null = null;

    // HTML do modal de confirmação — Bootstrap CSS only (sem bootstrap.bundle.js)
    function htmlModalExcluirItem(): string {
        return `
        <div class="modal fade" id="modal-excluir-item" tabindex="-1"
             aria-labelledby="modal-excluir-item-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-sm border-0">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-semibold" id="modal-excluir-item-titulo">Excluir item</h5>
                        <button type="button" class="btn-close" id="btn-fechar-modal-excluir-item"
                                aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body pt-3">
                        <p class="text-muted text-center mb-0">
                            Deseja excluir
                            <strong id="modal-excluir-item-nome"></strong>
                            do cardápio? Esta ação não pode ser desfeita.
                        </p>
                    </div>
                    <div class="modal-footer border-0 pt-0 gap-2">
                        <button type="button" class="btn btn-outline-secondary" id="btn-cancelar-excluir-item">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="btn-confirmar-excluir-item">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop fade" id="backdrop-modal-excluir-item"></div>`;
    }

    function fecharModalExcluirItem(): void {
        const modal    = document.getElementById("modal-excluir-item");
        const backdrop = document.getElementById("backdrop-modal-excluir-item");
        if (!modal || !backdrop) return;
        modal.classList.remove("show");
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        modal.removeAttribute("aria-modal");
        backdrop.classList.remove("show");
        backdrop.style.display = "none";
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-item") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        itemExclusaoPendente = null;
    }

    function abrirModalExcluirItem(id: string, nome: string, btn: HTMLButtonElement): void {
        if (!document.getElementById("modal-excluir-item")) {
            document.body.insertAdjacentHTML("beforeend", htmlModalExcluirItem());
            configurarEventosModalItem();
        }
        itemExclusaoPendente = { id, nome, btn };
        const span = document.getElementById("modal-excluir-item-nome");
        if (span) span.textContent = nome;
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-item") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        const modal    = document.getElementById("modal-excluir-item");
        const backdrop = document.getElementById("backdrop-modal-excluir-item");
        if (!modal || !backdrop) return;
        modal.classList.add("show");
        modal.style.display = "block";
        modal.setAttribute("aria-modal", "true");
        modal.removeAttribute("aria-hidden");
        backdrop.style.display = "";
        backdrop.classList.add("show");
        document.body.classList.add("modal-open");
        document.body.style.overflow = "hidden";
    }

    // Remove o item do cardápio via DELETE na API após confirmação no modal
    async function executarExclusaoItem(): Promise<void> {
        if (!itemExclusaoPendente) return;
        const { id, btn } = itemExclusaoPendente;
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-item") as HTMLButtonElement;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Excluindo…`;
        btn.disabled = true;
        try {
            // Envia DELETE ao backend com token de gerente
            const res = await fetch(`${BASE_URL}/api/cardapio/itens/${id}/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
            if (res.status === 204) {
                fecharModalExcluirItem();
                // Remove o card; se a seção ficou vazia, remove a seção inteira e a aba correspondente
                const col   = document.querySelector(`[data-item-id="${id}"]`);
                const secao = col?.closest("section");
                col?.remove();
                if (secao && secao.querySelectorAll("[data-item-id]").length === 0) {
                    const catId = secao.dataset["catId"];
                    secao.remove();
                    // Remove a aba da categoria que ficou vazia
                    divAbas.querySelector(`button[data-cat="${catId}"]`)?.closest("li")?.remove();
                    // Volta para a aba "Todas" se a aba excluída estava ativa
                    const botoesAba = divAbas.querySelectorAll<HTMLButtonElement>("button[data-cat]");
                    const nenhumaAtiva = !divAbas.querySelector("button[data-cat].active");
                    if (nenhumaAtiva && botoesAba.length > 0) ativarAba("todas", botoesAba);
                }
            } else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem excluir itens do cardápio.";
                fecharModalExcluirItem();
                btn.disabled = false;
            } else {
                const dados = await res.json() as Record<string, unknown>;
                pErro.textContent = extrairErro(dados);
                fecharModalExcluirItem();
                btn.disabled = false;
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            fecharModalExcluirItem();
            btn.disabled = false;
        }
    }

    function configurarEventosModalItem(): void {
        if (modalItemConfigurado) return;
        modalItemConfigurado = true;
        document.getElementById("btn-cancelar-excluir-item")?.addEventListener("click", fecharModalExcluirItem);
        document.getElementById("btn-fechar-modal-excluir-item")?.addEventListener("click", fecharModalExcluirItem);
        document.getElementById("backdrop-modal-excluir-item")?.addEventListener("click", fecharModalExcluirItem);
        document.getElementById("btn-confirmar-excluir-item")?.addEventListener("click", () => { void executarExclusaoItem(); });
        document.addEventListener("keydown", (evento: KeyboardEvent) => {
            if (evento.key !== "Escape") return;
            const modal = document.getElementById("modal-excluir-item");
            if (modal?.classList.contains("show")) fecharModalExcluirItem();
        });
    }

    // Ativa a aba indicada e exibe apenas a seção correspondente no conteúdo
    function ativarAba(catId: string, botoes: NodeListOf<HTMLButtonElement>): void {
        botoes.forEach(btn => {
            const ativo = btn.dataset["cat"] === catId;
            btn.classList.toggle("active", ativo);
            btn.setAttribute("aria-selected", String(ativo));
        });
        // Mostra todas as seções na aba "todas"; caso contrário, filtra pela categoria
        // O título (h6) de cada seção só aparece em "Todas" — nas abas individuais já está no tab
        divLista.querySelectorAll<HTMLElement>("section[data-cat-id]").forEach(secao => {
            const visivel = catId === "todas" || secao.dataset["catId"] === catId;
            secao.classList.toggle("d-none", !visivel);
            const titulo = secao.querySelector<HTMLElement>("h6");
            if (titulo) titulo.classList.toggle("d-none", catId !== "todas");
        });
    }

    // Exibe botões de gestão apenas para gerentes autenticados
    if (tipo === "gerente") {
        document.getElementById("acoes-gerente")?.classList.remove("d-none");
    }

    // Injeta a barra de carrinho no rodapé apenas para clientes logados
    if (tipo === "cliente") {
        const barra = document.createElement("div");
        barra.id        = "barra-carrinho";
        barra.className = "barra-carrinho fixed-bottom bg-white border-top shadow-sm py-3 oculta";
        barra.innerHTML = `
            <div class="container barra-carrinho-conteudo d-flex justify-content-between align-items-center gap-3">
              <div class="barra-carrinho-resumo d-flex align-items-center gap-2">
                <i class="bi bi-cart3 fs-5" style="color: var(--vermelho)"></i>
                <span class="fw-semibold" id="barra-resumo">0 itens</span>
                <span class="text-muted small d-none d-sm-inline">selecionados</span>
              </div>
              <div class="barra-carrinho-acoes d-flex align-items-center gap-3">
                <div class="text-end">
                  <div class="text-muted small d-none d-sm-block">Total</div>
                  <span id="barra-total" class="fw-semibold fs-5" style="color: var(--vermelho)">R$ 0,00</span>
                </div>
                <a href="carrinho.html" class="btn btn-danger">
                  <i class="bi bi-bag-check me-1"></i>Ver Carrinho
                </a>
              </div>
            </div>`;
        document.body.appendChild(barra);

        // Inicializa a barra com o estado atual do carrinho (pode ter itens de sessão anterior)
        atualizarBarraCarrinho();
    }

    try {
        // Busca categorias e todos os itens em paralelo (ambos de acesso público)
        const [resCateg, resItens] = await Promise.all([
            fetch(`${BASE_URL}/api/cardapio/categorias/`),
            fetch(`${BASE_URL}/api/cardapio/itens/`)
        ]);

        const categoriasRaw: Categoria[]  = await resCateg.json();
        const todosItens: ItemCardapio[]  = await resItens.json();

        // Aplica a ordem desejada nas categorias
        const categorias = ordenarCategorias(categoriasRaw);

        // Clientes veem apenas itens disponíveis para pedido;
        // gerentes veem todos os itens para poder gerenciar os indisponíveis
        const itens = tipo === "gerente"
            ? todosItens
            : todosItens.filter(item => item.disponivel);

        divCarregando.classList.add("d-none");

        // Monta as abas: primeiro "Todas", depois uma aba por categoria
        const liTodas = document.createElement("li");
        liTodas.className = "nav-item";
        liTodas.innerHTML = `
            <button type="button" class="nav-link active"
                    data-cat="todas" role="tab" aria-selected="true">
              Todas
            </button>`;
        divAbas.appendChild(liTodas);

        for (const cat of categorias) {
            const li = document.createElement("li");
            li.className = "nav-item";
            li.innerHTML = `
                <button type="button" class="nav-link"
                        data-cat="${cat.id}" role="tab" aria-selected="false">
                  ${cat.nome}
                </button>`;
            divAbas.appendChild(li);
        }

        // Vincula os eventos de troca de aba a todos os botões recém-criados
        const botoesAba = divAbas.querySelectorAll<HTMLButtonElement>("button[data-cat]");
        botoesAba.forEach(btn => {
            btn.addEventListener("click", () => ativarAba(btn.dataset["cat"]!, botoesAba));
        });

        // Agrupa os itens por categoria respeitando a ordem já aplicada
        const itensPorCategoria = new Map<number, { nome: string; itens: ItemCardapio[] }>();
        for (const cat of categorias) {
            itensPorCategoria.set(cat.id, { nome: cat.nome, itens: [] });
        }
        for (const item of itens) {
            itensPorCategoria.get(item.categoria)?.itens.push(item);
        }

        // Verifica se há pelo menos um item a exibir
        if (itens.length === 0) {
            divLista.innerHTML = `
                <div class="card shadow-sm border-0">
                  <div class="card-body text-center py-5 text-muted">
                    <i class="bi bi-journal-x fs-2 d-block mb-2"></i>
                    Nenhum item encontrado.
                  </div>
                </div>`;
            return;
        }

        // Carrega o carrinho do localStorage para pré-preencher as quantidades nos steppers
        const carrinhoAtual = carregarCarrinho();

        // Renderiza uma seção por categoria com título e grade de cards
        // Todas as seções ficam visíveis na aba "Todas" (aba inicial)
        for (const [catId, { nome: catNome, itens: itensCategoria }] of itensPorCategoria) {
            if (itensCategoria.length === 0) continue;

            const secao = document.createElement("section");
            secao.className = "mb-5";
            secao.dataset["catId"] = String(catId);
            secao.innerHTML = `
                <h6 class="fw-semibold text-uppercase text-muted mb-3"
                    style="font-size: .7rem; letter-spacing: .07em;">
                  <i class="bi bi-tag me-1"></i>${catNome}
                </h6>
                <div class="row g-3"></div>`;

            const row = secao.querySelector(".row")!;

            for (const item of itensCategoria) {
                const col = document.createElement("div");
                col.className = "col-md-4 col-sm-6 fade-in";
                col.dataset["itemId"] = String(item.id);

                const precoBR = Number(item.preco).toFixed(2).replace(".", ",");

                if (tipo === "cliente") {
                    // Recupera a quantidade já no carrinho para pré-preencher o stepper
                    const qtdAtual    = carrinhoAtual.find(i => i.id === item.id)?.quantidade ?? 0;
                    const bordaEstilo = qtdAtual > 0
                        ? "border: 2px solid var(--vermelho)"
                        : "border: 1px solid rgba(0,0,0,.125)";

                    // Exibe a foto do item no topo do card, se disponível
                    const imgHtml = item.imagem
                        ? `<img src="${item.imagem}" class="card-img-top card-img-item"
                                alt="${item.nome}">`
                        : "";

                    col.innerHTML = `
                        <div class="card h-100 shadow-sm" style="${bordaEstilo}">
                          ${imgHtml}
                          <div class="card-body d-flex flex-column p-4">
                            <h6 class="card-title fw-semibold mb-1">${item.nome}</h6>
                            <p class="card-text text-muted small flex-grow-1 my-2">${item.descricao}</p>
                            <div class="d-flex justify-content-between align-items-center mt-auto">
                              <span class="fw-semibold" style="color: var(--vermelho)">R$ ${precoBR}</span>
                              <div class="d-flex align-items-center gap-1">
                                <button type="button" class="btn btn-sm btn-outline-secondary btn-menos"
                                        data-id="${item.id}"
                                        style="width:32px;padding:0;line-height:1.8">−</button>
                                <input type="number" min="0" value="${qtdAtual}"
                                       class="form-control form-control-sm text-center px-1"
                                       style="width:52px;"
                                       data-item-id="${item.id}"
                                       data-item-nome="${item.nome}"
                                       data-item-preco="${item.preco}" />
                                <button type="button" class="btn btn-sm btn-outline-secondary btn-mais"
                                        data-id="${item.id}"
                                        style="width:32px;padding:0;line-height:1.8">+</button>
                              </div>
                            </div>
                          </div>
                        </div>`;

                    row.appendChild(col);

                    // Vincula os eventos do stepper ao input recém-inserido no DOM
                    const input    = col.querySelector<HTMLInputElement>("input[data-item-id]")!;
                    const btnMais  = col.querySelector<HTMLButtonElement>(".btn-mais")!;
                    const btnMenos = col.querySelector<HTMLButtonElement>(".btn-menos")!;

                    btnMais.addEventListener("click", () => {
                        input.value = String(Math.max(0, Math.floor(Number(input.value) || 0)) + 1);
                        sincronizarQuantidade(input);
                    });

                    btnMenos.addEventListener("click", () => {
                        const qtd = Math.max(0, Math.floor(Number(input.value) || 0));
                        if (qtd > 0) { input.value = String(qtd - 1); sincronizarQuantidade(input); }
                    });

                    // Suporte a digitação direta no campo de quantidade
                    input.addEventListener("change", () => sincronizarQuantidade(input));

                } else {
                    // Visitantes, atendentes e gerentes: card sem stepper

                    // Gerente vê badge de disponibilidade em todos os itens
                    const badgeDisp = tipo === "gerente"
                        ? (item.disponivel
                            ? `<span class="badge text-bg-success ms-2 flex-shrink-0">Disponível</span>`
                            : `<span class="badge text-bg-secondary ms-2 flex-shrink-0">Indisponível</span>`)
                        : "";

                    // Botões de editar/excluir visíveis apenas para o gerente
                    const botoesGerente = tipo === "gerente"
                        ? `<div class="d-flex gap-1 mt-3 pt-3 border-top">
                             <a href="editar-item.html?id=${item.id}"
                                class="btn btn-sm btn-outline-secondary flex-grow-1">
                               <i class="bi bi-pencil me-1"></i>Editar
                             </a>
                             <button class="btn btn-sm btn-outline-danger btn-excluir-item"
                                     data-id="${item.id}" data-nome="${item.nome}"
                                     title="Excluir item">
                               <i class="bi bi-trash"></i>
                             </button>
                           </div>`
                        : "";

                    // Exibe a foto do item no topo do card, se disponível
                    const imgHtml = item.imagem
                        ? `<img src="${item.imagem}" class="card-img-top card-img-item"
                                alt="${item.nome}">`
                        : "";

                    col.innerHTML = `
                        <div class="card h-100 shadow-sm border-0">
                          ${imgHtml}
                          <div class="card-body d-flex flex-column p-4">
                            <div class="d-flex justify-content-between align-items-start mb-1">
                              <h6 class="card-title fw-semibold mb-0">${item.nome}</h6>
                              ${badgeDisp}
                            </div>
                            <p class="card-text text-muted small flex-grow-1 my-2">${item.descricao}</p>
                            <div class="d-flex justify-content-end align-items-center mt-auto">
                              <span class="fw-semibold" style="color: var(--vermelho)">R$ ${precoBR}</span>
                            </div>
                            ${botoesGerente}
                          </div>
                        </div>`;

                    row.appendChild(col);
                }
            }

            divLista.appendChild(secao);
        }

        // Vincula os botões de excluir ao modal de confirmação (apenas gerente)
        if (tipo === "gerente") {
            divLista.querySelectorAll<HTMLButtonElement>(".btn-excluir-item").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id   = btn.dataset["id"]!;
                    const nome = btn.dataset["nome"]!;
                    abrirModalExcluirItem(id, nome, btn);
                });
            });
        }

    } catch {
        divCarregando.classList.add("d-none");
        pErro.textContent = "Não foi possível carregar o cardápio. Verifique sua conexão com o servidor.";
    }
});
