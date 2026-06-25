// Endereços do backend conforme o ambiente
const BACKEND_LOCAL = "http://localhost:8000";
const BACKEND_PRODUCAO = "https://cucinaitaliana.pythonanywhere.com";

// Detecta o ambiente: se estiver rodando localmente, usa o backend local;
// caso contrário (site publicado), usa o backend de produção.
const ehLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const BASE_URL = ehLocal ? BACKEND_LOCAL : BACKEND_PRODUCAO;

// Prefixo do token no cabeçalho Authorization, conforme exigido pelo DRF TokenAuthentication
const TOKEN_PREFIXO = "Token";