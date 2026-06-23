// Formulário para criar um novo item no cardápio (acesso restrito ao gerente)
document.addEventListener("DOMContentLoaded", async () => {

    // Extrai a primeira mensagem de erro de uma resposta de validação do DRF
    const extrairPrimeiroErro = (dados: Record<string, unknown>): string => {
        if (typeof dados["erro"] === "string") return dados["erro"];
        for (const campo in dados) {
            const msgs = dados[campo];
            if (Array.isArray(msgs) && msgs.length > 0) return String(msgs[0]);
        }
        return "Erro ao salvar o item.";
    };

    // Verifica autenticação e perfil antes de exibir o formulário
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }

    const form        = document.getElementById("form-item") as HTMLFormElement;
    const inputNome   = document.getElementById("nome") as HTMLInputElement;
    const inputDesc   = document.getElementById("descricao") as HTMLTextAreaElement;
    const inputPreco  = document.getElementById("preco") as HTMLInputElement;
    const selectCat   = document.getElementById("categoria") as HTMLSelectElement;
    const checkDisp   = document.getElementById("disponivel") as HTMLInputElement;
    const inputImagem = document.getElementById("imagem") as HTMLInputElement;
    const pErro       = document.getElementById("mensagem-erro") as HTMLParagraphElement;
    const btn         = form.querySelector("button[type='submit']") as HTMLButtonElement;

    // Remove destaque de erro ao redigitar em cada campo
    [inputNome, inputDesc, inputPreco].forEach(campo => {
        campo.addEventListener("input", () => {
            campo.closest(".campo")?.classList.remove("campo-invalido");
        });
    });
    selectCat.addEventListener("change", () => {
        selectCat.closest(".campo")?.classList.remove("campo-invalido");
    });

    // Popula o <select> de categorias com as opções cadastradas no backend
    try {
        // Busca categorias para preencher o seletor (acesso público)
        const res = await fetch(`${BASE_URL}/api/cardapio/categorias/`);
        const categorias: Array<{ id: number; nome: string }> = await res.json();

        for (const cat of categorias) {
            const opt = document.createElement("option");
            opt.value       = String(cat.id);
            opt.textContent = cat.nome;
            selectCat.appendChild(opt);
        }
    } catch {
        pErro.textContent = "Não foi possível carregar as categorias.";
    }

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        pErro.textContent = "";

        const nomeVal  = inputNome.value.trim();
        const descVal  = inputDesc.value.trim();
        const precoVal = inputPreco.value.trim();
        const catVal   = selectCat.value;

        // Validação local: todos os campos obrigatórios
        let invalido = false;
        if (!nomeVal)  { inputNome.closest(".campo")?.classList.add("campo-invalido");  invalido = true; }
        if (!descVal)  { inputDesc.closest(".campo")?.classList.add("campo-invalido");  invalido = true; }
        if (!precoVal || Number(precoVal) < 0) {
            inputPreco.closest(".campo")?.classList.add("campo-invalido");
            invalido = true;
        }
        if (!catVal) {
            selectCat.closest(".campo")?.classList.add("campo-invalido");
            invalido = true;
        }
        if (invalido) { pErro.textContent = "Preencha todos os campos obrigatórios."; return; }

        btn.disabled    = true;
        btn.textContent = "Salvando…";

        // Monta FormData para suportar upload de imagem via multipart/form-data.
        // Não definir Content-Type manualmente — o browser insere o boundary correto.
        const formData = new FormData();
        formData.append("nome",       nomeVal);
        formData.append("descricao",  descVal);
        formData.append("preco",      precoVal);
        formData.append("categoria",  catVal);
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

            const dados = await res.json() as Record<string, unknown>;

            if (res.ok) {
                // Redireciona para o cardápio após criação bem-sucedida
                window.location.href = "cardapio.html";
            } else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem criar itens no cardápio.";
                btn.disabled    = false;
                btn.textContent = "Criar Item";
            } else {
                // Exibe o primeiro erro de validação retornado pelo backend
                pErro.textContent = extrairPrimeiroErro(dados);
                btn.disabled    = false;
                btn.textContent = "Criar Item";
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled    = false;
            btn.textContent = "Criar Item";
        }
    });
});
