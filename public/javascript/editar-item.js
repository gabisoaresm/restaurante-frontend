"use strict";
// Formulário para editar um item existente do cardápio (acesso restrito ao gerente)
document.addEventListener("DOMContentLoaded", async () => {
    // Extrai a primeira mensagem de erro de uma resposta de validação do DRF
    const extrairPrimeiroErro = (dados) => {
        if (typeof dados["erro"] === "string")
            return dados["erro"];
        for (const campo in dados) {
            const msgs = dados[campo];
            if (Array.isArray(msgs) && msgs.length > 0)
                return String(msgs[0]);
        }
        return "Erro ao salvar o item.";
    };
    // Verifica autenticação e perfil antes de carregar os dados
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }
    // Lê o id do item a partir do parâmetro de URL (ex.: editar-item.html?id=5)
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
        window.location.href = "cardapio.html";
        return;
    }
    const form = document.getElementById("form-item");
    const inputNome = document.getElementById("nome");
    const inputDesc = document.getElementById("descricao");
    const inputPreco = document.getElementById("preco");
    const selectCat = document.getElementById("categoria");
    const checkDisp = document.getElementById("disponivel");
    const subtitulo = document.getElementById("subtitulo");
    const pErro = document.getElementById("mensagem-erro");
    const btn = form.querySelector("button[type='submit']");
    // Remove destaque de erro ao redigitar em cada campo
    [inputNome, inputDesc, inputPreco].forEach(campo => {
        campo.addEventListener("input", () => {
            var _a;
            (_a = campo.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
        });
    });
    selectCat.addEventListener("change", () => {
        var _a;
        (_a = selectCat.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.remove("campo-invalido");
    });
    // Carrega categorias e dados do item em paralelo para pré-preencher o formulário
    try {
        // Busca categorias (acesso público) e dados do item (acesso público)
        const [resCateg, resItem] = await Promise.all([
            fetch(`${BASE_URL}/api/cardapio/categorias/`),
            fetch(`${BASE_URL}/api/cardapio/itens/${id}/`)
        ]);
        if (!resItem.ok) {
            pErro.textContent = "Item não encontrado.";
            return;
        }
        const categorias = await resCateg.json();
        const item = await resItem.json();
        // Popula o <select> com as categorias disponíveis, selecionando a do item atual
        for (const cat of categorias) {
            const opt = document.createElement("option");
            opt.value = String(cat.id);
            opt.textContent = cat.nome;
            if (cat.id === item.categoria)
                opt.selected = true;
            selectCat.appendChild(opt);
        }
        // Pré-preenche os demais campos com os valores atuais do item
        inputNome.value = item.nome;
        inputDesc.value = item.descricao;
        inputPreco.value = item.preco;
        checkDisp.checked = item.disponivel;
        subtitulo.textContent = item.nome;
    }
    catch (_a) {
        pErro.textContent = "Não foi possível carregar os dados do item.";
        return;
    }
    form.addEventListener("submit", async (evento) => {
        var _a, _b, _c, _d;
        evento.preventDefault();
        pErro.textContent = "";
        const nomeVal = inputNome.value.trim();
        const descVal = inputDesc.value.trim();
        const precoVal = inputPreco.value.trim();
        const catVal = selectCat.value;
        // Validação local: todos os campos obrigatórios
        let invalido = false;
        if (!nomeVal) {
            (_a = inputNome.closest(".campo")) === null || _a === void 0 ? void 0 : _a.classList.add("campo-invalido");
            invalido = true;
        }
        if (!descVal) {
            (_b = inputDesc.closest(".campo")) === null || _b === void 0 ? void 0 : _b.classList.add("campo-invalido");
            invalido = true;
        }
        if (!precoVal || Number(precoVal) < 0) {
            (_c = inputPreco.closest(".campo")) === null || _c === void 0 ? void 0 : _c.classList.add("campo-invalido");
            invalido = true;
        }
        if (!catVal) {
            (_d = selectCat.closest(".campo")) === null || _d === void 0 ? void 0 : _d.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) {
            pErro.textContent = "Preencha todos os campos obrigatórios.";
            return;
        }
        btn.disabled = true;
        btn.textContent = "Salvando…";
        try {
            // Envia PUT ao backend substituindo todos os campos do item
            // O backend exige todos os campos no PUT (não usa PATCH para itens)
            const res = await fetch(`${BASE_URL}/api/cardapio/itens/${id}/`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                },
                body: JSON.stringify({
                    nome: nomeVal,
                    descricao: descVal,
                    preco: precoVal,
                    categoria: Number(catVal),
                    disponivel: checkDisp.checked
                })
            });
            const dados = await res.json();
            if (res.ok) {
                // Redireciona para o cardápio após atualização bem-sucedida
                window.location.href = "cardapio.html";
            }
            else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem editar itens do cardápio.";
                btn.disabled = false;
                btn.textContent = "Salvar Alterações";
            }
            else {
                pErro.textContent = extrairPrimeiroErro(dados);
                btn.disabled = false;
                btn.textContent = "Salvar Alterações";
            }
        }
        catch (_e) {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled = false;
            btn.textContent = "Salvar Alterações";
        }
    });
});
