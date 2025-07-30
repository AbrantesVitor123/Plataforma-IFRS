
import React, { useState, useMemo, useCallback } from 'react';
import type { Question, Topic, AnswersState, ReportData, AnswerValue, Answer, QuestionType, TopicCompliance } from '../types';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Doughnut, Radar, Bar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale
);

interface ReportProps {
  reportData: ReportData;
  topics: Topic[];
  onBackToList: () => void;
  activeTab: 'overview' | 'summary';
  onTabChange: (tab: 'overview' | 'summary') => void;
}

// --- Helper Functions for Response Summary ---

const isAnswerProvided = (answer: Answer | undefined): boolean => {
    if (!answer || answer.value === null || answer.value === undefined) return false;
    if (typeof answer.value === 'string') return answer.value.trim() !== '';
    if (Array.isArray(answer.value)) return answer.value.length > 0;
    if (typeof answer.value === 'boolean') return true;
    return false;
};

const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
        case 'text_block': return 'Bloco de texto';
        case 'boolean': return 'Verdadeiro ou falso';
        case 'multiple_choice': return 'Múltipla escolha';
        case 'single_choice': return 'Escolha única';
        case 'text': return 'Texto';
        default: return 'N/A';
    }
};

const getSummaryAnswerText = (question: Question, answer: Answer | undefined): React.ReactNode => {
    if (!isAnswerProvided(answer)) {
        return <span className="text-slate-500 italic">Não respondido</span>;
    }

    const value = answer!.value;

    switch (question.type) {
        case 'text_block':
            return <span className="font-semibold text-slate-700">TB</span>;
        case 'boolean':
            return value ? <span className="font-semibold text-teal-700">Verdadeiro</span> : <span className="font-semibold text-red-700">Falso</span>;
        case 'multiple_choice':
            return (
                <ul className="list-none p-0 m-0 space-y-1">
                    {(value as string[]).map(opt => <li key={opt}><span className="font-mono text-teal-600 mr-1.5">X</span>{opt}</li>)}
                </ul>
            );
        case 'single_choice':
             return <span className="text-slate-800">{String(value)}</span>;
        case 'text':
             return <span className="text-slate-800">{String(value)}</span>;
        default:
            return String(value);
    }
};


// --- UI Components for Report ---

const DoughnutChart: React.FC<{ percentage: number; label: string; color: string }> = ({ percentage, label, color }) => {
  const data = {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [color, '#e2e8f0'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 4,
        cutout: '80%',
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="relative w-full h-40 sm:h-44 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-3xl sm:text-4xl font-bold`} style={{ color }}>
          {percentage.toFixed(0)}%
        </span>
        <span className="text-sm font-semibold text-slate-500 mt-1">
          {label}
        </span>
      </div>
    </div>
  );
};

const formatAnswerValueForDisplay = (value: AnswerValue): { text: string, color: string } => {
    if (value === null || value === undefined) return { text: "Não respondido", color: "text-slate-500" };
    if (typeof value === 'boolean') return value ? { text: 'Verdadeiro', color: 'text-teal-700' } : { text: 'Falso', color: 'text-red-700' };
    if (Array.isArray(value)) {
      if (value.length === 0) return { text: "Não respondido", color: "text-slate-500" };
      return { text: value.join(', '), color: 'text-slate-800' };
    }
    if (typeof value === 'string' && value.trim() === '') return { text: "Não respondido", color: "text-slate-500" };
    return { text: String(value), color: 'text-slate-800' };
};

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const nodes: React.ReactNode[] = [];
    const lines = text.split('\n');
    let inList = false;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (inList) {
            nodes.push(<ul key={`ul-${nodes.length}`} className="list-disc pl-5 space-y-1 my-3">{listItems}</ul>);
            listItems = [];
            inList = false;
        }
    };

    const renderLineContent = (line: string) => {
        return line.split('**').map((part, index) =>
            index % 2 === 1 ? <strong key={index} className="font-semibold text-slate-900">{part}</strong> : part
        );
    };

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
            if (!inList) flushList();
            inList = true;
            listItems.push(<li key={i}>{renderLineContent(trimmedLine.substring(2))}</li>);
        } else {
            flushList();
            if (trimmedLine.startsWith('## ')) {
                nodes.push(<h2 key={i} className="text-lg font-semibold text-slate-800 mt-4 mb-2">{renderLineContent(trimmedLine.substring(3))}</h2>);
            } else if (trimmedLine) {
                nodes.push(<p key={i} className="my-2">{renderLineContent(trimmedLine)}</p>);
            }
        }
    });

    flushList();
    return <>{nodes}</>;
};


// --- Modals ---

const ResponseDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  answer: Answer | undefined;
}> = ({ isOpen, onClose, question, answer }) => {
    if (!isOpen || !question) return null;

    const formattedValue = formatAnswerValueForDisplay(answer?.value);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Detalhes da Resposta</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" aria-label="Fechar modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </header>
                <main className="p-4 sm:p-6 overflow-y-auto space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pergunta ({question.id})</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{question.text}</p>
                        <p className="mt-2 text-xs font-mono text-slate-600 bg-slate-200 inline-block px-2 py-0.5 rounded">{question.reference}</p>
                    </div>

                    <div>
                         <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Resposta</h3>
                         <div className="p-4 bg-white rounded-lg border border-slate-200 min-h-[6rem]">
                            {isAnswerProvided(answer) ? (
                                <div className={`text-base ${formattedValue.color} whitespace-pre-wrap`}>
                                    {Array.isArray(answer?.value) ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {answer?.value.map(item => <li key={item}>{item}</li>)}
                                        </ul>
                                    ) : (
                                        formattedValue.text
                                    )}
                                </div>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma resposta foi fornecida.</p>
                            )}
                         </div>
                    </div>

                    <div>
                         <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Justificativa e Evidências</h3>
                         <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-4">
                            {answer?.evidence ? (
                                <p className="text-slate-700 whitespace-pre-wrap">{answer.evidence}</p>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma justificativa fornecida.</p>
                            )}
                            {answer?.attachment ? (
                                <a href={answer.attachment.content} download={answer.attachment.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm text-teal-700 bg-teal-50 border-2 border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-colors shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Baixar: {answer.attachment.name}
                                </a>
                            ) : (
                                <p className="text-slate-500 italic">Nenhum anexo fornecido.</p>
                            )}
                         </div>
                    </div>
                </main>
            </div>
        </div>
    );
};


const ReviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  answers: AnswersState;
}> = ({ isOpen, onClose, questions, answers }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-fade-in">
            <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <h2 className="text-2xl font-bold text-slate-800">Revisão de Deficiências</h2>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {/* Content for reviewing deficiencies would go here */}
            </main>
        </div>
    );
};


// --- Main Report Component ---

const Report: React.FC<ReportProps> = ({ reportData, topics, onBackToList, activeTab, onTabChange }) => {
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [preReport, setPreReport] = useState<string>('');
    const [isGeneratingPreReport, setIsGeneratingPreReport] = useState<boolean>(false);
    const [preReportError, setPreReportError] = useState<string | null>(null);


    const handleOpenReview = () => setReviewModalOpen(true);
    const handleCloseReview = () => setReviewModalOpen(false);

    const selectedQuestion = useMemo(() => 
        selectedQuestionId 
            ? reportData.allQuestions.find(q => q.id === selectedQuestionId) || null
            : null
    , [selectedQuestionId, reportData.allQuestions]);

    const selectedAnswer = selectedQuestion ? reportData.allAnswers[selectedQuestion.id] : undefined;

    const summaryData = useMemo(() => {
        const answered = reportData.answeredQuestions;
        const total = reportData.totalQuestions;
        const compliance = reportData.weightedCompliance;
        const deficiencies = reportData.deficiencies.length;

        return {
            answered,
            total,
            compliance,
            deficiencies
        };
    }, [reportData]);
    
    const answeredPercentage = summaryData.total > 0 ? (summaryData.answered / summaryData.total) * 100 : 0;

    const handleGeneratePreReport = useCallback(async () => {
        setIsGeneratingPreReport(true);
        setPreReport('');
        setPreReportError(null);

        try {
            const deficienciesList = reportData.deficiencies.length > 0
                ? reportData.deficiencies.map(q => `- ${q.text} (Ref: ${q.reference})`).join('\n')
                : 'Nenhuma deficiência específica (resposta "Falso") foi encontrada.';

            const topicComplianceList = reportData.topicCompliance
                .map(t => `- ${t.topic}: ${t.compliance.toFixed(1)}%`)
                .join('\n');

            const prompt = `
                Você é um consultor especialista em normas IFRS. Baseado nos dados de diagnóstico a seguir, elabore uma análise preliminar concisa e objetiva sobre a conformidade da empresa com as normas IFRS S1 e S2.

                **Dados do Diagnóstico:**
                - **Empresa:** ${reportData.companyName}
                - **Conformidade Geral Ponderada:** ${reportData.weightedCompliance.toFixed(1)}%
                - **Perguntas Respondidas:** ${reportData.answeredQuestions} de ${reportData.totalQuestions}
                - **Principais Deficiências (Perguntas respondidas com 'Falso'):**
                ${deficienciesList}
                - **Conformidade por Tópico:**
                ${topicComplianceList}

                **Instruções:**
                1.  **Sumário Executivo:** Inicie com um parágrafo que resume o estado geral da conformidade da empresa, destacando o nível de prontidão para as divulgações IFRS S1 e S2.
                2.  **Pontos Fortes:** Mencione 2-3 áreas onde a empresa demonstra maior conformidade, se houver.
                3.  **Pontos de Melhoria:** Identifique as 2-3 áreas mais críticas que necessitam de atenção, focando nos tópicos com menor conformidade ou deficiências importantes.
                4.  **Recomendações Iniciais:** Forneça uma lista (bullet points) de 3 a 5 recomendações práticas e de alto nível para a empresa começar a endereçar os pontos de melhoria.
                5.  **Próximos Passos:** Conclua com uma breve nota sobre os próximos passos sugeridos para aprofundar a análise e desenvolver um plano de ação completo.

                Use um tom profissional e direto. Formate a resposta usando markdown para clareza (títulos com '##' e listas com '*').
            `;
            
            const apiResponse = await fetch('/api/generate-pre-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || `API error: ${apiResponse.statusText}`);
            }

            const data = await apiResponse.json();
            setPreReport(data.text);

        } catch (error) {
            console.error("Erro ao gerar pré-relatório:", error);
            setPreReportError("Não foi possível gerar a análise. Verifique sua conexão ou a configuração do servidor e tente novamente.");
        } finally {
            setIsGeneratingPreReport(false);
        }
    }, [reportData]);

    const radarChartData = {
        labels: reportData.topicCompliance.map(t => t.topic),
        datasets: [{
            label: 'Conformidade por Tópico',
            data: reportData.topicCompliance.map(t => t.compliance),
            backgroundColor: 'rgba(20, 184, 166, 0.2)',
            borderColor: 'rgb(13, 148, 136)',
            pointBackgroundColor: 'rgb(13, 148, 136)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(13, 148, 136)',
            borderWidth: 2,
        }],
    };
    
    const radarChartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: '#cbd5e1' },
                grid: { color: '#e2e8f0' },
                pointLabels: {
                    font: { size: 12, weight: '500' },
                    color: '#475569'
                },
                ticks: {
                    backdropColor: 'rgba(255, 255, 255, 0.75)',
                    color: '#64748b',
                    stepSize: 25,
                    max: 100,
                    min: 0,
                    callback: (value: any) => value + '%',
                },
            },
        },
        plugins: { legend: { display: false } },
    };
    
    return (
        <div className="animate-fade-in pb-10">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Relatório de Diagnóstico</h1>
                    <p className="mt-1 text-slate-600">Empresa: <span className="font-semibold">{reportData.companyName}</span> | Gerado em: {new Date(reportData.generatedAt).toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={onBackToList} className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm">
                   Voltar para a lista
                </button>
            </header>

            <div className="border-b border-slate-200 mb-8">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => onTabChange('overview')}
                        className={`py-3 px-1 border-b-2 font-semibold text-base transition-colors ${
                            activeTab === 'overview'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => onTabChange('summary')}
                        className={`py-3 px-1 border-b-2 font-semibold text-base transition-colors ${
                            activeTab === 'summary'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Sumário de Respostas
                    </button>
                </nav>
            </div>
            
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 flex flex-col justify-center items-center text-center">
                            <DoughnutChart percentage={summaryData.compliance} label="Conformidade Geral" color="#0d9488" />
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 flex flex-col justify-center items-center text-center">
                            <DoughnutChart percentage={answeredPercentage} label="Respostas Concedidas" color="#0ea5e9" />
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 flex flex-col justify-center">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumo do Diagnóstico</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-600">Perguntas Respondidas</span>
                                    <span className="font-bold text-2xl text-slate-800">{summaryData.answered}<span className="text-base text-slate-500 font-medium">/{summaryData.total}</span></span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-600">Pontos de Melhoria</span>
                                    <span className="font-bold text-2xl text-red-600">{summaryData.deficiencies}</span>
                                </div>
                            </div>
                            <button onClick={handleOpenReview} className="mt-6 w-full px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:bg-slate-300" disabled={summaryData.deficiencies === 0}>
                                Revisar Pontos
                            </button>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 md:col-span-2 lg:col-span-3">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Conformidade por Tópico</h3>
                            <div className="w-full h-80">
                                <Radar data={radarChartData} options={radarChartOptions} />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 md:col-span-2 lg:col-span-3">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Análise Preliminar (IA)</h3>
                                <button 
                                    onClick={handleGeneratePreReport} 
                                    disabled={isGeneratingPreReport}
                                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-400 disabled:cursor-wait"
                                >
                                    {isGeneratingPreReport ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                                            Gerar Pré-Relatório
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            {isGeneratingPreReport && (
                                <div className="text-center py-8 text-slate-500">
                                    <p>Aguarde, a inteligência artificial está analisando os dados...</p>
                                    <p className="text-xs mt-1">Isso pode levar alguns segundos.</p>
                                </div>
                            )}

                            {preReportError && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                    {preReportError}
                                </div>
                            )}

                            {preReport && (
                                <div className="animate-fade-in p-4 bg-slate-50/70 rounded-lg border border-slate-200/80 text-sm text-slate-700 leading-relaxed">
                                   <SimpleMarkdownRenderer text={preReport} />
                                </div>
                            )}
                            
                            {!isGeneratingPreReport && !preReport && !preReportError && (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                                    <p className="text-slate-500 text-sm max-w-lg mx-auto">Clique em "Gerar Pré-Relatório" para obter um resumo executivo e recomendações iniciais com base nos dados do diagnóstico.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'summary' && (
                <div className="animate-fade-in">
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mt-2 border border-slate-200">
                        <div className="overflow-x-auto -mx-6 sm:-mx-8 px-6 sm:px-8">
                            <div className="align-middle inline-block min-w-full">
                                <table className="min-w-full border-collapse">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Código</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600 w-2/5">Elemento a Reportar</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Tipo</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Referência</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Resposta</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topics.map(topic => (
                                            <React.Fragment key={topic.name}>
                                                <tr className="bg-slate-100 border-t border-b border-slate-200">
                                                    <td colSpan={6} className="p-3 text-md font-bold text-slate-700">{topic.name}</td>
                                                </tr>
                                                {reportData.allQuestions.filter(q => q.topic === topic.name).map((question) => {
                                                    const answer = reportData.allAnswers[question.id];
                                                    return (
                                                        <tr key={question.id} className="border-b border-slate-200 transition-colors">
                                                            <td className="p-4 text-sm font-medium whitespace-nowrap text-slate-500">{question.id}</td>
                                                            <td className="p-4 text-sm text-slate-800">{question.text}</td>
                                                            <td className="p-4 text-sm whitespace-nowrap text-slate-600">{getQuestionTypeLabel(question.type)}</td>
                                                            <td className="p-4 text-sm font-mono whitespace-nowrap text-slate-600">{question.reference}</td>
                                                            <td className="p-4 text-sm">
                                                                {getSummaryAnswerText(question, answer)}
                                                            </td>
                                                            <td className="p-4 text-sm whitespace-nowrap">
                                                                <button 
                                                                    onClick={() => setSelectedQuestionId(question.id)} 
                                                                    className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                                    Detalhes
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <ResponseDetailModal 
                isOpen={!!selectedQuestion}
                onClose={() => setSelectedQuestionId(null)}
                question={selectedQuestion}
                answer={selectedAnswer}
            />

            <ReviewModal 
                isOpen={isReviewModalOpen} 
                onClose={handleCloseReview} 
                questions={reportData.deficiencies} 
                answers={reportData.allAnswers} 
            />
        </div>
    );
};

export default Report;