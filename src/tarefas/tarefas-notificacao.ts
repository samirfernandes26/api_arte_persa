export interface TarefaNotificacao {
  canal: 'email' | 'sms' | 'push' | 'webhook';
  tipo?: string;
  destinatario: string;
  assunto?: string;
  mensagem: string;
  metadados?: Record<string, string | number>;
}

export interface ResultadoTarefaNotificacao {
  entregue: boolean;
  processado_em: string;
}
