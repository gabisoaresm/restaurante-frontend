// Formulário para editar um item existente do cardápio (acesso restrito ao gerente)
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

    // Verifica autenticação e perfil antes de carregar os dados
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }

    // Lê o id do item a partir do parâmetro de URL (ex.: editar-item.html?id=5)
    const params = new URLSearchParams(window.location.search);
    const id     = params.get("id");
    if (!id) {
        window.location.href = "cardapio.html";
        return;
    }

    const form              = document.getElementById("form-item") as HTMLFormElement;
    const inputNome         = document.getElementById("nome") as HTMLInputElement;
    const inputDesc         = document.getElementById("descricao") as HTMLTextAreaElement;
    const inputPreco        = document.getElementById("preco") as HTMLInputElement;
    const selectCat         = document.getElementById("categoria") as HTMLSelectElement;
    const checkDisp         = document.getElementById("disponivel") as HTMLInputElement;
    const inputImagem       = document.getElementById("imagem") as HTMLInputElement;
    const previewContainer  = document.getElementById("preview-imagem-atual") as HTMLDivElement;
    const imgAtual          = document.getElementById("img-atual") as HTMLImageElement;
    const labelImagem       = document.getElementById("label-imagem") as HTMLSpanElement;
    const subtitulo         = document.getElementById("subtitulo") as HTMLParagraphElement;
    const pErro             = document.getElementById("mensagem-erro") as HTMLParagraphElement;
    const btn               = form.querySelector("button[type='submit']") as HTMLButtonElement;

    // Remove destaque de erro ao redigitar em cada campo
    [inputNome, inputDesc, inputPreco].forEach(campo => {
        campo.addEventListener("input", () => {
            campo.closest(".campo")?.classList.remove("campo-invalido");
        });
    });
    selectCat.addEventListener("change", () => {
        selectCat.closest(".campo")?.classList.remove("campo-invalido");
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

        const categorias: Array<{ id: number; nome: string }> = await resCateg.json();
        const item: {
            id: number;
            nome: string;
            descricao: string;
            preco: string;
            categoria: number;
            disponivel: boolean;
            imagem: string | null;
        } = await resItem.json();

        // Popula o <select> com as categorias disponíveis, selecionando a do item atual
        for (const cat of categorias) {
            const opt = document.createElement("option");
            opt.value    = String(cat.id);
            opt.textContent = cat.nome;
            if (cat.id === item.categoria) opt.selected = true;
            selectCat.appendChild(opt);
        }

        // Pré-preenche os demais campos com os valores atuais do item
        inputNome.value   = item.nome;
        inputDesc.value   = item.descricao;
        inputPreco.value  = item.preco;
        checkDisp.checked = item.disponivel;
        subtitulo.textContent = item.nome;

        // Se o item já tem imagem, exibe a pré-visualização e ajusta o rótulo do campo
        if (item.imagem) {
            imgAtual.src = item.imagem;
            previewContainer.classList.remove("d-none");
            labelImagem.textContent = "Substituir foto";
        }

    } catch {
        pErro.textContent = "Não foi possível carregar os dados do item.";
        return;
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
        // Se nenhum arquivo novo for selecionado, o campo imagem não é enviado,
        // e o backend preserva a imagem existente (campo optional no serializer).
        const formData = new FormData();
        formData.append("nome",       nomeVal);
        formData.append("descricao",  descVal);
        formData.append("preco",      precoVal);
        formData.append("categoria",  catVal);
        formData.append("disponivel", checkDisp.checked ? "true" : "false");

        // Só inclui imagem nova se o gerente selecionou um arquivo diferente
        if (inputImagem.files && inputImagem.files.length > 0) {
            formData.append("imagem", inputImagem.files[0]);
        }

        try {
            // Envia PUT ao backend como multipart/form-data substituindo todos os campos do item
            const res = await fetch(`${BASE_URL}/api/cardapio/itens/${id}/`, {
                method: "PUT",
                headers: {
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                    // Content-Type omitido intencionalmente — o browser define multipart/form-data + boundary
                },
                body: formData
            });

            const dados = await res.json() as Record<string, unknown>;

            if (res.ok) {
                // Redireciona para o cardápio após atualização bem-sucedida
                window.location.href = "cardapio.html";
            } else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem editar itens do cardápio.";
                btn.disabled    = false;
                btn.textContent = "Salvar Alterações";
            } else {
                pErro.textContent = extrairPrimeiroErro(dados);
                btn.disabled    = false;
                btn.textContent = "Salvar Alterações";
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled    = false;
            btn.textContent = "Salvar Alterações";
        }
    });
});
