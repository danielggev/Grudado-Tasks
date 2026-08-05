import type { ActivityAction, EventoDeAtividade } from "./api";
import { useAtividade } from "./hooks";

const DESCRICAO: Record<ActivityAction, (payload: Record<string, unknown>) => string> = {
  tarefa_criada: () => "criou a tarefa",
  tarefa_editada: () => "editou a tarefa",
  tarefa_excluida: () => "excluiu a tarefa",
  status_alterado: (p) => `moveu de "${p.de}" para "${p.para}"`,
  prazo_definido: (p) => `definiu o prazo para ${String(p.due_date)}`,
  prioridade_alterada: () => "alterou a prioridade",
  responsaveis_alterados: () => "alterou os responsáveis",
};

const FORMATADOR = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function descreve(evento: EventoDeAtividade): string {
  const fn = DESCRICAO[evento.action];
  return fn ? fn(evento.payload) : evento.action;
}

export function PainelDeAtividade({ taskId }: { taskId: string }) {
  const { data: eventos, isPending } = useAtividade(taskId);

  if (isPending) return <p className="text-xs text-texto-suave">Carregando histórico...</p>;
  if (!eventos?.length) return <p className="text-xs text-texto-suave">Sem atividade ainda.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {eventos.map((evento) => (
        <li key={evento.id} className="text-xs text-texto-suave">
          <span className="font-medium text-texto">{evento.autor?.name ?? "Alguém"}</span>{" "}
          {descreve(evento)} · {FORMATADOR.format(new Date(evento.created_at))}
        </li>
      ))}
    </ul>
  );
}
