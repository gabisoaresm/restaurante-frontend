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

    let modalCartaoConfigurado = false;
    let cartaoExclusaoPendente: { id: number; apelido: string; col: HTMLElement } | null = null;

    // HTML do modal de confirmação — Bootstrap CSS only (sem bootstrap.bundle.js)
    function htmlModalRemoverCartao(): string {
        return `
        <div class="modal fade" id="modal-remover-cartao" tabindex="-1"
             aria-labelledby="modal-remover-cartao-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-sm border-0">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-semibold" id="modal-remover-cartao-titulo">Excluir cartão</h5>
                        <button type="button" class="btn-close" id="btn-fechar-modal-remover-cartao"
                                aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body pt-3">
                        <p class="text-muted text-center mb-0">
                            Deseja remover o cartão
                            <strong id="modal-remover-cartao-apelido"></strong>?
                            Esta ação não pode ser desfeita.
                        </p>
                    </div>
                    <div class="modal-footer border-0 pt-0 gap-2">
                        <button type="button" class="btn btn-outline-secondary" id="btn-cancelar-remover-cartao">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="btn-confirmar-remover-cartao">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop fade" id="backdrop-modal-remover-cartao"></div>`;
    }

    function fecharModalRemoverCartao(): void {
        const modal    = document.getElementById("modal-remover-cartao");
        const backdrop = document.getElementById("backdrop-modal-remover-cartao");
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
        const btnConfirmar = document.getElementById("btn-confirmar-remover-cartao") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        cartaoExclusaoPendente = null;
    }

    function abrirModalRemoverCartao(id: number, apelido: string, col: HTMLElement): void {
        if (!document.getElementById("modal-remover-cartao")) {
            document.body.insertAdjacentHTML("beforeend", htmlModalRemoverCartao());
            configurarEventosModalCartao();
        }
        cartaoExclusaoPendente = { id, apelido, col };
        const span = document.getElementById("modal-remover-cartao-apelido");
        if (span) span.textContent = apelido;
        const btnConfirmar = document.getElementById("btn-confirmar-remover-cartao") as HTMLButtonElement | null;
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = "Excluir"; }
        const modal    = document.getElementById("modal-remover-cartao");
        const backdrop = document.getElementById("backdrop-modal-remover-cartao");
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

    // Remove o cartão via DELETE na API após confirmação no modal
    async function executarRemocaoCartao(): Promise<void> {
        if (!cartaoExclusaoPendente) return;
        const { id } = cartaoExclusaoPendente;
        const btnConfirmar = document.getElementById("btn-confirmar-remover-cartao") as HTMLButtonElement;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Excluindo…`;
        try {
            // Envia DELETE ao backend para remover o cartão do cliente
            const res = await fetch(`${BASE_URL}/api/accounts/cartoes/${id}/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
            if (res.status === 204) {
                const colRemovida = cartaoExclusaoPendente!.col;
                fecharModalRemoverCartao();
                // Remove o card do DOM diretamente — sem recarregar a página
                colRemovida.remove();
                // Se não houver mais cartões, exibe o estado vazio
                if (divLista.querySelectorAll(".col-12").length === 0) {
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
                }
            } else {
                pErro.textContent = "Não foi possível remover o cartão.";
                fecharModalRemoverCartao();
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            fecharModalRemoverCartao();
        }
    }

    function configurarEventosModalCartao(): void {
        if (modalCartaoConfigurado) return;
        modalCartaoConfigurado = true;
        document.getElementById("btn-cancelar-remover-cartao")?.addEventListener("click", fecharModalRemoverCartao);
        document.getElementById("btn-fechar-modal-remover-cartao")?.addEventListener("click", fecharModalRemoverCartao);
        document.getElementById("backdrop-modal-remover-cartao")?.addEventListener("click", fecharModalRemoverCartao);
        document.getElementById("btn-confirmar-remover-cartao")?.addEventListener("click", () => { void executarRemocaoCartao(); });
        document.addEventListener("keydown", (evento: KeyboardEvent) => {
            if (evento.key !== "Escape") return;
            const modal = document.getElementById("modal-remover-cartao");
            if (modal?.classList.contains("show")) fecharModalRemoverCartao();
        });
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
                        <i class="bi bi-trash me-1"></i>Excluir
                      </button>
                    </div>

                  </div>
                </div>`;

            // Vincula o botão de exclusão ao modal de confirmação, passando o col para remoção sem reload
            col.querySelector(".btn-excluir")!.addEventListener("click", (e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                abrirModalRemoverCartao(Number(btn.dataset.id), btn.dataset.apelido ?? "", col);
            });

            divLista.appendChild(col);
        }

    } catch {
        divCarregando.classList.add("d-none");
        pErro.textContent = "Não foi possível conectar ao servidor.";
    }
});
