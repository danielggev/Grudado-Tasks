export type EventoDoServidor =
  | { tipo: "tarefas_mudaram"; team_id: string; task_id: string | null }
  | { tipo: "time_mudou"; team_id: string; task_id: string | null }
  // `task_id` distingue a conversa do time (nulo) da conversa de uma tarefa.
  | { tipo: "mensagens_mudaram"; team_id: string; task_id: string | null }
  | { tipo: "ping" };

const RECONEXAO_INICIAL_MS = 1_000;
const RECONEXAO_MAXIMA_MS = 30_000;

/**
 * Conexao com o canal de eventos de um time.
 *
 * Reconecta com backoff exponencial: rede cai, servidor reinicia num deploy,
 * notebook fecha a tampa. Sem isso o board simplesmente para de atualizar e
 * ninguem percebe -- o pior modo de falha para tempo real.
 *
 * Devolve a funcao de encerrar. O `fechadoDeProposito` impede que o cleanup
 * do React dispare uma reconexao ja cancelada.
 */
export function conectaAoCanal(
  teamId: string,
  aoReceber: (evento: EventoDoServidor) => void,
): () => void {
  let socket: WebSocket | null = null;
  let tentativa = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fechadoDeProposito = false;

  function url(): string {
    // Mesma origem do app: em dev o proxy do Vite encaminha, em producao o
    // Caddy faz o mesmo. O cookie de sessao viaja sozinho no handshake.
    const protocolo = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocolo}//${window.location.host}/ws?team_id=${teamId}`;
  }

  function conecta(): void {
    if (fechadoDeProposito) return;

    socket = new WebSocket(url());

    socket.onopen = () => {
      tentativa = 0;
    };

    socket.onmessage = (mensagem) => {
      try {
        const evento = JSON.parse(mensagem.data as string) as EventoDoServidor;
        if (evento.tipo !== "ping") aoReceber(evento);
      } catch {
        // Mensagem malformada nao derruba a conexao.
      }
    };

    socket.onclose = () => {
      if (fechadoDeProposito) return;
      const espera = Math.min(
        RECONEXAO_INICIAL_MS * 2 ** tentativa,
        RECONEXAO_MAXIMA_MS,
      );
      tentativa += 1;
      timer = setTimeout(conecta, espera);
    };

    // `onerror` sempre e seguido de `onclose`; deixar o reagendamento so no
    // close evita duas reconexoes concorrentes para a mesma queda.
    socket.onerror = () => socket?.close();
  }

  conecta();

  return () => {
    fechadoDeProposito = true;
    if (timer) clearTimeout(timer);
    socket?.close();
  };
}
