// Formulário para salvar um novo cartão de pagamento (acesso restrito a clientes)

document.addEventListener("DOMContentLoaded", () => {

    // Somente clientes autenticados podem cadastrar cartões
    const token = localStorage.getItem("token");
    const tipo  = localStorage.getItem("tipo");
    if (!token || tipo !== "cliente") {
        window.location.href = "index.html";
        return;
    }

    const form         = document.getElementById("form-cartao")       as HTMLFormElement;
    const inputApelido = document.getElementById("apelido")           as HTMLInputElement;
    const inputTitular = document.getElementById("nome_titular")      as HTMLInputElement;
    const inputNumero  = document.getElementById("numero")            as HTMLInputElement;
    const selectBand   = document.getElementById("bandeira")          as HTMLSelectElement;
    const selectTipo   = document.getElementById("tipo")              as HTMLSelectElement;
    const inputVal     = document.getElementById("validade")          as HTMLInputElement;
    const inputCvv     = document.getElementById("cvv")               as HTMLInputElement;
    const pErro        = document.getElementById("mensagem-erro")     as HTMLParagraphElement;
    const pSucesso     = document.getElementById("mensagem-sucesso")  as HTMLParagraphElement;
    const btnSalvar    = document.getElementById("btn-salvar")        as HTMLButtonElement;

    // Remove destaque de erro ao redigitar nos campos com .campo wrapper
    form.querySelectorAll(".campo input, .campo select").forEach(el => {
        el.addEventListener("input", () => {
            el.closest(".campo")?.classList.remove("campo-invalido");
            pErro.textContent = "";
        });
    });

    // Formata o número do cartão inserindo espaços a cada 4 dígitos
    inputNumero.addEventListener("input", () => {
        const digits = inputNumero.value.replace(/\D/g, "").slice(0, 16);
        inputNumero.value = digits.replace(/(.{4})/g, "$1 ").trim();
    });

    // Formata a validade inserindo "/" após os dois primeiros dígitos
    inputVal.addEventListener("input", () => {
        const digits = inputVal.value.replace(/\D/g, "").slice(0, 6);
        inputVal.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    });

    // Permite apenas dígitos no CVV
    inputCvv.addEventListener("input", () => {
        inputCvv.value = inputCvv.value.replace(/\D/g, "").slice(0, 4);
    });

    form.addEventListener("submit", async (e: Event) => {
        e.preventDefault();
        pErro.textContent    = "";
        pSucesso.textContent = "";

        // Validação local — destaca campos obrigatórios não preenchidos
        let invalido = false;
        const obrigatorios: HTMLInputElement[] = [inputApelido, inputTitular, inputNumero, inputVal, inputCvv];
        for (const campo of obrigatorios) {
            if (!campo.value.trim()) {
                campo.closest(".campo")?.classList.add("campo-invalido");
                invalido = true;
            }
        }
        if (!selectBand.value) { selectBand.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (!selectTipo.value) { selectTipo.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (invalido) { pErro.textContent = "Preencha todos os campos obrigatórios."; return; }

        // Loading state — desabilita o botão durante o envio para evitar duplo clique
        btnSalvar.disabled   = true;
        btnSalvar.innerHTML  = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando…';

        try {
            // Envia POST ao backend para criar o cartão salvo do cliente
            const res = await fetch(`${BASE_URL}/api/accounts/cartoes/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${TOKEN_PREFIXO} ${token}`
                },
                body: JSON.stringify({
                    apelido:      inputApelido.value.trim(),
                    nome_titular: inputTitular.value.trim(),
                    numero:       inputNumero.value.replace(/\s/g, ""),
                    bandeira:     selectBand.value,
                    tipo:         selectTipo.value,
                    validade:     inputVal.value.trim(),
                    cvv:          inputCvv.value.trim()
                })
            });

            if (res.status === 201) {
                // Redireciona para a lista de cartões após cadastro bem-sucedido
                window.location.href = "meus-cartoes.html";
            } else {
                const dados = await res.json() as Record<string, unknown>;
                pErro.textContent   = extrairErro(dados);
                btnSalvar.disabled  = false;
                btnSalvar.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar Cartão';
            }
        } catch {
            pErro.textContent   = "Não foi possível conectar ao servidor.";
            btnSalvar.disabled  = false;
            btnSalvar.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar Cartão';
        }
    });

    // Extrai o primeiro erro legível de uma resposta do backend
    function extrairErro(dados: Record<string, unknown>): string {
        if (typeof dados["erro"] === "string") return dados["erro"];
        for (const campo in dados) {
            const msgs = dados[campo];
            if (Array.isArray(msgs) && msgs.length > 0) return `${campo}: ${msgs[0]}`;
        }
        return "Erro ao salvar o cartão.";
    }
});
