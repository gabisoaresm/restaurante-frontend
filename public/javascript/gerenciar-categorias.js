"use strict";
// Lista as categorias do cardápio para o gerente, com opções de editar e excluir
// Verifica se o usuário logado é gerente; redireciona se não for
async function verificarAcessoGerente() {
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
                const dados = await res.json();
                tipo = dados.tipo;
                localStorage.setItem("tipo", tipo);
            }
        }
        catch (_a) {
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
    if (!autorizado)
        return;
    const token = localStorage.getItem("token");
    const divCarregando = document.getElementById("carregando");
    const divLista = document.getElementById("lista-categorias");
    const pErro = document.getElementById("mensagem-erro");
    // Carrega e renderiza a lista de categorias cadastradas
    async function carregarCategorias() {
        divCarregando.classList.remove("d-none");
        divLista.innerHTML = "";
        pErro.textContent = "";
        try {
            // Busca todas as categorias — acesso público, mas esta página é restrita ao gerente
            const res = await fetch(`${BASE_URL}/api/cardapio/categorias/`);
            const categorias = await res.json();
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
            // Vincula os botões de excluir após renderizar a lista
            divLista.querySelectorAll(".btn-excluir-cat").forEach(btn => {
                btn.addEventListener("click", async () => {
                    var _a;
                    const id = btn.dataset["id"];
                    const nome = btn.dataset["nome"];
                    if (!confirm(`Excluir a categoria "${nome}"?\nTodos os itens desta categoria também serão removidos.`))
                        return;
                    // Envia DELETE ao backend para remover a categoria (e seus itens em cascata)
                    try {
                        const res = await fetch(`${BASE_URL}/api/cardapio/categorias/${id}/`, {
                            method: "DELETE",
                            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
                        });
                        if (res.status === 204) {
                            // Recarrega a lista após exclusão bem-sucedida
                            await carregarCategorias();
                        }
                        else if (res.status === 403) {
                            pErro.textContent = "Apenas gerentes podem excluir categorias.";
                        }
                        else {
                            const dados = await res.json();
                            pErro.textContent = String((_a = dados["erro"]) !== null && _a !== void 0 ? _a : "Erro ao excluir a categoria.");
                        }
                    }
                    catch (_b) {
                        pErro.textContent = "Não foi possível conectar ao servidor.";
                    }
                });
            });
        }
        catch (_a) {
            divCarregando.classList.add("d-none");
            pErro.textContent = "Não foi possível carregar as categorias.";
        }
    }
    await carregarCategorias();
});
