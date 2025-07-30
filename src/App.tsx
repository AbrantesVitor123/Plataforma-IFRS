import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Users,
  Target,
  GitMerge,
  FileCheck2,
  TrendingUp,
  ShieldAlert,
  Gauge,
  LucideProps,
} from 'lucide-react';

import MainSidebar from './components/MainSidebar';
import Questionnaire from './components/Questionnaire';
import Sidebar from './components/Sidebar';
import WelcomeScreen from './components/WelcomeScreen';
import Report from './components/Report';
import SavedReports from './components/SavedReports';
import QuestionnaireControls from './components/QuestionnaireControls';

import { ALL_QUESTIONS } from './constants/questions';
import type { AnswersState, Answer, Question, Topic, Diagnosis, ReportData, Folder, TopicCompliance, SubtopicCompliance, AnswerValue } from './types';


const TOPIC_ICONS: { [key: string]: React.FC<LucideProps> } = {
  'Requisitos Gerais': FileCheck2,
  'Governança': Users,
  'Estratégia': TrendingUp,
  'Gestão de Riscos': ShieldAlert,
  'Métricas e Metas': Gauge,
  'Fontes de Orientação e Conformidade': GitMerge,
};

const uniqueTopics = [...new Set(ALL_QUESTIONS.map(q => q.topic))];
const APP_TOPICS: Topic[] = uniqueTopics.map(topicName => ({
    name: topicName,
    icon: TOPIC_ICONS[topicName] || FileCheck2,
}));

const STORAGE_KEY = 'ifrs-diagnoses-storage-v4';

type View = 'diagnosis' | 'saved_reports';
type FilterStatus = 'all' | 'answered' | 'unanswered';

const getWeight = (question: Question): number => {
    switch (question.priority) {
        case 'imperative': return 3;
        case 'moderate': return 2;
        case 'non-priority': return 1;
        default: return 1;
    }
}

const isAnswerProvided = (answer: Answer | undefined): boolean => {
    if (!answer || answer.value === null || answer.value === undefined) return false;
    if (typeof answer.value === 'string') return answer.value.trim() !== '';
    if (Array.isArray(answer.value)) return answer.value.length > 0;
    // For booleans, being true or false is a provided answer
    if (typeof answer.value === 'boolean') return true;
    return false;
};

const App: React.FC = () => {
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [activeDiagnosisId, setActiveDiagnosisId] = useState<string | null>(null);
    const [view, setView] = useState<View>('saved_reports');
    const [isSending, setIsSending] = useState<boolean>(false);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeReportTab, setActiveReportTab] = useState<'overview' | 'summary'>('overview');

    const resetFilters = useCallback(() => {
        setFilterStatus('all');
        setSearchQuery('');
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const { diagnoses: savedDiagnoses, folders: savedFolders } = JSON.parse(saved);
                setDiagnoses(savedDiagnoses || []);
                setFolders(savedFolders || []);
            }
        } catch (e) {
            console.error("Failed to load data from storage", e);
            setDiagnoses([]);
            setFolders([]);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ diagnoses, folders }));
        } catch (e) {
            console.error("Failed to save data to storage", e);
        }
    }, [diagnoses, folders]);

    const activeDiagnosis = useMemo(() => {
        return diagnoses.find(d => d.id === activeDiagnosisId) || null;
    }, [diagnoses, activeDiagnosisId]);

    const handleNewDiagnosis = () => {
        setActiveDiagnosisId(null);
        setView('diagnosis');
        resetFilters();
    };

    const handleStart = (companyName: string) => {
        const newDiagnosis: Diagnosis = {
            id: new Date().toISOString(),
            companyName,
            answers: {},
            currentTopicName: APP_TOPICS[0].name,
            reportData: null,
            viewMode: 'questionnaire',
            lastUpdated: new Date().toISOString(),
            folderId: null,
        };
        setDiagnoses(prev => [...prev, newDiagnosis]);
        setActiveDiagnosisId(newDiagnosis.id);
        setView('diagnosis');
        resetFilters();
    };
    
    const handleLoadDiagnosis = (id: string) => {
        setActiveDiagnosisId(id);
        setView('diagnosis');
        resetFilters();
    };

    const handleDeleteDiagnosis = (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este diagnóstico? Esta ação não pode ser desfeita.")) {
            setDiagnoses(prev => prev.filter(d => d.id !== id));
            if(activeDiagnosisId === id) {
                setActiveDiagnosisId(null);
                setView('saved_reports');
            }
        }
    };
    
    const updateActiveDiagnosis = (update: Partial<Diagnosis> | ((d: Diagnosis) => Diagnosis)) => {
        setDiagnoses(prev => prev.map(d => {
            if (d.id === activeDiagnosisId) {
                const updated = typeof update === 'function' ? update(d) : { ...d, ...update };
                return { ...updated, lastUpdated: new Date().toISOString() };
            }
            return d;
        }));
    };
    
    const handleAnswer = useCallback((questionId: string, answer: Answer) => {
        updateActiveDiagnosis(d => ({
            ...d,
            answers: { ...d.answers, [questionId]: answer }
        }));
    }, [activeDiagnosisId]);

    const handleSelectTopic = (topicName: string) => {
        updateActiveDiagnosis({ currentTopicName: topicName });
    };

    const handleSendReport = async () => {
        if (!activeDiagnosis) return;
        setIsSending(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        const allQuestionsForCompliance = ALL_QUESTIONS;
        
        let totalPossibleScore = 0;
        let achievedScore = 0;
        
        const topicScores: { 
            [topic: string]: {
                achieved: number;
                possible: number;
                subtopics: {
                    [subtopic: string]: {
                        achieved: number;
                        possible: number;
                    }
                }
            }
        } = {};

        APP_TOPICS.forEach(t => {
            topicScores[t.name] = { achieved: 0, possible: 0, subtopics: {} };
        });

        allQuestionsForCompliance.forEach(q => {
            const weight = getWeight(q);
            const answer = activeDiagnosis.answers[q.id];

            if (!topicScores[q.topic].subtopics[q.subtopic]) {
                topicScores[q.topic].subtopics[q.subtopic] = { achieved: 0, possible: 0 };
            }
            
            totalPossibleScore += weight;
            topicScores[q.topic].possible += weight;
            topicScores[q.topic].subtopics[q.subtopic].possible += weight;

            let isCompliant = false;
            if (isAnswerProvided(answer)) {
                if (q.type === 'boolean') {
                    isCompliant = answer.value === true;
                } else {
                    isCompliant = true; // For other types, compliance is met if an answer is provided.
                }
            }

            if (isCompliant) {
                achievedScore += weight;
                topicScores[q.topic].achieved += weight;
                topicScores[q.topic].subtopics[q.subtopic].achieved += weight;
            }
        });

        const weightedCompliance = totalPossibleScore > 0 ? (achievedScore / totalPossibleScore) * 100 : 100;

        const topicCompliance: TopicCompliance[] = APP_TOPICS.map(t => {
            const topicData = topicScores[t.name];
            const subtopicsCompliance: SubtopicCompliance[] = Object.entries(topicData.subtopics)
                .map(([subtopicName, subtopicData]) => ({
                    name: subtopicName,
                    compliance: subtopicData.possible > 0 
                        ? (subtopicData.achieved / subtopicData.possible) * 100 
                        : 100,
                }))
                .sort((a, b) => a.compliance - b.compliance);

            return {
                topic: t.name,
                compliance: topicData.possible > 0 
                    ? (topicData.achieved / topicData.possible) * 100 
                    : 100,
                subtopics: subtopicsCompliance,
            };
        });

        const deficiencies = allQuestionsForCompliance.filter(q => {
            const answer = activeDiagnosis.answers[q.id];
            return q.type === 'boolean' && answer?.value === false;
        });
        const answeredCount = allQuestionsForCompliance.filter(q => isAnswerProvided(activeDiagnosis.answers[q.id])).length;

        const reportData: ReportData = {
            allQuestions: ALL_QUESTIONS,
            deficiencies,
            allAnswers: activeDiagnosis.answers,
            companyName: activeDiagnosis.companyName!,
            answeredQuestions: answeredCount,
            totalQuestions: allQuestionsForCompliance.length,
            generatedAt: new Date().toISOString(),
            weightedCompliance,
            topicCompliance,
        };
        
        updateActiveDiagnosis({ reportData, viewMode: 'report' });
        setActiveReportTab('overview');
        setIsSending(false);
    };
    
    const handleBackToList = () => {
        setActiveDiagnosisId(null);
        setView('saved_reports');
    };

    const handleCreateFolder = (name: string) => {
        if (name.trim() === '') return;
        const newFolder: Folder = {
            id: new Date().toISOString(),
            name: name.trim()
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const handleDeleteFolder = (folderId: string) => {
        const isFolderEmpty = !diagnoses.some(d => d.folderId === folderId);
        if (!isFolderEmpty) {
            alert("A pasta não está vazia. Mova ou exclua os relatórios para fora dela antes de excluir a pasta.");
            return;
        }
        if (window.confirm(`Tem certeza que deseja excluir a pasta?`)) {
            setFolders(prev => prev.filter(f => f.id !== folderId));
        }
    };

    const handleMoveDiagnosisToFolder = (diagnosisId: string, folderId: string | null) => {
        setDiagnoses(prev => prev.map(d => 
            d.id === diagnosisId ? { ...d, folderId, lastUpdated: new Date().toISOString() } : d
        ));
    };
    
    const filteredAndSearchedQuestions = useMemo(() => {
        if (!activeDiagnosis) return [];
        return ALL_QUESTIONS
            .filter(q => {
                if (filterStatus === 'answered') return isAnswerProvided(activeDiagnosis.answers[q.id]);
                if (filterStatus === 'unanswered') return !isAnswerProvided(activeDiagnosis.answers[q.id]);
                return true; // for 'all'
            })
            .filter(q => {
                const query = searchQuery.toLowerCase();
                if (!query) return true;
                return (
                    q.text.toLowerCase().includes(query) ||
                    q.subtopic.toLowerCase().includes(query) ||
                    q.reference.toLowerCase().includes(query)
                );
            });
    }, [activeDiagnosis, filterStatus, searchQuery]);
        
    const renderDiagnosisView = () => {
        if (!activeDiagnosis) {
            return <WelcomeScreen onStart={handleStart} />;
        }
        
        if (activeDiagnosis.viewMode === 'report' && activeDiagnosis.reportData) {
            return (
                <Report
                  reportData={activeDiagnosis.reportData}
                  topics={APP_TOPICS}
                  onBackToList={handleBackToList}
                  activeTab={activeReportTab}
                  onTabChange={setActiveReportTab}
                />
            );
        }
        
        const answeredQuestionsCount = ALL_QUESTIONS.filter(q => isAnswerProvided(activeDiagnosis.answers[q.id])).length;
        const progress = {
            answered: answeredQuestionsCount,
            total: ALL_QUESTIONS.length
        };
        
        const currentTopic = APP_TOPICS.find(t => t.name === activeDiagnosis.currentTopicName) || APP_TOPICS[0];
        const questionsForCurrentTopic = filteredAndSearchedQuestions.filter(q => q.topic === currentTopic.name);
        
        return (
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 text-2xl font-bold text-slate-800 pb-4 border-b border-slate-200">
                Diagnóstico IFRS <span className="font-light text-slate-500">| {activeDiagnosis.companyName}</span>
              </div>
              <div className="flex-shrink-0 mt-6">
                <QuestionnaireControls
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    resultsCount={ALL_QUESTIONS.length}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden mt-6">
                  <aside className="lg:col-span-1 h-full overflow-y-auto">
                      <Sidebar
                          topics={APP_TOPICS}
                          currentTopicName={activeDiagnosis.currentTopicName}
                          onSelectTopic={handleSelectTopic}
                          progress={progress}
                          onSendReport={handleSendReport}
                          isSending={isSending}
                      />
                  </aside>
                  <main className="lg:col-span-3 h-full overflow-y-auto pr-2">
                      <Questionnaire
                          topic={currentTopic}
                          questionsForTopic={questionsForCurrentTopic}
                          answers={activeDiagnosis.answers}
                          onAnswer={handleAnswer}
                      />
                  </main>
              </div>
            </div>
        );
    };

    return (
        <div className="h-screen max-h-screen flex bg-slate-50 text-slate-800">
            <MainSidebar
                currentView={view}
                onSetView={setView}
                onNewDiagnosis={handleNewDiagnosis}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {view === 'saved_reports' && (
                        <SavedReports 
                            diagnoses={diagnoses}
                            folders={folders}
                            onLoad={handleLoadDiagnosis}
                            onDelete={handleDeleteDiagnosis}
                            onNew={handleNewDiagnosis}
                            onCreateFolder={handleCreateFolder}
                            onDeleteFolder={handleDeleteFolder}
                            onMoveToFolder={handleMoveDiagnosisToFolder}
                        />
                    )}
                    {view === 'diagnosis' && renderDiagnosisView()}
                </main>
            </div>
        </div>
    );
};

export default App;