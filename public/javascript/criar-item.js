"use strict";
// Formulário para criar um novo item no cardápio (acesso restrito ao gerente)
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
    // Verifica autenticação e perfil antes de exibir o formulário
    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }
    const form = document.getElementById("form-item");
    const inputNome = document.getElementById("nome");
    const inputDesc = document.getElementById("descricao");
    const inputPreco = document.getElementById("preco");
    const selectCat = document.getElementById("categoria");
    const checkDisp = document.getElementById("disponivel");
    const inputImagem = document.getElementById("imagem");
    const pErro = document.getElementById("mensagem-erro");
    const btn = form.querySelector("button[type='submit']");
    const divPreview = document.getElementById("preview-imagem-nova");
    const imgPreview = document.getElementById("img-preview-nova");
    const contadorDesc = document.getElementById("contador-descricao");
    // Atualiza o contador de caracteres da descrição em tempo real
    const MAX_DESC = 300;
    function atualizarContadorDesc() {
        const atual = inputDesc.value.length;
        contadorDesc.textContent = `${atual} / ${MAX_DESC} caracteres`;
        contadorDesc.classList.toggle("text-danger", atual > MAX_DESC);
        contadorDesc.classList.toggle("text-muted", atual <= MAX_DESC);
    }
    inputDesc.addEventListener("input", atualizarContadorDesc);
    // Exibe a pré-visualização da imagem assim que o gerente seleciona o arquivo
    inputImagem.addEventListener("change", () => {
        if (inputImagem.files && inputImagem.files.length > 0) {
            // createObjectURL cria uma URL temporária local — sem upload, sem servidor
            imgPreview.src = URL.createObjectURL(inputImagem.files[0]);
            divPreview.classList.remove("d-none");
        }
        else {
            divPreview.classList.add("d-none");
            imgPreview.src = "";
        }
    });
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
    // Popula o <select> de categorias com as opções cadastradas no backend
    try {
        // Busca categorias para preencher o seletor (acesso público)
        const res = await fetch(`${BASE_URL}/api/cardapio/categorias/`);
        const categorias = await res.json();
        for (const cat of categorias) {
            const opt = document.createElement("option");
            opt.value = String(cat.id);
            opt.textContent = cat.nome;
            selectCat.appendChild(opt);
        }
    }
    catch (_a) {
        pErro.textContent = "Não foi possível carregar as categorias.";
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
        if (!descVal || descVal.length > MAX_DESC) {
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
            pErro.textContent = descVal.length > MAX_DESC
                ? `A descrição não pode ultrapassar ${MAX_DESC} caracteres.`
                : "Preencha todos os campos obrigatórios.";
            return;
        }
        btn.disabled = true;
        btn.textContent = "Salvando…";
        // Monta FormData para suportar upload de imagem via multipart/form-data.
        // Não definir Content-Type manualmente — o browser insere o boundary correto.
        const formData = new FormData();
        formData.append("nome", nomeVal);
        formData.append("descricao", descVal);
        formData.append("preco", precoVal);
        formData.append("categoria", catVal);
        formData.append("disponivel", checkDisp.checked ? "true" : "false");
        // Só adiciona imagem ao FormData se o gerente selecionou um arquivo
        if (inputImagem.files && inputImagem.files.length > 0) {
            formData.append("imagem", inputImagem.files[0]);
        }
        try {
            // Envia POST ao backend como multipart/form-data com token de gerente
            const res = await fetch(`${BASE_URL}/api/cardapio/itens/`, {
                method: "POST",
                headers: {
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                    // Content-Type omitido intencionalmente — o browser define multipart/form-data + boundary
                },
                body: formData
            });
            const dados = await res.json();
            if (res.ok) {
                // Redireciona para o cardápio após criação bem-sucedida
                window.location.href = "cardapio.html";
            }
            else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem criar itens no cardápio.";
                btn.disabled = false;
                btn.textContent = "Criar Item";
            }
            else {
                // Exibe o primeiro erro de validação retornado pelo backend
                pErro.textContent = extrairPrimeiroErro(dados);
                btn.disabled = false;
                btn.textContent = "Criar Item";
            }
        }
        catch (_e) {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled = false;
            btn.textContent = "Criar Item";
        }
    });
});
