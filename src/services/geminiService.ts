import { GoogleGenAI, Type } from "@google/genai";
import { Milestone, UserProfile, Routine } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Try process.env (Vite define) first, then import.meta.env
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will not work until configured.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `
Você é o "Organiza.ai", um orquestrador de tempo empático e acolhedor, especializado em ajudar pessoas com TDAH.
Você atua como a "função executiva" do usuário, ajudando-o a organizar o dia de forma realista e sem julgamentos.

COMPORTAMENTO E TOM:
- TOM: Acolhedor, claro, honesto e não punitivo. Use frases como "Vamos ajustar isso juntos".
- PAPEL: Você é um treinador de transições e tempo, não um sistema de cobrança.
- EMPATIA: Se um plano for inviável, explique o risco (ex: "Isso pode te deixar muito cansado") e sugira alternativas.

CARGA INICIAL:
- O usuário fornecerá uma lista livre de tarefas (voz ou texto).
- Interprete tudo: compromissos fixos (horário marcado), flexíveis (sem horário) e rotinas.
- Crie um plano possível, priorizando viabilidade sobre perfeição.

REALISMO TEMPORAL (Lógica de Decisão):
- SEMPRE inclua marcos de: PREPARAÇÃO, SAÍDA DE CASA (se aplicável), DESLOCAMENTO e TRANSIÇÃO.
- Adicione margens de segurança (buffer) de 15-20%.
- Imponha limites: Se o usuário tem médico às 15h, sugira que o almoço termine às 13:30 para garantir a preparação.

PLANO VIVO (Ajustes):
- O usuário pode adicionar, remover ou ajustar tarefas a qualquer momento.
- APRENDIZADO DE ROTINA: Se o usuário adicionar algo que pareça recorrente (ex: "Vou na academia hoje", "Tenho aula de inglês"), você deve perguntar gentilmente se isso é uma rotina fixa e quais seriam os dias e horários padrão.
- Se o usuário confirmar uma nova rotina, responda confirmando que "anotou" e que usará isso para os próximos dias.
- Recalcule o plano e avise sobre novos conflitos ou riscos de atraso.

FORMATO DE RESPOSTA (JSON):
- message: Sua resposta amigável e orientações.
- suggestedMilestones: Lista de marcos (incluindo preparação, deslocamento, etc).
- isPlanComplete: true se o dia estiver orquestrado.
- needsClarification: true se precisar de mais detalhes ou se estiver perguntando sobre uma nova rotina.
- summary: (Opcional) No final do dia ou quando solicitado, um resumo motivador do progresso.
- newRoutine: (Opcional) Se o usuário confirmou uma nova rotina na conversa, envie um objeto com { title, days, startTime, duration }.
`;

export interface OrchestratorResponse {
  message: string;
  suggestedMilestones?: Partial<Milestone>[];
  isPlanComplete: boolean;
  needsClarification: boolean;
  summary?: string;
  newRoutine?: Partial<Routine>;
}

export async function generateInitialPlan(
  profile: UserProfile
): Promise<OrchestratorResponse> {
  const routinesContext = profile.settings.routines.map(r => 
    `- ${r.title}: ${r.days.join(', ')} às ${r.startTime} (${r.duration} min)`
  ).join('\n');

  const workContext = `Trabalho: ${profile.settings.workDays.join(', ')} das ${profile.settings.workStart} às ${profile.settings.workEnd}. Deslocamento: ${profile.settings.commuteToWork} min ida, ${profile.settings.commuteToHome} min volta. Almoço: ${profile.settings.lunchDuration} min.`;

  const todayDate = new Date();
  const todayStr = format(todayDate, 'yyyy-MM-dd');
  const dayOfWeek = format(todayDate, 'EEE', { locale: ptBR });

  const prompt = `
O usuário acabou de configurar seu perfil. Por favor, gere um plano inicial para HOJE (${todayStr}, ${dayOfWeek}) baseado nas configurações dele.

CONFIGURAÇÕES:
${workContext}

ROTINAS FIXAS:
${routinesContext}

INSTRUÇÕES CRÍTICAS:
1. Verifique se hoje (${dayOfWeek}) é um dia de trabalho ou se há rotinas para este dia.
2. Se houver, gere os marcos correspondentes com horários precisos em formato ISO (ex: ${todayStr}T09:00:00Z).
3. Adicione marcos de PREPARAÇÃO (30 min antes de sair) e DESLOCAMENTO (conforme configurado).
4. Se for dia de trabalho, inclua o ALMOÇO no meio do período.
5. Se o dia estiver vazio, sugira 2 atividades de autocuidado (ex: Meditação, Leitura) com horários sugeridos.
6. A propriedade "startTime" e "endTime" DEVEM ser strings ISO completas para o dia de hoje (${todayStr}).
7. Defina "isPlanComplete" como true.
8. Responda com uma mensagem motivadora em "message".
`;

  const ai = getAI();
  if (!ai) {
    return {
      message: "A chave da API do Gemini não foi configurada.",
      isPlanComplete: false,
      needsClarification: true
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING },
          suggestedMilestones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["fixed", "flexible", "transition", "preparation"] },
                description: { type: Type.STRING }
              }
            }
          },
          isPlanComplete: { type: Type.BOOLEAN },
          needsClarification: { type: Type.BOOLEAN }
        },
        required: ["message", "isPlanComplete", "needsClarification"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      message: "Erro ao gerar plano inicial.",
      isPlanComplete: false,
      needsClarification: true
    };
  }
}

export async function orchestrateDay(
  userInput: string,
  history: { role: 'user' | 'model', content: string }[],
  profile: UserProfile,
  currentPlan?: Milestone[]
): Promise<OrchestratorResponse> {
  const routinesContext = profile.settings.routines.map(r => 
    `- ${r.title}: ${r.days.join(', ')} às ${r.startTime} (${r.duration} min)`
  ).join('\n');

  const workContext = `Trabalho: ${profile.settings.workDays.join(', ')} das ${profile.settings.workStart} às ${profile.settings.workEnd}. Deslocamento: ${profile.settings.commuteToWork} min ida, ${profile.settings.commuteToHome} min volta. Almoço: ${profile.settings.lunchDuration} min.`;

  const dynamicInstruction = `
CONTEXTO DO USUÁRIO:
${workContext}
ROTINAS FIXAS:
${routinesContext}

DIRETRIZES ADICIONAIS:
1. AUTO-PLANEJAMENTO: Se hoje for um dia de trabalho ou rotina fixa, inclua esses marcos automaticamente no plano sugerido, a menos que o usuário diga o contrário.
2. SUGESTÕES PROATIVAS: Se houver buracos no dia ou tempo livre, sugira atividades saudáveis baseadas no perfil (ex: academia, ler um livro, dormir mais cedo).
3. TRANSIÇÕES: Use os tempos de deslocamento configurados (${profile.settings.commuteToWork} min para trabalho, ${profile.settings.commuteToHome} min para casa) para criar marcos de transição precisos.
`;

  const ai = getAI();
  if (!ai) {
    return {
      message: "A chave da API do Gemini não foi configurada. Por favor, adicione GEMINI_API_KEY às variáveis de ambiente do Vercel.",
      isPlanComplete: false,
      needsClarification: true
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: userInput }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + dynamicInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "Mensagem amigável para o usuário" },
          suggestedMilestones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["fixed", "flexible", "transition", "preparation"] },
                description: { type: Type.STRING }
              }
            }
          },
          isPlanComplete: { type: Type.BOOLEAN },
          needsClarification: { type: Type.BOOLEAN }
        },
        required: ["message", "isPlanComplete", "needsClarification"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return {
      message: "Desculpe, tive um probleminha ao processar isso. Pode repetir?",
      isPlanComplete: false,
      needsClarification: true
    };
  }
}
