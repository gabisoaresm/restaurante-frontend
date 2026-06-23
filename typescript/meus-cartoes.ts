// Lista os cartões salvos do cliente com opção de exclusão

interface CartaoSalvo {
    id: number;
    apelido: string;
    nome_titular: string;
    numero_mascarado: string;
    bandeira: "visa" | "mastercard" | "elo" | "amex";
    tipo: "credito" | "debito";
    validade: string;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Somente clientes autenticados podem gerenciar cartões
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "cliente") {
        window.location.href = "index.html";
        return;
    }

    const divCarregando = document.getElementById("carregando") as HTMLDivElement;
    const divLista      = document.getElementById("lista-cartoes") as HTMLDivElement;
    const pErro         = document.getElementById("mensagem-erro") as HTMLParagraphElement;

    // Retorna as classes de badge Bootstrap para cada bandeira de cartão
    function classeBandeira(bandeira: string): string {
        const mapa: Record<string, string> = {
            visa:       "bg-primary-subtle text-primary-emphasis",
            mastercard: "bg-danger-subtle text-danger-emphasis",
            elo:        "bg-warning-subtle text-warning-emphasis",
            amex:       "bg-success-subtle text-success-emphasis",
        };
        return mapa[bandeira] ?? "bg-secondary-subtle text-secondary-emphasis";
    }

    // Retorna o rótulo legível da bandeira
    function rotuloBandeira(bandeira: string): string {
        const mapa: Record<string, string> = {
            visa: "Visa", mastercard: "Mastercard", elo: "Elo", amex: "American Express",
        };
        return mapa[bandeira] ?? bandeira;
    }

    // Retorna o rótulo legível do tipo
    function rotuloTipo(tipo: string): string {
        return tipo === "credito" ? "Crédito" : "Débito";
    }

    // Exclui um cartão após confirmação e recarrega a lista
    async function excluirCartao(id: number, apelido: string): Promise<void> {
        if (!confirm(`Remover o cartão "${apelido}"?`)) return;

        try {
            // Envia DELETE ao backend para remover o cartão do cliente
            const res = await fetch(`${BASE_URL}/api/accounts/cartoes/${id}/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });

            if (res.status === 204) {
                // Recarrega a página para atualizar a lista após a exclusão
                window.location.reload();
            } else {
                pErro.textContent = "Não foi possível remover o cartão.";
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
        }
    }

    try {
        // Busca os cartões salvos do cliente autenticado
        const res = await fetch(`${BASE_URL}/api/accounts/cartoes/`, {
            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
        });

        divCarregando.classList.add("d-none");

        if (!res.ok) {
            pErro.textContent = "Não foi possível carregar os cartões.";
            return;
        }

        const cartoes: CartaoSalvo[] = await res.json();

        // Exibe estado vazio quando o cliente não tem cartões cadastrados
        if (cartoes.length === 0) {
            divLista.innerHTML = `
                <div class="col-12">
                  <div class="card shadow-sm border-0">
                    <div class="card-body text-center py-5">
                      <i class="bi bi-credit-card fs-2 text-muted d-block mb-3"></i>
                      <p class="fw-semibold mb-1">Você ainda não tem cartões salvos.</p>
                      <p class="text-muted small mb-3">Adicione um cartão para agilizar seus pagamentos.</p>
                      <a href="adicionar-cartao.html" class="btn btn-danger">
                        <i class="bi bi-plus-lg me-1"></i>Adicionar Cartão
                      </a>
                    </div>
                  </div>
                </div>`;
            return;
        }

        // Renderiza um card por cartão salvo
        for (const cartao of cartoes) {
            const col = document.createElement("div");
            col.className = "col-12 col-md-6 col-lg-4 fade-in";
            col.innerHTML = `
                <div class="card h-100 shadow-sm border-0">
                  <div class="card-body p-4 d-flex flex-column">

                    <!-- Apelido e número mascarado -->
                    <h6 class="fw-semibold mb-1">${cartao.apelido}</h6>
                    <p class="text-muted small mb-3">${cartao.numero_mascarado}</p>

                    <!-- Bandeira e tipo -->
                    <div class="mb-3 d-flex gap-2 flex-wrap">
                      <span class="badge fw-normal ${classeBandeira(cartao.bandeira)}">
                        ${rotuloBandeira(cartao.bandeira)}
                      </span>
                      <span class="badge fw-normal bg-secondary-subtle text-secondary-emphasis">
                        ${rotuloTipo(cartao.tipo)}
                      </span>
                    </div>

                    <!-- Titular e validade -->
                    <dl class="row mb-0 small flex-grow-1">
                      <dt class="col-5 text-muted fw-normal">Titular</dt>
                      <dd class="col-7 mb-1">${cartao.nome_titular}</dd>
                      <dt class="col-5 text-muted fw-normal">Validade</dt>
                      <dd class="col-7 mb-0">${cartao.validade}</dd>
                    </dl>

                    <!-- Ação de exclusão -->
                    <div class="mt-3 pt-3 border-top">
                      <button class="btn btn-outline-danger btn-sm btn-excluir"
                              data-id="${cartao.id}" data-apelido="${cartao.apelido}">
                        <i class="bi bi-trash me-1"></i>Remover
                      </button>
                    </div>

                  </div>
                </div>`;

            // Vincula o botão de exclusão ao handler
            col.querySelector(".btn-excluir")!.addEventListener("click", (e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                void excluirCartao(Number(btn.dataset.id), btn.dataset.apelido ?? "");
            });

            divLista.appendChild(col);
        }

    } catch {
        divCarregando.classList.add("d-none");
        pErro.textContent = "Não foi possível conectar ao servidor.";
    }
});
