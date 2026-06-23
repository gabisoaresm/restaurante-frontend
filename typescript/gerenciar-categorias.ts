// Lista as categorias do cardápio para o gerente, com opções de editar e excluir

// Verifica se o usuário logado é gerente; redireciona se não for
async function verificarAcessoGerente(): Promise<boolean> {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    let tipo = localStorage.getItem("tipo");

    // Se o tipo ainda não está em cache (primeira visita após login), busca via /me/
    if (!tipo) {
        try {
            const res = await fetch(`${BASE_URL}/api/accounts/me/`, {
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
            if (res.ok) {
                const dados = await res.json() as { tipo: string };
                tipo = dados.tipo;
                localStorage.setItem("tipo", tipo);
            }
        } catch {
            // Falha de rede — nega o acesso por segurança
        }
    }

    if (tipo !== "gerente") {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Bloqueia o acesso a não-gerentes antes de carregar qualquer dado
    const autorizado = await verificarAcessoGerente();
    if (!autorizado) return;

    const token         = localStorage.getItem("token")!;
    const divCarregando = document.getElementById("carregando") as HTMLDivElement;
    const divLista      = document.getElementById("lista-categorias") as HTMLDivElement;
    const pErro         = document.getElementById("mensagem-erro") as HTMLParagraphElement;

    let modalCategoriaConfigurado = false;
    let categoriaExclusaoPendente: { id: string; nome: string; btn: HTMLButtonElement } | null = null;

    // HTML do modal de confirmação — Bootstrap CSS only (sem bootstrap.bundle.js)
    function htmlModalExcluirCategoria(): string {
        return `
        <div class="modal fade" id="modal-excluir-categoria" tabindex="-1"
             aria-labelledby="modal-excluir-categoria-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-sm border-0">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-semibold" id="modal-excluir-categoria-titulo">Excluir categoria</h5>
                        <button type="button" class="btn-close" id="btn-fechar-modal-excluir-categoria"
                                aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body pt-3">
                        <p class="text-muted text-center mb-1">
                            Deseja excluir a categoria
                            <strong id="modal-excluir-categoria-nome"></strong>?
                        </p>
                        <p class="text-muted text-center small mb-0">
                            Todos os itens desta categoria também serão removidos. Esta ação não pode ser desfeita.
                        </p>
                    </div>
                    <div class="modal-footer border-0 pt-0 gap-2">
                        <button type="button" class="btn btn-outline-secondary" id="btn-cancelar-excluir-categoria">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="btn-confirmar-excluir-categoria">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop fade" id="backdrop-modal-excluir-categoria"></div>`;
    }

    function fecharModalExcluirCategoria(): void {
        const modal    = document.getElementById("modal-excluir-categoria");
        const backdrop = document.getElementById("backdrop-modal-excluir-categoria");
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
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-categoria") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        categoriaExclusaoPendente = null;
    }

    function abrirModalExcluirCategoria(id: string, nome: string, btn: HTMLButtonElement): void {
        if (!document.getElementById("modal-excluir-categoria")) {
            document.body.insertAdjacentHTML("beforeend", htmlModalExcluirCategoria());
            configurarEventosModalCategoria();
        }
        categoriaExclusaoPendente = { id, nome, btn };
        const span = document.getElementById("modal-excluir-categoria-nome");
        if (span) span.textContent = nome;
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-categoria") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        const modal    = document.getElementById("modal-excluir-categoria");
        const backdrop = document.getElementById("backdrop-modal-excluir-categoria");
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

    // Remove a categoria via DELETE na API após confirmação no modal
    async function executarExclusaoCategoria(): Promise<void> {
        if (!categoriaExclusaoPendente) return;
        const { id, btn } = categoriaExclusaoPendente;
        const btnConfirmar = document.getElementById("btn-confirmar-excluir-categoria") as HTMLButtonElement;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Excluindo…`;
        btn.disabled = true;
        try {
            // Envia DELETE ao backend para remover a categoria (e seus itens em cascata)
            const res = await fetch(`${BASE_URL}/api/cardapio/categorias/${id}/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
            if (res.status === 204) {
                fecharModalExcluirCategoria();
                // Recarrega a lista após exclusão bem-sucedida
                await carregarCategorias();
            } else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem excluir categorias.";
                fecharModalExcluirCategoria();
                btn.disabled = false;
            } else {
                const dados = await res.json() as Record<string, unknown>;
                pErro.textContent = String(dados["erro"] ?? "Erro ao excluir a categoria.");
                fecharModalExcluirCategoria();
                btn.disabled = false;
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            fecharModalExcluirCategoria();
            btn.disabled = false;
        }
    }

    function configurarEventosModalCategoria(): void {
        if (modalCategoriaConfigurado) return;
        modalCategoriaConfigurado = true;
        document.getElementById("btn-cancelar-excluir-categoria")?.addEventListener("click", fecharModalExcluirCategoria);
        document.getElementById("btn-fechar-modal-excluir-categoria")?.addEventListener("click", fecharModalExcluirCategoria);
        document.getElementById("backdrop-modal-excluir-categoria")?.addEventListener("click", fecharModalExcluirCategoria);
        document.getElementById("btn-confirmar-excluir-categoria")?.addEventListener("click", () => { void executarExclusaoCategoria(); });
        document.addEventListener("keydown", (evento: KeyboardEvent) => {
            if (evento.key !== "Escape") return;
            const modal = document.getElementById("modal-excluir-categoria");
            if (modal?.classList.contains("show")) fecharModalExcluirCategoria();
        });
    }

    // Carrega e renderiza a lista de categorias cadastradas
    async function carregarCategorias(): Promise<void> {
        divCarregando.classList.remove("d-none");
        divLista.innerHTML = "";
        pErro.textContent  = "";

        try {
            // Busca todas as categorias — acesso público, mas esta página é restrita ao gerente
            const res = await fetch(`${BASE_URL}/api/cardapio/categorias/`);
            const categorias: Array<{ id: number; nome: string }> = await res.json();

            divCarregando.classList.add("d-none");

            if (categorias.length === 0) {
                divLista.innerHTML = `
                    <div class="card shadow-sm border-0">
                      <div class="card-body text-center py-5">
                        <i class="bi bi-tags fs-1 text-muted d-block mb-3"></i>
                        <p class="text-muted mb-3">Nenhuma categoria cadastrada ainda.</p>
                        <a href="criar-categoria.html" class="btn btn-danger">
                          <i class="bi bi-plus-lg me-1"></i>Criar primeira categoria
                        </a>
                      </div>
                    </div>`;
                return;
            }

            // Renderiza como lista dentro de um card (padrão do Trab1: listaCategoria.html)
            const card = document.createElement("div");
            card.className = "card shadow-sm border-0";

            const ul = document.createElement("ul");
            ul.className = "list-group list-group-flush";

            for (const cat of categorias) {
                const li = document.createElement("li");
                li.className = "list-group-item d-flex align-items-center gap-3 px-4 py-3";
                li.innerHTML = `
                    <i class="bi bi-tag fs-5" style="color: var(--vermelho)"></i>
                    <span class="fw-semibold flex-grow-1">${cat.nome}</span>
                    <div class="d-flex gap-2">
                      <a href="editar-categoria.html?id=${cat.id}"
                         class="btn btn-sm btn-outline-secondary" title="Editar">
                        <i class="bi bi-pencil"></i>
                      </a>
                      <button class="btn btn-sm btn-outline-danger btn-excluir-cat"
                              data-id="${cat.id}" data-nome="${cat.nome}" title="Excluir">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>`;
                ul.appendChild(li);
            }

            card.appendChild(ul);
            divLista.appendChild(card);

            // Vincula os botões de excluir ao modal de confirmação
            divLista.querySelectorAll<HTMLButtonElement>(".btn-excluir-cat").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id   = btn.dataset["id"]!;
                    const nome = btn.dataset["nome"]!;
                    abrirModalExcluirCategoria(id, nome, btn);
                });
            });

        } catch {
            divCarregando.classList.add("d-none");
            pErro.textContent = "Não foi possível carregar as categorias.";
        }
    }

    await carregarCategorias();
});
