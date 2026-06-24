// Carrega os dados do usuário autenticado e permite editar nome, sobrenome e e-mail

// Estrutura retornada por GET/PATCH /api/accounts/me/
interface DadosPerfil {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    tipo: "cliente" | "atendente" | "gerente" | null;
    date_joined: string;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Somente usuários autenticados acessam o perfil
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const divCarregando  = document.getElementById("estado-carregando") as HTMLDivElement;
    const divConteudo    = document.getElementById("conteudo-perfil")   as HTMLDivElement;

    // Elementos da seção de leitura
    const spanUsername   = document.getElementById("info-username")     as HTMLElement;
    const spanNome       = document.getElementById("info-nome")         as HTMLElement;
    const spanEmail      = document.getElementById("info-email")        as HTMLElement;
    const spanTipo       = document.getElementById("info-tipo")         as HTMLElement;
    const spanMembro     = document.getElementById("info-membro")       as HTMLElement;

    // Elementos do formulário de edição
    const form           = document.getElementById("form-perfil")       as HTMLFormElement;
    const inputFirstName = document.getElementById("first_name")        as HTMLInputElement;
    const inputLastName  = document.getElementById("last_name")         as HTMLInputElement;
    const inputEmail     = document.getElementById("email")             as HTMLInputElement;
    const pErro          = document.getElementById("mensagem-erro")     as HTMLParagraphElement;
    const btn            = form.querySelector("button[type='submit']")  as HTMLButtonElement;

    // Remove o destaque de erro ao redigitar em qualquer campo
    [inputFirstName, inputLastName, inputEmail].forEach(input => {
        input.addEventListener("input", () => {
            input.closest(".campo")?.classList.remove("campo-invalido");
            pErro.textContent = "";
        });
    });

    // Mapeamentos para o badge de tipo de perfil
    const tipoLabel: Record<string, string> = {
        cliente:   "Cliente",
        atendente: "Atendente",
        gerente:   "Gerente",
    };
    const tipoBadgeClasse: Record<string, string> = {
        cliente:   "bg-success-subtle text-success-emphasis",
        atendente: "bg-warning-subtle text-warning-emphasis",
        gerente:   "bg-primary-subtle text-primary-emphasis",
    };

    // Busca os dados atuais do usuário autenticado
    try {
        const res = await fetch(`${BASE_URL}/api/accounts/me/`, {
            headers: { "Authorization": `${TOKEN_PREFIXO} ${token}` }
        });

        if (!res.ok) {
            // Token inválido ou expirado
            window.location.href = "login.html";
            return;
        }

        const dados: DadosPerfil = await res.json();

        // Preenche a seção de leitura
        spanUsername.textContent = dados.username;
        spanNome.textContent     = [dados.first_name, dados.last_name].filter(Boolean).join(" ") || "—";
        spanEmail.textContent    = dados.email || "—";
        spanMembro.textContent   = dados.date_joined || "—";

        if (dados.tipo) {
            const cls = tipoBadgeClasse[dados.tipo] ?? "";
            spanTipo.innerHTML = `<span class="badge fw-normal ${cls}">${tipoLabel[dados.tipo] ?? dados.tipo}</span>`;
        } else {
            spanTipo.textContent = "—";
        }

        // Preenche o formulário com os valores atuais para edição
        inputFirstName.value = dados.first_name;
        inputLastName.value  = dados.last_name;
        inputEmail.value     = dados.email;

        divCarregando.classList.add("d-none");
        divConteudo.classList.remove("d-none");

    } catch {
        // Falha de rede — redireciona para login como medida segura
        window.location.href = "login.html";
        return;
    }

    // Envia as alterações dos dados pessoais ao backend
    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        pErro.textContent = "";

        const firstName = inputFirstName.value.trim();
        const lastName  = inputLastName.value.trim();
        const email     = inputEmail.value.trim();

        // Validação local antes de ir ao servidor
        let invalido = false;
        if (!firstName) { inputFirstName.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (!lastName)  { inputLastName.closest(".campo")?.classList.add("campo-invalido");  invalido = true; }
        if (!email)     { inputEmail.closest(".campo")?.classList.add("campo-invalido");      invalido = true; }
        if (invalido)   { pErro.textContent = "Preencha todos os campos obrigatórios."; return; }

        // Loading state — impede envio duplicado durante a requisição
        btn.disabled  = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando…';

        try {
            // Envia PATCH com os campos editáveis
            const res = await fetch(`${BASE_URL}/api/accounts/me/`, {
                method: "PATCH",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`,
                },
                body: JSON.stringify({ first_name: firstName, last_name: lastName, email }),
            });

            const dados = await res.json() as Record<string, unknown>;

            if (res.ok) {
                // Atualiza a seção de leitura com os novos valores
                spanNome.textContent  = [firstName, lastName].filter(Boolean).join(" ");
                spanEmail.textContent = email;
                mostrarToast("Dados atualizados com sucesso!");
            } else {
                pErro.textContent = (dados["erro"] as string) ?? "Erro ao salvar as alterações.";
            }
        } catch {
            pErro.textContent = "Não foi possível conectar ao servidor.";
        } finally {
            btn.disabled  = false;
            btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar Alterações';
        }
    });
});
