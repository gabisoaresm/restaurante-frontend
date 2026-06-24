// Lida com o formulário de registro de novo cliente
document.addEventListener("DOMContentLoaded", () => {

    // Usuário já logado não precisa se registrar
    if (localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    const form         = document.getElementById("form-registro") as HTMLFormElement;
    const mensagemErro = document.getElementById("mensagem-erro") as HTMLParagraphElement;
    const btn          = form.querySelector("button[type='submit']") as HTMLButtonElement;

    // Campos declarados no nível superior para que o indicador de força os acesse
    const campoFirstName       = document.getElementById("first_name")      as HTMLInputElement;
    const campoLastName        = document.getElementById("last_name")        as HTMLInputElement;
    const campoUsername        = document.getElementById("username")         as HTMLInputElement;
    const campoEmail           = document.getElementById("email")            as HTMLInputElement;
    const campoPassword        = document.getElementById("password")         as HTMLInputElement;
    const campoPasswordConfirm = document.getElementById("password_confirm") as HTMLInputElement;

    // Remove destaque de erro do campo quando o usuário começa a digitar novamente
    form.querySelectorAll(".campo input").forEach(input => {
        input.addEventListener("input", () => {
            input.closest(".campo")?.classList.remove("campo-invalido");
        });
    });

    const erroEmail = document.getElementById("erro-email") as HTMLDivElement;

    // Valida o formato do e-mail ao sair do campo (antes mesmo de tentar enviar)
    const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    campoEmail.addEventListener("blur", () => {
        const val = campoEmail.value.trim();
        if (val && !REGEX_EMAIL.test(val)) {
            campoEmail.closest(".campo")?.classList.add("campo-invalido");
            erroEmail.textContent = "Informe um e-mail válido.";
            erroEmail.classList.remove("d-none");
        }
    });
    // Esconde o erro inline ao redigitar o e-mail
    campoEmail.addEventListener("input", () => {
        erroEmail.textContent = "";
        erroEmail.classList.add("d-none");
    });

    const erroSenhaConfirm = document.getElementById("erro-senha-confirm") as HTMLDivElement;

    // Valida se a confirmação bate com a senha ao sair do campo
    campoPasswordConfirm.addEventListener("blur", () => {
        if (campoPasswordConfirm.value && campoPasswordConfirm.value !== campoPassword.value) {
            campoPasswordConfirm.closest(".campo")?.classList.add("campo-invalido");
            erroSenhaConfirm.textContent = "As senhas não coincidem.";
            erroSenhaConfirm.classList.remove("d-none");
        }
    });
    // Esconde o erro inline ao redigitar a confirmação
    campoPasswordConfirm.addEventListener("input", () => {
        erroSenhaConfirm.textContent = "";
        erroSenhaConfirm.classList.add("d-none");
    });

    // ── Indicador de força de senha ──────────────────────────────────────────

    const divForca      = document.getElementById("forca-senha")            as HTMLDivElement;
    const preenchimento = document.getElementById("forca-senha-preenchimento") as HTMLDivElement;
    const rotuloForca   = document.getElementById("forca-senha-rotulo")     as HTMLSpanElement;

    // Avalia a força da senha com base em comprimento, mistura de letras+números e símbolos
    function avaliarForca(senha: string): { nivel: number; texto: string; classe: string } {
        if (!senha) return { nivel: 0, texto: "", classe: "" };

        let pontos = 0;
        if (senha.length >= 8) pontos++;
        if (/[a-zA-Z]/.test(senha) && /[0-9]/.test(senha)) pontos++;
        if (/[^a-zA-Z0-9]/.test(senha)) pontos++;

        if (pontos <= 1) return { nivel: 1, texto: "Fraca",  classe: "forca-fraca" };
        if (pontos === 2) return { nivel: 2, texto: "Média",  classe: "forca-media" };
        return               { nivel: 3, texto: "Forte",  classe: "forca-forte" };
    }

    // Atualiza a barra e o rótulo a cada tecla digitada no campo de senha
    campoPassword.addEventListener("input", () => {
        const senha = campoPassword.value;

        if (!senha) {
            divForca.classList.add("d-none");
            return;
        }

        const { nivel, texto, classe } = avaliarForca(senha);
        divForca.classList.remove("d-none");
        preenchimento.className  = `forca-senha-preenchimento ${classe}`;
        preenchimento.style.width = `${Math.round((nivel / 3) * 100)}%`;
        rotuloForca.textContent  = texto;
        rotuloForca.className    = "forca-senha-rotulo text-muted"; // apenas a barra tem cor
    });

    // ── Envio do formulário ──────────────────────────────────────────────────

    form.addEventListener("submit", async (evento: Event) => {
        evento.preventDefault();
        mensagemErro.textContent = "";

        const firstName       = campoFirstName.value.trim();
        const lastName        = campoLastName.value.trim();
        const username        = campoUsername.value.trim();
        const email           = campoEmail.value.trim();
        const password        = campoPassword.value;
        const passwordConfirm = campoPasswordConfirm.value;

        // Validação local: destaca visualmente os campos obrigatórios deixados em branco
        let invalido = false;
        if (!firstName)       { campoFirstName.closest(".campo")?.classList.add("campo-invalido");       invalido = true; }
        if (!lastName)        { campoLastName.closest(".campo")?.classList.add("campo-invalido");        invalido = true; }
        if (!username)        { campoUsername.closest(".campo")?.classList.add("campo-invalido");        invalido = true; }
        if (!email)           { campoEmail.closest(".campo")?.classList.add("campo-invalido");           invalido = true; }
        if (!password)        { campoPassword.closest(".campo")?.classList.add("campo-invalido");        invalido = true; }
        if (!passwordConfirm) { campoPasswordConfirm.closest(".campo")?.classList.add("campo-invalido"); invalido = true; }
        if (invalido) {
            mensagemErro.textContent = "Preencha todos os campos obrigatórios.";
            return;
        }

        // Valida o formato do e-mail antes de enviar ao servidor
        if (!REGEX_EMAIL.test(email)) {
            campoEmail.closest(".campo")?.classList.add("campo-invalido");
            erroEmail.textContent = "Informe um e-mail válido.";
            erroEmail.classList.remove("d-none");
            return;
        }

        // Validação local: as senhas devem coincidir antes de enviar ao servidor
        if (password !== passwordConfirm) {
            campoPasswordConfirm.closest(".campo")?.classList.add("campo-invalido");
            erroSenhaConfirm.textContent = "As senhas não coincidem.";
            erroSenhaConfirm.classList.remove("d-none");
            return;
        }

        // Desabilita o botão durante a requisição para evitar envios duplicados
        btn.disabled    = true;
        btn.textContent = "Criando conta…";

        try {
            const resposta = await fetch(`${BASE_URL}/api/accounts/registro/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    password,
                    email,
                    first_name: firstName,
                    last_name:  lastName,
                }),
            });

            if (resposta.status === 201) {
                // Cadastro realizado — redireciona para o login com aviso de sucesso
                window.location.href = "login.html?cadastro=ok";
            } else {
                const dados = await resposta.json();
                // erros de validação de senha chegam como lista — exibe cada um em linha separada
                if (Array.isArray(dados.erros)) {
                    mensagemErro.innerHTML = "";
                    (dados.erros as string[]).forEach((msg, i) => {
                        if (i > 0) mensagemErro.appendChild(document.createElement("br"));
                        mensagemErro.appendChild(document.createTextNode(msg));
                    });
                } else {
                    mensagemErro.textContent = (dados.erro as string) ?? "Erro ao registrar. Tente novamente.";
                }
            }
        } catch {
            mensagemErro.textContent = "Não foi possível conectar ao servidor. Verifique sua conexão.";
        } finally {
            btn.disabled    = false;
            btn.textContent = "Criar Conta";
        }
    });
});
