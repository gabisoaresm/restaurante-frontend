"use strict";
// Formulário para criar uma nova categoria no cardápio (acesso restrito ao gerente)
document.addEventListener("DOMContentLoaded", async () => {
    // Verifica autenticação e perfil antes de exibir o formulário
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }
    // Referências ao formulário e elementos de feedback
    const form = document.getElementById("form-categoria");
    const nome = document.getElementById("nome");
    const pErro = document.getElementById("mensagem-erro");
    const btn = form.querySelector("button[type='submit']");
    // Remove destaque de erro ao redigitar no campo
    nome.addEventListener("input", () => {
        var _a;
        (_a = nome.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
    });
    form.addEventListener("submit", async (evento) => {
        var _a, _b;
        evento.preventDefault();
        pErro.textContent = "";
        const nomeVal = nome.value.trim();
        // Validação local: nome não pode estar vazio
        if (!nomeVal) {
            (_a = nome.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            pErro.textContent = "Informe o nome da categoria.";
            return;
        }
        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled = true;
        btn.textContent = "Salvando…";
        try {
            // Envia POST ao backend para criar a categoria com token de gerente
            const res = await fetch(`${BASE_URL}/api/cardapio/categorias/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                },
                body: JSON.stringify({ nome: nomeVal })
            });
            const dados = await res.json();
            if (res.ok) {
                // Redireciona para a lista após criação bem-sucedida
                window.location.href = "gerenciar-categorias.html";
            }
            else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem criar categorias.";
                btn.disabled = false;
                btn.textContent = "Criar Categoria";
            }
            else {
                // Exibe o primeiro erro retornado pelo backend (validação ou outro)
                pErro.textContent = String(dados["nome"] ? dados["nome"][0] : (_b = dados["erro"]) !== null && _b !== void 0 ? _b : "Erro ao criar a categoria.");
                btn.disabled = false;
                btn.textContent = "Criar Categoria";
            }
        }
        catch (_c) {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled = false;
            btn.textContent = "Criar Categoria";
        }
    });
});
