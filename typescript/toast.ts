// Exibe uma notificação toast no canto inferior direito da tela
// tipo "sucesso" → fundo verde; tipo "erro" → fundo vermelho
function mostrarToast(mensagem: string, tipo: "sucesso" | "erro" = "sucesso"): void {
    // Cria o container uma única vez e reutiliza nas chamadas seguintes
    let wrapper = document.getElementById("toast-wrapper");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "toast-wrapper";
        wrapper.className = "toast-wrapper";
        document.body.appendChild(wrapper);
    }

    const item = document.createElement("div");
    item.className = `toast-item toast-item-${tipo}`;
    item.textContent = mensagem;
    wrapper.appendChild(item);

    // Após 3 s dispara a animação de saída; remove o elemento ao terminar
    setTimeout(() => {
        item.classList.add("toast-saindo");
        item.addEventListener("animationend", () => item.remove(), { once: true });
    }, 3000);
}
