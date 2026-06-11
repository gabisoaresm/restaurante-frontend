// Formulário para criar uma nova categoria no cardápio (acesso restrito ao gerente)
document.addEventListener("DOMContentLoaded", async () => {

    // Verifica autenticação e perfil antes de exibir o formulário
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "gerente") {
        window.location.href = "index.html";
        return;
    }

    // Referências ao formulário e elementos de feedback
    const form  = document.getElementById("form-categoria") as HTMLFormElement;
    const nome  = document.getElementById("nome") as HTMLInputElement;
    const pErro = document.getElementById("mensagem-erro") as HTMLParagraphElement;
    const btn   = form.querySelector("button[type='submit']") as HTMLButtonElement;

    // Remove destaque de erro ao redigitar no campo
    nome.addEventListener("input", () => {
        nome.closest(".campo")?.classList.remove("campo-invalido");
    });

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        pErro.textContent = "";

        const nomeVal = nome.value.trim();

        // Validação local: nome não pode estar vazio
        if (!nomeVal) {
            nome.closest(".campo")?.classList.add("campo-invalido");
            pErro.textContent = "Informe o nome da categoria.";
            return;
        }

        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled    = true;
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

            const dados = await res.json() as Record<string, unknown>;

            if (res.ok) {
                // Redireciona para a lista após criação bem-sucedida
                window.location.href = "gerenciar-categorias.html";
            } else if (res.status === 403) {
                pErro.textContent = "Apenas gerentes podem criar categorias.";
                btn.disabled    = false;
                btn.textContent = "Criar Categoria";
            } else {
                // Exibe o primeiro erro retornado pelo backend (validação ou outro)
                pErro.textContent = String(dados["nome"] ? (dados["nome"] as string[])[0] : dados["erro"] ?? "Erro ao criar a categoria.");
                btn.disabled    = false;
                btn.textContent = "Criar Categoria";
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
            btn.disabled    = false;
            btn.textContent = "Criar Categoria";
        }
    });
});
