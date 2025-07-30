import React, { useState } from 'react';
import type { Question, Answer, AnswersState, Attachment, AnswerValue, QuestionType } from '../types';

// --- Input Components ---

const BooleanInput: React.FC<{ value: boolean | null, onChange: (value: boolean) => void }> = ({ value, onChange }) => (
  <div className="flex space-x-2">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
        value === true
          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
          : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:text-teal-600'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      Verdadeiro
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
        value === false
          ? 'bg-red-600 text-white border-red-600 shadow-sm'
          : 'bg-white text-slate-700 border-slate-300 hover:border-red-500 hover:text-red-600'
      }`}
    >
       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      Falso
    </button>
  </div>
);

const TextInput: React.FC<{ value: string, onChange: (value: string) }> = ({ value, onChange }) => (
    <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border rounded-lg bg-white text-slate-800 focus:ring-2 transition border-slate-300 focus:ring-teal-500 focus:border-teal-500"
        placeholder="Digite sua resposta"
    />
);

const TextBlockInput: React.FC<{ value: string, onChange: (value: string) }> = ({ value, onChange }) => (
    <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full p-3 border rounded-lg bg-white text-slate-800 focus:ring-2 transition border-slate-300 focus:ring-teal-500 focus:border-teal-500"
        placeholder="Digite sua resposta detalhada"
    />
);

const SingleChoiceInput: React.FC<{ value: string | null, onChange: (value: string) => void, options: string[] }> = ({ value, onChange, options }) => (
    <div className="space-y-2">
        {options.map(option => (
            <label key={option} className="flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500">
                <input
                    type="radio"
                    name={option}
                    value={option}
                    checked={value === option}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-4 w-4 text-teal-600 border-slate-400 focus:ring-teal-500"
                />
                <span className="ml-3 text-slate-800 font-medium">{option}</span>
            </label>
        ))}
    </div>
);

const MultipleChoiceInput: React.FC<{ value: string[], onChange: (value: string[]) => void, options: string[] }> = ({ value, onChange, options }) => {
    const handleChange = (option: string, checked: boolean) => {
        const newValue = checked
            ? [...value, option]
            : value.filter(v => v !== option);
        onChange(newValue);
    };

    return (
        <div className="space-y-2">
            {options.map(option => (
                <label key={option} className="flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500">
                    <input
                        type="checkbox"
                        value={option}
                        checked={value.includes(option)}
                        onChange={(e) => handleChange(option, e.target.checked)}
                        className="h-4 w-4 text-teal-600 border-slate-400 rounded focus:ring-teal-500"
                    />
                    <span className="ml-3 text-slate-800 font-medium">{option}</span>
                </label>
            ))}
        </div>
    );
};


const QuestionInput: React.FC<{ question: Question, value: AnswerValue, onChange: (value: AnswerValue) => void }> = ({ question, value, onChange }) => {
    switch (question.type) {
        case 'boolean':
            return <BooleanInput value={value as boolean | null} onChange={onChange} />;
        case 'text':
            return <TextInput value={value as string || ''} onChange={onChange} />;
        case 'text_block':
            return <TextBlockInput value={value as string || ''} onChange={onChange} />;
        case 'single_choice':
            return <SingleChoiceInput value={value as string | null} onChange={onChange} options={question.options!} />;
        case 'multiple_choice':
            return <MultipleChoiceInput value={value as string[] || []} onChange={onChange} options={question.options!} />;
        default:
            return <p>Tipo de pergunta não suportado.</p>;
    }
};

const EvidenceBlock: React.FC<{
    evidence: string;
    attachment?: Attachment;
    prompt: string;
    onEvidenceChange: (value: string) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAttachment: () => void;
}> = ({ evidence, attachment, prompt, onEvidenceChange, onFileChange, onRemoveAttachment }) => {
    return (
        <div className="mt-6 pt-6 border-t border-slate-200">
             <h4 className="text-sm font-bold text-slate-600 mb-3">Evidência e Justificativa</h4>
             <div className="space-y-4">
                <textarea
                    value={evidence}
                    onChange={(e) => onEvidenceChange(e.target.value)}
                    placeholder={prompt}
                    rows={4}
                    className="w-full p-3 pr-4 border rounded-lg bg-slate-50 text-slate-800 focus:ring-2 transition border-slate-300 focus:ring-teal-500 focus:border-teal-500 focus:bg-white"
                />
                <div>
                    {attachment ? (
                        <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 flex-shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span className="text-sm font-medium text-slate-800 truncate" title={attachment.name}>{attachment.name}</span>
                            </div>
                            <button onClick={onRemoveAttachment} className="p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors flex-shrink-0" aria-label="Remover anexo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                    ) : (
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-slate-700 bg-white border-2 border-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l.79-.79"/></svg>
                            Anexar Evidência
                            <input type="file" className="hidden" onChange={onFileChange} accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" />
                        </label>
                    )}
                    <p className="text-xs text-slate-500 mt-2">Tipos aceitos: PDF, JPG, PNG, TXT, DOC, DOCX.</p>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const PriorityMarker: React.FC<{ priority: Question['priority'] }> = ({ priority }) => {
  const color = priority === 'imperative' ? 'bg-red-500' :
                priority === 'moderate' ? 'bg-yellow-400' : 'bg-teal-500';
  
  const tooltip = priority === 'imperative' ? 'Pergunta Imperativa (Peso 3)' :
                  priority === 'moderate' ? 'Pergunta Moderada (Peso 2)' : 'Não Prioritária (Peso 1)';

  return (
    <div className="absolute top-3 right-3 group">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {tooltip}
      </div>
    </div>
  );
};

interface QuestionnaireProps {
  topic: { name: string; icon: React.FC<any> };
  questionsForTopic: Question[];
  answers: AnswersState;
  onAnswer: (questionId: string, answer: Answer) => void;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({ topic, questionsForTopic, answers, onAnswer }) => {
  const [visibleInfo, setVisibleInfo] = useState<Record<string, boolean>>({});

  const toggleInfo = (questionId: string) => {
    setVisibleInfo(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  if (questionsForTopic.length === 0) {
    return (
        <div className="w-full bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center text-center h-full border border-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mb-4">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <h2 className="text-2xl font-bold text-slate-800">Nenhuma pergunta encontrada</h2>
            <p className="mt-2 max-w-md mx-auto text-slate-600">
                Não há perguntas que correspondam aos seus critérios de busca ou filtros neste tópico. Tente ajustar sua pesquisa ou selecionar outro tópico.
            </p>
        </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        {questionsForTopic.map((question) => {
          const currentAnswer = answers[question.id] ?? { value: null, evidence: '', attachment: undefined };

          const updateAnswer = (updatedFields: Partial<Answer>) => {
              onAnswer(question.id, { ...currentAnswer, ...updatedFields });
          };

          const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                const newAttachment: Attachment = { name: file.name, type: file.type, content };
                updateAnswer({ attachment: newAttachment });
            };
            reader.onerror = () => alert("Não foi possível ler o arquivo.");
            reader.readAsDataURL(file);
            e.target.value = '';
          };

          const handleRemoveAttachment = () => {
            const { attachment, ...restOfAnswer } = currentAnswer;
            onAnswer(question.id, restOfAnswer);
          };

          return (
            <div key={question.id}>
              <div className="relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in transition-all duration-300 hover:shadow-md hover:border-slate-300">
                <PriorityMarker priority={question.priority} />
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-semibold text-slate-800 flex-1 pr-6 leading-relaxed">
                    {question.text}
                  </h3>
                </div>
                
                <div className="mt-3 flex items-center gap-x-2">
                  <p className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {question.reference}
                  </p>
                  {question.reference_text && (
                    <button
                      onClick={() => toggleInfo(question.id)}
                      className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-white transition-colors"
                      aria-label="Saiba mais sobre a referência"
                      aria-expanded={!!visibleInfo[question.id]}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                    </button>
                  )}
                </div>
                
                {visibleInfo[question.id] && question.reference_text && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner animate-fade-in">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                      {question.reference_text.replace(/---/g, '\n<hr class="my-3 border-slate-300">\n')}
                    </p>
                  </div>
                )}

                <div className="mt-5">
                    <QuestionInput
                        question={question}
                        value={currentAnswer.value}
                        onChange={(value) => updateAnswer({ value })}
                    />
                </div>
                
                <EvidenceBlock
                    evidence={currentAnswer.evidence}
                    attachment={currentAnswer.attachment}
                    prompt={question.evidence_prompt}
                    onEvidenceChange={(evidence) => updateAnswer({ evidence })}
                    onFileChange={handleFileChange}
                    onRemoveAttachment={handleRemoveAttachment}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Questionnaire;