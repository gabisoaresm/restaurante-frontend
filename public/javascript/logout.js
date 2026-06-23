"use strict";
// Indica se os listeners do modal de logout já foram registrados
let modalLogoutConfigurado = false;
// Realiza logout: invalida o token no backend e limpa o armazenamento local
async function realizarLogout() {
    const token = localStorage.getItem("token");
    // Chama o backend para invalidar o token, mesmo que o localStorage já esteja vazio
    if (token) {
        try {
            await fetch(`${BASE_URL}/api/accounts/token-auth/`, {
                method: "DELETE",
                headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
            });
        }
        catch (_a) {
            // Falha de rede: prossegue com o logout local mesmo sem confirmar no backend
        }
    }
    // Remove todos os dados da sessão do armazenamento local,
    // incluindo o carrinho para não vazar dados entre usuários diferentes
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("tipo");
    localStorage.removeItem("carrinho");
    localStorage.removeItem("carrinho_observacoes");
    // Redireciona para a página de login após o logout
    window.location.href = "login.html";
}
// HTML do modal de confirmação — Bootstrap CSS only (sem bootstrap.bundle.js)
function htmlModalLogout() {
    return `
        <div class="modal fade" id="modal-logout" tabindex="-1" aria-labelledby="modal-logout-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-sm border-0">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-semibold" id="modal-logout-titulo">Confirmar saída</h5>
                        <button type="button" class="btn-close" id="btn-fechar-modal-logout" aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body pt-3">
                        <div class="text-center mb-3">
                            <i class="bi bi-box-arrow-right fs-1" style="color: var(--vermelho)"></i>
                        </div>
                        <p class="text-muted text-center mb-0">Deseja realmente sair da sua conta?</p>
                    </div>
                    <div class="modal-footer border-0 pt-0 gap-2">
                        <button type="button" class="btn btn-outline-secondary" id="btn-cancelar-logout">Cancelar</button>
                        <button type="button" class="btn btn-danger" id="btn-confirmar-logout">
                            <i class="bi bi-box-arrow-right me-1"></i>Sair
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop fade" id="backdrop-modal-logout"></div>`;
}
// Fecha o modal de confirmação de logout
function fecharModalLogout() {
    const modal = document.getElementById("modal-logout");
    const backdrop = document.getElementById("backdrop-modal-logout");
    if (!modal || !backdrop)
        return;
    modal.classList.remove("show");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    modal.removeAttribute("aria-modal");
    backdrop.classList.remove("show");
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
}
// Exibe o modal de confirmação de logout
function abrirModalLogout() {
    if (!document.getElementById("modal-logout")) {
        document.body.insertAdjacentHTML("beforeend", htmlModalLogout());
        configurarEventosModalLogout();
    }
    const modal = document.getElementById("modal-logout");
    const backdrop = document.getElementById("backdrop-modal-logout");
    if (!modal || !backdrop)
        return;
    modal.classList.add("show");
    modal.style.display = "block";
    modal.setAttribute("aria-modal", "true");
    modal.removeAttribute("aria-hidden");
    backdrop.classList.add("show");
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
}
// Vincula os botões do modal de logout (executado uma única vez)
function configurarEventosModalLogout() {
    var _a, _b, _c;
    if (modalLogoutConfigurado)
        return;
    modalLogoutConfigurado = true;
    (_a = document.getElementById("btn-cancelar-logout")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", fecharModalLogout);
    (_b = document.getElementById("btn-fechar-modal-logout")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", fecharModalLogout);
    (_c = document.getElementById("backdrop-modal-logout")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", fecharModalLogout);
    const btnConfirmar = document.getElementById("btn-confirmar-logout");
    btnConfirmar === null || btnConfirmar === void 0 ? void 0 : btnConfirmar.addEventListener("click", () => {
        if (!btnConfirmar)
            return;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<i class="bi bi-box-arrow-right me-1"></i>Saindo…`;
        void realizarLogout();
    });
    // Fecha o modal ao pressionar Escape
    document.addEventListener("keydown", (evento) => {
        if (evento.key !== "Escape")
            return;
        const modal = document.getElementById("modal-logout");
        if (modal === null || modal === void 0 ? void 0 : modal.classList.contains("show")) {
            fecharModalLogout();
        }
    });
}
// Abre o modal de confirmação antes de encerrar a sessão
function solicitarLogout() {
    abrirModalLogout();
}
