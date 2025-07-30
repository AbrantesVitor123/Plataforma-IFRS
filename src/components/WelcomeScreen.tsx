import React, { useState } from 'react';
import { WITT_OBRIENS_LOGO_URL } from '../constants/logo';

interface WelcomeScreenProps {
  onStart: (companyName: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');

  const handleStartClick = () => {
    if (name.trim()) {
      onStart(name.trim());
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && name.trim()) {
      handleStartClick();
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-xl p-8 sm:p-12 text-center border border-slate-200">
        <img 
          src={WITT_OBRIENS_LOGO_URL} 
          alt="Witt O'Brien's Logo" 
          className="mx-auto h-20 mb-6 rounded-md"
        />
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
          Diagnóstico IFRS S1 & S2
        </h1>
        <p className="mt-4 text-slate-600">
          Esta ferramenta irá guiá-lo através de uma avaliação de conformidade com as normas de divulgação de sustentabilidade da IFRS. Para começar, por favor, insira o nome da sua empresa.
        </p>
        <div className="mt-8">
          <label htmlFor="company-name" className="sr-only">
            Nome da Empresa
          </label>
          <input
            id="company-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o nome da sua empresa"
            className="w-full px-4 py-3 text-center border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            autoFocus
          />
        </div>
        <div className="mt-6">
          <button
            onClick={handleStartClick}
            disabled={!name.trim()}
            className="w-full px-8 py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            Iniciar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;