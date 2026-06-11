"use strict";
// Formulário para editar uma categoria existente do cardápio (acesso restrito ao gerente)
document.addEventListener("DOMContentLoaded", async () => {
    // Verifica autenticação e perfil antes de carregar os dados
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }
    // Lê o id da categoria a partir do parâmetro de URL (ex.: editar-categoria.html?id=3)
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
        window.location.href = "gerenciar-categorias.html";
        return;
    }
    const form = document.getElementById("form-categoria");
    const inputNome = document.getElementById("nome");
    const subtitulo = document.getElementById("subtitulo");
    const pErro = document.getElementById("mensagem-erro");
    const btn = form.querySelector("button[type='submit']");
    // Remove destaque de erro ao redigitar
    inputNome.addEventListener("input", () => {
        var _a;
        (_a = inputNome.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
    });
    // Pré-preenche o formulário com os dados atuais da categoria
    try {
        // Busca os dados da categoria pelo id (acesso público)
        const res = await fetch(`${BASE_URL}/api/cardapio/categorias/${id}/`);
        if (!res.ok) {
            pErro.textContent = "Categoria não encontrada.";
            return;
        }
        const cat = await res.json();
        inputNome.value = cat.nome;
        subtitulo.textContent = cat.nome;
    }
    catch (_a) {
        pErro.textContent = "Não foi possível carregar os dados da categoria.";
        return;
    }
    form.addEventListener("submit", async (evento) => {
        var _a, _b;
        evento.preventDefault();
        pErro.textContent = "";
        const nomeVal = inputNome.value.trim();
        // Validação local: campo obrigatório
        if (!nomeVal) {
            (_a = inputNome.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            pErro.textContent = "Informe o nome da categoria.";
            return;
        }
        btn.disabled = true;
        btn.textContent = "Salvando…";
        try {
            // Envia PUT ao backend para substituir todos os campos da categoria
            const res = await fetch(`${BASE_URL}/api/cardapio/categorias/${id}/`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                },
                body: JSON.stringify({ nome: nomeVal })
            });
            const dados = await res.json();
            if (res.ok) {
                // Redireciona para a lista após atualização bem-sucedida
                window.location.href = "gerenciar-categorias.html";
            }
            else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem editar categorias.";
                btn.disabled = false;
                btn.textContent = "Salvar Alterações";
            }
            else {
                pErro.textContent = String(dados["nome"] ? dados["nome"][0] : (_b = dados["erro"]) !== null && _b !== void 0 ? _b : "Erro ao salvar a categoria.");
                btn.disabled = false;
                btn.textContent = "Salvar Alterações";
            }
        }
        catch (_c) {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled = false;
            btn.textContent = "Salvar Alterações";
        }
    });
});
