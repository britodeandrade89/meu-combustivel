import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// Mock Firebase Timestamp to remove external dependency and increase stability
class Timestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }

    static fromDate(date: Date): Timestamp {
        const seconds = Math.floor(date.getTime() / 1000);
        const nanoseconds = (date.getTime() % 1000) * 1000000;
        return new Timestamp(seconds, nanoseconds);
    }

    toDate(): Date {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }

    toMillis(): number {
        return this.seconds * 1000 + this.nanoseconds / 1000000;
    }
}


// =================================================================================
// TYPES
// =================================================================================

enum FuelType {
    ETHANOL = 'ETANOL',
    GASOLINE = 'GASOLINA',
}

interface RawFuelEntry {
    id: string;
    date: Timestamp;
    totalValue: number;
    pricePerLiter: number;
    kmEnd: number;
    fuelType: FuelType;
    notes: string;
}

interface ProcessedFuelEntry extends Omit<RawFuelEntry, 'date'> {
    date: Date;
    liters: number;
    kmStart: number;
    distance: number;
    avgKmpl: number;
}

interface MaintenanceData {
    oil: number;
    tires: number;
    engine: number;
}

// =================================================================================
// ICONS
// =================================================================================

const iconStyle: React.CSSProperties = { width: '1.25em', height: '1.25em', verticalAlign: 'middle' };

const PlusIcon = () => (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="plusGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <filter id="plusShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0.5" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.3"/>
            </filter>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#plusGradient)" filter="url(#plusShadow)"/>
        <path d="M12 7V17M7 12H17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const WrenchIcon = () => (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="wrenchGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>
             <filter id="wrenchShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0.5" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2"/>
            </filter>
        </defs>
        <path filter="url(#wrenchShadow)" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="url(#wrenchGradient)" stroke="#4b5563" strokeWidth="0.5"/>
    </svg>
);

const CalculatorIcon = () => (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="16" height="20" rx="3" fill="#374151" stroke="#4b5563" strokeWidth="0.5"/>
        <rect x="6" y="10" width="3" height="3" rx="1" fill="#4ade80"/>
        <rect x="10.5" y="10" width="3" height="3" rx="1" fill="#facc15"/>
        <rect x="15" y="10" width="3" height="3" rx="1" fill="#60a5fa"/>
        <rect x="6" y="15" width="3" height="3" rx="1" fill="#f87171"/>
        <rect x="10.5" y="15" width="7.5" height="3" rx="1" fill="#4ade80"/>
        <rect x="6" y="4" width="12" height="4" rx="1" fill="#111827"/>
    </svg>
);

const DollarSignIcon = () => (
     <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="dollarGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <filter id="dollarShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="1" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.4"/>
            </filter>
        </defs>
        <path filter="url(#dollarShadow)" d="M12 2.5V21.5M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="url(#dollarGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const UserIcon = () => (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="userGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
        </defs>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="url(#userGradient)" fillOpacity="0.3" stroke="url(#userGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="7" r="4" fill="url(#userGradient)" stroke="url(#userGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const GaugeIcon = () => (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
        </defs>
        <path d="M5.93 18.07A9 9 0 1 1 18.07 5.93" stroke="url(#gaugeGradient)" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="1.5" fill="#f3f4f6"/>
        <path d="M12 12 L16.5 7.5" stroke="#f3f4f6" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const RoadIcon = () => (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 21L11 3H13L16 21" fill="#4b5563" />
        <path d="M12 4V8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 11V15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 18V22" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

const CloseIcon = ({size = 24}: {size?: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" fill="#374151" fillOpacity="0.8"/>
        <path d="M16 8L8 16M8 8L16 16" stroke="#e5e7eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const SparklesIcon = () => (
    <svg style={{width: '1em', height: '1em'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="sparkleGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
        </defs>
        <path d="M12 2L9.5 7L4 8L9.5 9L12 14L14.5 9L20 8L14.5 7L12 2Z" fill="url(#sparkleGradient)"/>
        <path d="M5 16L6.5 19L9 19.5L6.5 20L5 23L3.5 20L1 19.5L3.5 19L5 16Z" fill="url(#sparkleGradient)" fillOpacity="0.7"/>
        <path d="M20 15L19 18L16 18.5L19 19L20 22L21 19L24 18.5L21 18L20 15Z" fill="url(#sparkleGradient)" fillOpacity="0.7"/>
    </svg>
);

const SearchIcon = () => (
    <svg style={{width: '1em', height: '1em'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="searchGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
        </defs>
        <circle cx="10.5" cy="10.5" r="7.5" fill="url(#searchGradient)" fillOpacity="0.3" stroke="url(#searchGradient)" strokeWidth="2"/>
        <path d="M16 16L21 21" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
);

const EditIcon = ({size = 20}: {size?: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="#a78bfa" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="spinnerGradient" x1="1" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#1f2937" stopOpacity="0" />
            </linearGradient>
        </defs>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#4b5563" strokeWidth="4"></circle>
        <path className="opacity-75" fill="url(#spinnerGradient)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
);

const ExportIcon = () => (
     <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3v12m-4-4l4 4 4-4" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 3H17" fill="#374151" stroke="#4b5563"/>
    </svg>
);

const FuelPumpIcon = ({ size = 64, className = '' }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <linearGradient id="pumpBodyGradient" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#22c55e"/>
                <stop offset="100%" stopColor="#15803d"/>
            </linearGradient>
            <linearGradient id="pumpHandleGradient" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#4b5563"/>
                <stop offset="100%" stopColor="#1f2937"/>
            </linearGradient>
            <filter id="pumpShadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/>
            </filter>
        </defs>
        <g filter="url(#pumpShadow)">
            {/* Main Body */}
            <path d="M12 8C12 5.79086 13.7909 4 16 4H36C38.2091 4 40 5.79086 40 8V44H48V48C48 50.2091 46.2091 52 44 52H20C17.7909 52 16 50.2091 16 48V44H12V8Z" fill="url(#pumpBodyGradient)"/>
            {/* Screen */}
            <rect x="16" y="10" width="20" height="12" rx="2" fill="#111827" stroke="#4b5563" strokeWidth="1"/>
             {/* Screen glare */}
            <path d="M17 10 L 26 22" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
            {/* Handle */}
            <path d="M40 28H54C55.1046 28 56 28.8954 56 30V38C56 39.1046 55.1046 40 54 40H40V28Z" fill="url(#pumpHandleGradient)"/>
            {/* Hose */}
            <path d="M56 34H60V48C60 51.3137 57.3137 54 54 54H50" stroke="#374151" strokeWidth="5" strokeLinecap="round"/>
        </g>
    </svg>
);


// =================================================================================
// SERVICES
// =================================================================================

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

const getAnalysisFromGemini = async (entries: ProcessedFuelEntry[], monthName: string): Promise<string> => {
    const dataSummary = entries.map(e => ({
        dia: e.date.getUTCDate(),
        gasto: e.totalValue.toFixed(2),
        media_km_l: e.avgKmpl.toFixed(1),
        combustivel: e.fuelType
    }));

    const systemInstruction = "Você é um assistente especialista em análise de dados automotivos e finanças pessoais. Sua tarefa é analisar os dados de abastecimento de um usuário para um mês específico e fornecer um resumo claro, conciso e útil em português do Brasil. Use um tom amigável e informativo. Formate sua resposta com parágrafos, listas e use a tag <strong> para destaques.";
    const userQuery = `Aqui estão os dados de abastecimento para ${monthName}:\n\n${JSON.stringify(dataSummary)}\n\nCom base nesses dados, gere uma análise que inclua:\n1. Um breve resumo geral do mês (gasto total, distância percorrida).\n2. O dia em que o gasto com combustível foi maior.\n3. A melhor e a pior média de consumo (km/L) registrada.\n4. Uma dica prática e personalizada para ajudar o usuário a economizar combustível, com base nos padrões observados.`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: userQuery,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Erro ao chamar a API Gemini para análise:", error);
        return "Desculpe, não foi possível completar a análise no momento. Verifique a configuração da API e tente novamente mais tarde.";
    }
};

const getTripEstimateFromGemini = async (distance: number, avgKmpl: number): Promise<string> => {
    const systemInstruction = "Você é um assistente de planejamento de viagens. Sua tarefa é calcular o custo de uma viagem de carro e fornecer dicas úteis. Assuma um preço médio de R$ 5,80 por litro de gasolina para o cálculo.";
    const userQuery = `Preciso estimar o custo de uma viagem de ${distance} km. O consumo médio do meu carro é de ${avgKmpl.toFixed(1)} km/L. Com base no preço médio de R$ 5,80 por litro de gasolina, calcule o custo total da viagem. Apresente o resultado de forma clara, incluindo o preço do combustível assumido, os litros necessários e o custo final. Adicione também 2 dicas para uma direção mais econômica durante a viagem. Use a tag <strong> para destaques.`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: userQuery,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Erro ao chamar a API Gemini para estimativa:", error);
        return "Desculpe, não foi possível completar a estimativa no momento. Verifique a configuração da API e tente novamente mais tarde.";
    }
};


// =================================================================================
// COMPONENTS
// =================================================================================

const LoginScreen: React.FC<{ onLogin: () => void; }> = ({ onLogin }) => {
    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-900 to-black text-white p-4 text-center animate-fade-in">
            <div className="mb-8 animate-slide-up-slow">
                <FuelPumpIcon size={80} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 animate-slide-up-slow" style={{ animationDelay: '100ms' }}>
                Meu Combustível
            </h1>
            <p className="text-lg text-gray-300 max-w-md mb-10 animate-slide-up-slow" style={{ animationDelay: '200ms' }}>
                Seu assistente inteligente para controle de gastos e manutenção veicular.
            </p>
            <button
                onClick={onLogin}
                className="w-full max-w-xs bg-white text-gray-900 font-bold py-4 px-6 rounded-xl shadow-2xl hover:bg-gray-200 transform hover:scale-105 transition-all duration-300 animate-slide-up-slow"
                style={{ animationDelay: '300ms' }}
            >
                Entrar
            </button>
            <div className="absolute bottom-6 text-center text-gray-300 text-sm animate-slide-up-slow" style={{ animationDelay: '400ms' }}>
                <p>Desenvolvido por André Brito</p>
                <p>Versão 1.0</p>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }

                @keyframes slide-up-slow {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up-slow {
                    animation: slide-up-slow 0.6s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
        </div>
    );
};

interface EntryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: ProcessedFuelEntry;
    onEdit: (entry: ProcessedFuelEntry) => void;
    onDelete: (id: string) => void;
}
const EntryDetailModal: React.FC<EntryDetailModalProps> = ({ isOpen, onClose, entry, onEdit, onDelete }) => {
    if (!isOpen) return null;

    const handleDelete = () => {
        if(window.confirm('Tem certeza que deseja excluir este registro?')) {
            onDelete(entry.id);
        }
    }

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-[var(--theme-card-bg)] text-gray-200 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 modal-content">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Detalhes do Registro</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon /></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-black/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Data do Abastecimento</p>
                        <p className="text-lg font-semibold">{entry.date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Valor Total</p>
                            <p className="text-lg font-semibold">R$ {entry.totalValue.toFixed(2)}</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Preço/Litro</p>
                            <p className="text-lg font-semibold">R$ {entry.pricePerLiter.toFixed(3)}</p>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Litros</p>
                            <p className="text-lg font-semibold">{entry.liters.toFixed(2)} L</p>
                        </div>
                         <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Combustível</p>
                            <p className="text-lg font-semibold capitalize">{entry.fuelType.toLowerCase()}</p>
                        </div>
                    </div>
                    <div className="bg-black/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Odômetro neste Abastecimento</p>
                        <p className="text-lg font-semibold">{entry.kmStart.toLocaleString('pt-BR')} km</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Distância Percorrida</p>
                            <p className="text-lg font-semibold">{entry.distance > 0 ? `${entry.distance.toFixed(0)} km` : 'Aguardando'}</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Média de Consumo</p>
                            <p className="text-lg font-semibold">{entry.avgKmpl > 0 ? `${entry.avgKmpl.toFixed(1)} km/L` : 'Aguardando'}</p>
                        </div>
                    </div>
                     {entry.notes && (
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Anotações</p>
                            <p className="text-lg">{entry.notes}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-4 gap-4">
                        <button onClick={() => onEdit(entry)} className="flex-1 flex items-center justify-center gap-2 border border-blue-500 text-blue-400 font-semibold py-2 px-4 rounded-lg hover:bg-blue-500/10 transition-colors">
                            <EditIcon size={18} /> Editar
                        </button>
                        <button onClick={handleDelete} className="flex-1 bg-red-800/80 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700/80 transition-colors">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface EntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: Omit<RawFuelEntry, 'id'> & { id?: string }) => void;
    entryToEdit: RawFuelEntry | null;
    lastKm: number;
}
const getTodayString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayWithOffset = new Date(today.getTime() - (offset*60*1000));
    return todayWithOffset.toISOString().split('T')[0];
}
const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onClose, onSave, entryToEdit, lastKm }) => {
    const [formData, setFormData] = useState({
        date: getTodayString(),
        totalValue: '',
        pricePerLiter: '',
        kmEnd: '',
        fuelType: FuelType.GASOLINE,
        notes: '',
    });

    useEffect(() => {
        if (isOpen) {
            if (entryToEdit) {
                const entryDate = entryToEdit.date.toDate();
                const offset = entryDate.getTimezoneOffset();
                const dateWithOffset = new Date(entryDate.getTime() - (offset*60*1000));

                setFormData({
                    date: dateWithOffset.toISOString().split('T')[0],
                    totalValue: String(entryToEdit.totalValue),
                    pricePerLiter: String(entryToEdit.pricePerLiter),
                    kmEnd: String(entryToEdit.kmEnd),
                    fuelType: entryToEdit.fuelType,
                    notes: entryToEdit.notes,
                });
            } else {
                 setFormData({
                    date: getTodayString(),
                    totalValue: '',
                    pricePerLiter: '',
                    kmEnd: lastKm > 0 ? '' : '',
                    fuelType: FuelType.GASOLINE,
                    notes: '',
                });
            }
        }
    }, [entryToEdit, isOpen, lastKm]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const entryData = {
            id: entryToEdit?.id,
            date: Timestamp.fromDate(new Date(formData.date + 'T00:00:00')),
            totalValue: parseFloat(formData.totalValue) || 0,
            pricePerLiter: parseFloat(formData.pricePerLiter) || 0,
            kmEnd: parseInt(formData.kmEnd) || 0,
            fuelType: formData.fuelType as FuelType,
            notes: formData.notes,
        };
        onSave(entryData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-[var(--theme-card-bg)] text-gray-200 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 modal-content">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">{entryToEdit ? 'Editar' : 'Adicionar'} Abastecimento</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-300">Data</label>
                        <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)]"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="totalValue" className="block text-sm font-medium text-gray-300">Valor Total (R$)</label>
                            <input type="number" step="0.01" name="totalValue" id="totalValue" value={formData.totalValue} onChange={handleChange} placeholder="150.00" required className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)]"/>
                        </div>
                        <div>
                            <label htmlFor="pricePerLiter" className="block text-sm font-medium text-gray-300">Preço/Litro (R$)</label>
                            <input type="number" step="0.001" name="pricePerLiter" id="pricePerLiter" value={formData.pricePerLiter} onChange={handleChange} placeholder="5.80" required className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)]"/>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="kmEnd" className="block text-sm font-medium text-gray-300">Odômetro (km)</label>
                        <input type="number" name="kmEnd" id="kmEnd" value={formData.kmEnd} onChange={handleChange} placeholder={lastKm > 0 ? `Ex: ${lastKm + 350}` : '123456'} required className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)]"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Tipo de Combustível</label>
                        <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)]">
                            <option value="GASOLINA">Gasolina</option>
                            <option value="ETANOL">Etanol</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Anotações</label>
                        <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={2} placeholder="Ex: Posto Ipiranga" className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)]"></textarea>
                    </div>
                    <div className="flex justify-end pt-2">
                         <button type="submit" className="w-full bg-gradient-to-br from-[var(--theme-gradient-start)] to-[var(--theme-gradient-end)] text-white font-semibold py-3 px-5 rounded-lg shadow-md hover:opacity-90 transition-all">
                           {entryToEdit ? 'Salvar Alterações' : 'Adicionar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: MaintenanceData) => void;
    currentMileage: number;
    initialData: MaintenanceData;
}
const MaintenanceStatus: React.FC<{currentMileage: number; maintenanceData: MaintenanceData}> = ({ currentMileage, maintenanceData }) => {
    const maintenanceItems = [
        { id: 'oil' as keyof MaintenanceData, name: 'Troca de Óleo', interval: 10000, warning: 9000 },
        { id: 'tires' as keyof MaintenanceData, name: 'Troca de Pneus', interval: 25000, warning: 24000 },
        { id: 'engine' as keyof MaintenanceData, name: 'Revisão do Motor', interval: 50000, warning: 48000 }
    ];

    const hasRecords = Object.values(maintenanceData).some(val => (val as number) > 0);

    if (!hasRecords) {
        return <p className="text-center text-gray-400">Registre a quilometragem da sua última manutenção para começar a monitorar.</p>;
    }
    
    return (
        <div className="space-y-4">
            {maintenanceItems.map(item => {
                const lastServiceKm = maintenanceData[item.id] || 0;
                if (lastServiceKm === 0) return null;

                const nextServiceKm = lastServiceKm + item.interval;
                const kmRemaining = nextServiceKm - currentMileage;

                let statusColor: 'green' | 'yellow' | 'red' = 'green';
                let statusText = `Faltam ${kmRemaining.toLocaleString('pt-BR')} km`;

                if (currentMileage >= nextServiceKm) {
                    statusColor = 'red';
                    statusText = `Vencido há ${Math.abs(kmRemaining).toLocaleString('pt-BR')} km`;
                } else if (currentMileage >= lastServiceKm + item.warning) {
                    statusColor = 'yellow';
                    statusText = `Atenção! Faltam ${kmRemaining.toLocaleString('pt-BR')} km`;
                }

                const colorClasses = {
                    green: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-700' },
                    yellow: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-700' },
                    red: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-700' }
                };
                const classes = colorClasses[statusColor];

                return (
                    <div key={item.id} className={`p-4 rounded-lg border ${classes.bg} ${classes.border}`}>
                        <h4 className={`font-bold text-md ${classes.text}`}>{item.name}</h4>
                        <div className={`text-sm ${classes.text} mt-2 grid grid-cols-2 gap-2`}>
                            <p><strong>Última:</strong> {lastServiceKm.toLocaleString('pt-BR')} km</p>
                            <p><strong>Próxima:</strong> {nextServiceKm.toLocaleString('pt-BR')} km</p>
                        </div>
                        <div className={`mt-3 text-center font-semibold ${classes.text} p-2 rounded`}>
                           {statusText}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onSave, currentMileage, initialData }) => {
    const [oil, setOil] = useState('');
    const [tires, setTires] = useState('');
    const [engine, setEngine] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle'|'saved'>('idle');

    useEffect(() => {
        if (isOpen) {
            setOil(initialData.oil > 0 ? String(initialData.oil) : '');
            setTires(initialData.tires > 0 ? String(initialData.tires) : '');
            setEngine(initialData.engine > 0 ? String(initialData.engine) : '');
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            oil: parseInt(oil) || 0,
            tires: parseInt(tires) || 0,
            engine: parseInt(engine) || 0,
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-[var(--theme-card-bg)] text-gray-200 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 modal-content overflow-y-auto max-h-[95vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Gerenciar Manutenção</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon /></button>
                </div>
                <div className="space-y-6">
                    <div className="text-center bg-black/30 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">Quilometragem Atual do Veículo</p>
                        <p className="text-3xl font-bold text-white">{currentMileage.toLocaleString('pt-BR')} km</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-white/10 rounded-lg">
                        <h3 className="font-semibold text-lg border-b border-white/10 pb-2 text-white">Registrar Última Manutenção</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="last-oil-change" className="block text-sm font-medium text-gray-300">Troca de Óleo (km)</label>
                                <input type="number" id="last-oil-change" value={oil} onChange={e => setOil(e.target.value)} placeholder="130000" className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label htmlFor="last-tire-change" className="block text-sm font-medium text-gray-300">Troca de Pneus (km)</label>
                                <input type="number" id="last-tire-change" value={tires} onChange={e => setTires(e.target.value)} placeholder="120000" className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label htmlFor="last-engine-revision" className="block text-sm font-medium text-gray-300">Revisão do Motor (km)</label>
                                <input type="number" id="last-engine-revision" value={engine} onChange={e => setEngine(e.target.value)} placeholder="100000" className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm"/>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="bg-gradient-to-br from-[var(--theme-gradient-start)] to-[var(--theme-gradient-end)] text-white font-semibold py-2 px-5 rounded-lg hover:opacity-90 transition-colors w-36">
                                {saveStatus === 'saved' ? 'Salvo!' : 'Salvar Registros'}
                            </button>
                        </div>
                    </form>
                    <div>
                        <h3 className="font-semibold text-lg border-b border-white/10 pb-2 mb-4 text-white">Status da Próxima Revisão</h3>
                        <MaintenanceStatus currentMileage={currentMileage} maintenanceData={initialData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface MonthSummaryProps {
    entries: ProcessedFuelEntry[];
    filterValue: string;
}
const MonthSummary: React.FC<MonthSummaryProps> = ({ entries, filterValue }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');

    const monthName = useMemo(() => {
        if (!filterValue || filterValue === 'all') return '';
        const [year, month] = filterValue.split('-');
        return new Date(Date.UTC(parseInt(year), parseInt(month) - 1))
            .toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });
    }, [filterValue]);
    
    const stats = useMemo(() => {
        const totalSpent = entries.reduce((acc, curr) => acc + curr.totalValue, 0);
        const totalDistance = entries.reduce((acc, curr) => acc + curr.distance, 0);
        const totalLiters = entries.reduce((acc, curr) => acc + curr.liters, 0);
        const averageKmpl = totalLiters > 0 ? totalDistance / totalLiters : 0;
        return { totalSpent, totalDistance, totalLiters, averageKmpl };
    }, [entries]);

    const handleAnalysisClick = async () => {
        setIsLoading(true);
        setAnalysisResult('');
        const analysis = await getAnalysisFromGemini(entries, monthName);
        setAnalysisResult(analysis);
        setIsLoading(false);
    };

    if (!filterValue || filterValue === 'all' || entries.length === 0) {
        return null;
    }

    return (
        <section className="mb-8">
            <div className="bg-[var(--theme-card-bg)] text-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-3xl font-bold capitalize">{monthName}</h3>
                <p className="text-gray-400 mb-6">Resumo do seu desempenho no mês.</p>
                <div className="grid grid-cols-2 gap-5 text-left">
                    <div className="bg-black/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Gasto Total</p>
                        <p className="text-2xl font-semibold">R$ {stats.totalSpent.toFixed(2)}</p>
                    </div>
                     <div className="bg-black/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Distância Total</p>
                        <p className="text-2xl font-semibold">{stats.totalDistance.toFixed(0)} km</p>
                    </div>
                     <div className="bg-black/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Litros</p>
                        <p className="text-2xl font-semibold">{stats.totalLiters.toFixed(2)} L</p>
                    </div>
                     <div className="bg-black/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Média Geral</p>
                        <p className="text-2xl font-semibold">{stats.averageKmpl.toFixed(1)} km/L</p>
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <button 
                        onClick={handleAnalysisClick} 
                        disabled={isLoading}
                        className="flex items-center justify-center w-full sm:w-auto sm:mx-auto gap-2 bg-gradient-to-br from-[var(--theme-gradient-start)] to-[var(--theme-gradient-end)] hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
                    >
                        {isLoading ? <LoadingSpinner /> : <SearchIcon />}
                        {isLoading ? 'Analisando...' : 'Analisar Mês com IA'}
                    </button>
                    {analysisResult && (
                        <div className="mt-4 text-sm text-left bg-black/20 p-4 rounded-lg w-full gemini-analysis" dangerouslySetInnerHTML={{ __html: analysisResult }}></div>
                    )}
                </div>
            </div>
        </section>
    );
};

interface TripModalProps {
    isOpen: boolean;
    onClose: () => void;
    overallAvgKmpl: number;
}
const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose, overallAvgKmpl }) => {
    const [distance, setDistance] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCalculate = async () => {
        const distNum = parseInt(distance);
        if (isNaN(distNum) || distNum <= 0) {
            setResult("<p>Por favor, insira uma distância válida.</p>");
            return;
        }

        setIsLoading(true);
        setResult('');
        const estimate = await getTripEstimateFromGemini(distNum, overallAvgKmpl);
        setResult(estimate);
        setIsLoading(false);
    };
    
    const handleClose = () => {
        setResult('');
        setDistance('');
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-[var(--theme-card-bg)] text-gray-200 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 modal-content">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Estimar Custo da Viagem</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white"><CloseIcon /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="trip-distance" className="block text-sm font-medium text-gray-300">Distância da Viagem (km)</label>
                        <input 
                            type="number" 
                            id="trip-distance" 
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            placeholder="Ex: 350" 
                            className="mt-1 block w-full bg-black/20 border-white/10 text-white rounded-md shadow-sm focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)]"
                        />
                    </div>
                    <button 
                        onClick={handleCalculate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-[var(--theme-gradient-start)] to-[var(--theme-gradient-end)] text-white font-semibold py-3 px-5 rounded-lg shadow-md hover:opacity-90 transition-all duration-300 disabled:opacity-50"
                    >
                       {isLoading ? <LoadingSpinner /> : <SparklesIcon />}
                       {isLoading ? 'Calculando...' : 'Calcular com IA'}
                    </button>
                    {result && (
                        <div className="mt-4 text-sm bg-black/20 p-4 rounded-lg gemini-analysis" dangerouslySetInnerHTML={{ __html: result }}></div>
                    )}
                </div>
            </div>
        </div>
    );
};


// =================================================================================
// MAIN APP COMPONENT
// =================================================================================

const StatsCard: React.FC<{ icon: React.ReactNode; label: string; value: string; }> = ({ icon, label, value }) => (
    <div className="stats-card bg-[var(--theme-card-bg)] p-4 rounded-xl flex items-center gap-4">
        <div className="bg-black/30 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const getInitialSeedData = (): RawFuelEntry[] => {
    return [
        { id: '1', date: Timestamp.fromDate(new Date('2024-04-12T00:00:00')), totalValue: 100.00, pricePerLiter: 6.19, kmEnd: 134620, fuelType: FuelType.GASOLINE, notes: 'Posto Shell' },
        { id: '2', date: Timestamp.fromDate(new Date('2024-04-14T00:00:00')), totalValue: 100.00, pricePerLiter: 6.19, kmEnd: 134843, fuelType: FuelType.GASOLINE, notes: '' },
        { id: '3', date: Timestamp.fromDate(new Date('2024-04-16T00:00:00')), totalValue: 50.00, pricePerLiter: 5.89, kmEnd: 134932, fuelType: FuelType.GASOLINE, notes: '' },
        { id: '4', date: Timestamp.fromDate(new Date('2024-05-22T00:00:00')), totalValue: 50.00, pricePerLiter: 6.19, kmEnd: 135010, fuelType: FuelType.GASOLINE, notes: 'Viagem' },
        { id: '5', date: Timestamp.fromDate(new Date('2024-05-29T00:00:00')), totalValue: 273.82, pricePerLiter: 5.75, kmEnd: 135193, fuelType: FuelType.GASOLINE, notes: '' }
    ];
};

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
    const [rawEntries, setRawEntries] = useState<RawFuelEntry[]>([]);
    const [maintenanceData, setMaintenanceData] = useState<MaintenanceData>({ oil: 0, tires: 0, engine: 0 });
    const [activeModal, setActiveModal] = useState<'entry' | 'trip' | 'maintenance' | 'detail' | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<ProcessedFuelEntry | null>(null);
    const [entryToEdit, setEntryToEdit] = useState<RawFuelEntry | null>(null);
    const [monthFilter, setMonthFilter] = useState<string>('all');
    
    const handleLogin = () => {
        localStorage.setItem('isLoggedIn', 'true');
        setIsLoggedIn(true);
    };

    useEffect(() => {
        if (!isLoggedIn) return;
        try {
            const storedEntries = localStorage.getItem('fuelEntries');
            if (storedEntries) {
                const parsed = JSON.parse(storedEntries).map((e: any) => ({
                    ...e,
                    date: new Timestamp(e.date.seconds, e.date.nanoseconds),
                }));
                setRawEntries(parsed);
            } else {
                setRawEntries(getInitialSeedData());
            }
            const storedMaintenance = localStorage.getItem('maintenanceData');
            if (storedMaintenance) setMaintenanceData(JSON.parse(storedMaintenance));
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            setRawEntries(getInitialSeedData());
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn) localStorage.setItem('fuelEntries', JSON.stringify(rawEntries));
    }, [rawEntries, isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn) localStorage.setItem('maintenanceData', JSON.stringify(maintenanceData));
    }, [maintenanceData, isLoggedIn]);

    const processedEntries = useMemo((): ProcessedFuelEntry[] => {
        const sorted = [...rawEntries].sort((a, b) => a.date.toMillis() - b.date.toMillis() || a.kmEnd - b.kmEnd);
        
        const calculatedEntries = sorted.map((currentEntry, index) => {
            const nextEntry = index < sorted.length - 1 ? sorted[index + 1] : null;
            const kmStart = currentEntry.kmEnd;
            const liters = currentEntry.pricePerLiter > 0 ? currentEntry.totalValue / currentEntry.pricePerLiter : 0;
            let distance = 0;
            let avgKmpl = 0;

            if (nextEntry) {
                const kmEndAtNextRefuel = nextEntry.kmEnd;
                if (kmEndAtNextRefuel > kmStart) {
                    distance = kmEndAtNextRefuel - kmStart;
                }
                if (distance > 0 && liters > 0) {
                    avgKmpl = distance / liters;
                }
            }
            
            return {
                ...currentEntry,
                date: currentEntry.date.toDate(),
                liters,
                kmStart,
                distance,
                avgKmpl,
            };
        });
        return calculatedEntries.reverse();
    }, [rawEntries]);
    
    const currentMileage = useMemo(() => {
        return rawEntries.length > 0 ? Math.max(...rawEntries.map(e => e.kmEnd)) : 0;
    }, [rawEntries]);

    const filteredEntries = useMemo(() => {
        if (monthFilter === 'all') return processedEntries;
        return processedEntries.filter(e => {
            const entryMonth = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`;
            return entryMonth === monthFilter;
        });
    }, [processedEntries, monthFilter]);

    const displayStats = useMemo(() => {
        const entriesToUse = monthFilter === 'all' ? processedEntries.filter(e => e.distance > 0) : filteredEntries.filter(e => e.distance > 0);
        const totalSpent = filteredEntries.reduce((sum, e) => sum + e.totalValue, 0);
        const totalDistance = entriesToUse.reduce((sum, e) => sum + e.distance, 0);
        const totalLiters = entriesToUse.reduce((sum, e) => sum + e.liters, 0);
        const averageKmpl = totalLiters > 0 ? totalDistance / totalLiters : 0;
        return { totalSpent, totalDistance, averageKmpl };
    }, [filteredEntries, processedEntries, monthFilter]);


    const availableMonths = useMemo(() => {
        const months = new Set(processedEntries.map(e => `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`));
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        months.add(currentMonth);
        return Array.from(months).sort((a: string, b: string) => b.localeCompare(a));
    }, [processedEntries]);
    
    const maintenanceReminders = useMemo(() => {
        const items = [
            { id: 'oil', name: 'Troca de Óleo', interval: 10000, warning: 1000 },
            { id: 'tires', name: 'Troca de Pneus', interval: 25000, warning: 1000 },
            { id: 'engine', name: 'Revisão do Motor', interval: 50000, warning: 2000 }
        ];

        if (!currentMileage) return [];

        return items.map(item => {
            const lastServiceKm = maintenanceData[item.id as keyof MaintenanceData] || 0;
            if (lastServiceKm === 0) return null;

            const nextServiceKm = lastServiceKm + item.interval;
            const kmRemaining = nextServiceKm - currentMileage;

            let status = 'ok';
            let message = '';

            if (currentMileage >= nextServiceKm) {
                status = 'overdue';
                message = `Vencido há ${Math.abs(kmRemaining).toLocaleString('pt-BR')} km`;
            } else if (currentMileage >= nextServiceKm - item.warning) {
                status = 'warning';
                message = `Faltam ${kmRemaining.toLocaleString('pt-BR')} km`;
            }

            return { ...item, status, message };
        }).filter((item): item is NonNullable<typeof item> => item !== null && item.status !== 'ok');

    }, [currentMileage, maintenanceData]);
    
    const handleCloseModal = useCallback(() => {
        setActiveModal(null);
        setSelectedEntry(null);
        setEntryToEdit(null);
    }, []);

    const handleSaveEntry = useCallback((entryData: Omit<RawFuelEntry, 'id'> & { id?: string }) => {
        setRawEntries(prev => {
            if (entryData.id) {
                return prev.map(e => e.id === entryData.id ? { ...e, ...entryData } as RawFuelEntry : e);
            }
            return [...prev, { ...entryData, id: Date.now().toString() } as RawFuelEntry];
        });
        handleCloseModal();
    }, [handleCloseModal]);

    const handleDeleteEntry = useCallback((id: string) => {
        setRawEntries(prev => prev.filter(e => e.id !== id));
        handleCloseModal();
    }, [handleCloseModal]);

    const handleSaveMaintenance = useCallback((data: MaintenanceData) => {
        setMaintenanceData(data);
    }, []);
    
    const handleExportCSV = useCallback(() => {
        if (rawEntries.length === 0) {
            alert("Não há dados para exportar.");
            return;
        }

        const headers = ['id', 'date', 'totalValue', 'pricePerLiter', 'kmEnd', 'fuelType', 'notes'];
        
        const formatDate = (timestamp: Timestamp) => {
            const date = timestamp.toDate();
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const sortedEntries = [...rawEntries].sort((a, b) => a.date.toMillis() - b.date.toMillis());

        const csvRows = [
            headers.join(','),
            ...sortedEntries.map(entry => {
                const sanitizedNotes = `"${(entry.notes || '').replace(/"/g, '""')}"`;
                const row = [
                    entry.id,
                    formatDate(entry.date),
                    entry.totalValue.toFixed(2),
                    entry.pricePerLiter.toFixed(3),
                    entry.kmEnd,
                    entry.fuelType,
                    sanitizedNotes,
                ];
                return row.join(',');
            })
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'meu_combustivel_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [rawEntries]);

    const handleSelectEntry = (entry: ProcessedFuelEntry) => {
        setSelectedEntry(entry);
        setActiveModal('detail');
    }
    
    const handleEditClick = (entry: ProcessedFuelEntry) => {
         const rawEntryToEdit = rawEntries.find(e => e.id === entry.id);
        if (rawEntryToEdit) {
            setEntryToEdit(rawEntryToEdit);
            setActiveModal('entry');
        }
    }
    
    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="bg-black text-gray-200 min-h-screen font-sans">
             <header className="bg-gradient-to-r from-green-600 to-black p-4 sticky top-0 z-30 shadow-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <FuelPumpIcon size={28} className="text-white" />
                        <h1 className="text-2xl font-bold text-white tracking-wider">MEU COMBUSTÍVEL</h1>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-full bg-black/25">
                        <UserIcon />
                    </div>
                </div>
            </header>
            
            <main className="max-w-4xl mx-auto p-4 pb-24">
                <section className="mb-6">
                    <div className="bg-gradient-to-r from-green-800/70 to-black/40 p-3 rounded-lg mb-4 shadow-md">
                        <h2 className="text-xl font-semibold text-white">Visão Geral</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <StatsCard icon={<RoadIcon />} label="KM Atual" value={currentMileage.toLocaleString('pt-BR')} />
                       <StatsCard icon={<DollarSignIcon />} label={`Gasto ${monthFilter === 'all' ? 'Total' : 'do Mês'}`} value={`R$ ${displayStats.totalSpent.toFixed(2)}`} />
                       <StatsCard icon={<GaugeIcon />} label={`Distância ${monthFilter === 'all' ? 'Total' : 'do Mês'}`} value={`${displayStats.totalDistance.toFixed(0)} km`} />
                       <StatsCard icon={<GaugeIcon />} label={`Média ${monthFilter === 'all' ? 'Geral' : 'do Mês'}`} value={`${displayStats.averageKmpl.toFixed(1)} km/L`} />
                    </div>
                </section>

                {maintenanceReminders.length > 0 && (
                    <section className="mb-8">
                        <div className="bg-gradient-to-r from-yellow-800/70 to-red-800/40 p-3 rounded-lg mb-4 shadow-md">
                            <h2 className="text-xl font-semibold text-white">Lembretes de Manutenção</h2>
                        </div>
                        <div className="space-y-3">
                            {maintenanceReminders.map(reminder => (
                                <button 
                                    key={reminder.id}
                                    onClick={() => setActiveModal('maintenance')}
                                    className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-transform hover:scale-[1.02] ${
                                        reminder.status === 'warning'
                                            ? 'bg-yellow-900/50 border border-yellow-700'
                                            : 'bg-red-900/50 border border-red-700'
                                    }`}
                                >
                                    <div className={`p-2 rounded-full ${
                                        reminder.status === 'warning' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                                    }`}>
                                    <WrenchIcon />
                                    </div>
                                    <div>
                                        <p className={`font-bold ${
                                            reminder.status === 'warning' ? 'text-yellow-300' : 'text-red-300'
                                        }`}>{reminder.name}</p>
                                        <p className="text-sm text-gray-200">{reminder.message}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
                
                <section className="mb-8">
                    <div className="bg-gradient-to-r from-green-800/70 to-black/40 p-3 rounded-lg mb-4 shadow-md">
                        <h2 className="text-xl font-semibold text-white">Ações Rápidas</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <button onClick={() => { setEntryToEdit(null); setActiveModal('entry'); }} className="flex items-center justify-center gap-3 bg-[var(--theme-card-bg)] hover:bg-gray-800/80 p-4 rounded-xl transition-colors text-center">
                            <PlusIcon /> <span className="font-semibold">Adicionar Abastecimento</span>
                        </button>
                        <button onClick={() => setActiveModal('trip')} className="flex items-center justify-center gap-3 bg-[var(--theme-card-bg)] hover:bg-gray-800/80 p-4 rounded-xl transition-colors text-center">
                            <CalculatorIcon /> <span className="font-semibold">Estimar Viagem</span>
                        </button>
                        <button onClick={() => setActiveModal('maintenance')} className="flex items-center justify-center gap-3 bg-[var(--theme-card-bg)] hover:bg-gray-800/80 p-4 rounded-xl transition-colors text-center">
                            <WrenchIcon /> <span className="font-semibold">Manutenção</span>
                        </button>
                        <button onClick={handleExportCSV} className="flex items-center justify-center gap-3 bg-[var(--theme-card-bg)] hover:bg-gray-800/80 p-4 rounded-xl transition-colors text-center">
                            <ExportIcon /> <span className="font-semibold">Exportar CSV</span>
                        </button>
                    </div>
                </section>

                <section>
                    <div className="flex justify-between items-center mb-4 bg-gradient-to-r from-green-800/70 to-black/40 p-3 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-white">Histórico de Abastecimentos</h2>
                        <select
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                        >
                            <option value="all">Todos os Meses</option>
                            {availableMonths.map(month => (
                                <option key={month} value={month}>{new Date(month + '-02T00:00:00').toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>
                            ))}
                        </select>
                    </div>

                    <MonthSummary entries={filteredEntries} filterValue={monthFilter} />

                    <div className="space-y-3">
                        {filteredEntries.length === 0 ? (
                             <div className="text-center text-gray-500 py-8 px-4 bg-[var(--theme-card-bg)] rounded-xl">
                                <h3 className="text-lg font-semibold text-white">Nenhum registro encontrado para este mês.</h3>
                                <p className="mt-2">Use o botão '+' para adicionar um abastecimento.</p>
                             </div>
                        ) : filteredEntries.map(entry => (
                            <div key={entry.id} className="bg-[var(--theme-card-bg)] p-4 rounded-xl flex items-center justify-between">
                                <div onClick={() => handleSelectEntry(entry)} className="flex items-center gap-4 cursor-pointer flex-grow">
                                    <div className="text-center w-16 p-2 rounded-lg bg-black/30">
                                        <p className="font-bold text-lg">{entry.date.getUTCDate()}</p>
                                        <p className="text-xs uppercase">{entry.date.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' })}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">R$ {entry.totalValue.toFixed(2)}</p>
                                        <p className="text-sm text-gray-400">{entry.distance > 0 ? `${entry.distance.toFixed(0)} km` : 'Aguardando próximo'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="text-right">
                                        <p className="font-semibold text-lg">{entry.avgKmpl > 0 ? `${entry.avgKmpl.toFixed(1)}` : '--'}<span className="text-xs text-gray-400"> km/L</span></p>
                                        <p className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.fuelType === 'ETANOL' ? 'bg-green-800/50 text-green-300' : 'bg-red-800/50 text-red-300'}`}>{entry.fuelType}</p>
                                    </div>
                                    <button onClick={() => handleEditClick(entry)} className="p-2 text-gray-400 hover:text-white">
                                        <EditIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            
            <footer className="max-w-4xl mx-auto p-4 text-center text-gray-500 text-xs">
                <p>Desenvolvido por André Brito</p>
                <p>Versão 1.0</p>
            </footer>

            {activeModal === 'entry' && (
                <EntryModal
                    isOpen={activeModal === 'entry'}
                    onClose={handleCloseModal}
                    onSave={handleSaveEntry}
                    entryToEdit={entryToEdit}
                    lastKm={currentMileage}
                />
            )}
            {activeModal === 'trip' && (
                <TripModal
                    isOpen={activeModal === 'trip'}
                    onClose={handleCloseModal}
                    overallAvgKmpl={displayStats.averageKmpl}
                />
            )}
            {activeModal === 'maintenance' && (
                <MaintenanceModal
                    isOpen={activeModal === 'maintenance'}
                    onClose={handleCloseModal}
                    onSave={handleSaveMaintenance}
                    currentMileage={currentMileage}
                    initialData={maintenanceData}
                />
            )}
            {selectedEntry && (
                <EntryDetailModal
                    isOpen={activeModal === 'detail'}
                    onClose={handleCloseModal}
                    entry={selectedEntry}
                    onDelete={handleDeleteEntry}
                    onEdit={handleEditClick}
                />
            )}
        </div>
    );
};


// =================================================================================
// RENDER THE APP
// =================================================================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);