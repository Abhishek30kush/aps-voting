import React, { useState } from 'react';
import { 
  CheckCircle2, Shield, Send, HelpCircle, ChevronRight, Check, Star 
} from 'lucide-react';
import type { Candidate, PositionType, CouncilType } from '../types';
import { POSITION_LABELS, JUNIOR_POSITIONS, SENIOR_POSITIONS } from '../types';

interface VotingBallotProps {
  council: CouncilType;
  voterName: string;
  candidates: Candidate[];
  onSubmitVote: (selections: Record<PositionType, string>) => void;
  isSubmitting?: boolean;
}

export const VotingBallot: React.FC<VotingBallotProps> = ({
  council,
  voterName,
  candidates,
  onSubmitVote,
  isSubmitting
}) => {
  const positionKeys = council === 'junior' ? JUNIOR_POSITIONS : SENIOR_POSITIONS;

  const [selections, setSelections] = useState<Record<PositionType, string>>({} as Record<PositionType, string>);
  const [activePosIndex, setActivePosIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const currentPosKey = positionKeys[activePosIndex];
  const currentPosInfo = POSITION_LABELS[currentPosKey];
  const currentCandidates = candidates.filter(c => c.position === currentPosKey && c.council === council);

  const selectedCount = Object.keys(selections).filter(k => positionKeys.includes(k as PositionType)).length;
  const isComplete = selectedCount === positionKeys.length;

  const handleSelectCandidate = (candidateId: string) => {
    setSelections(prev => ({
      ...prev,
      [currentPosKey]: candidateId
    }));
  };

  const getHouseBadge = (house: string) => {
    switch (house) {
      case 'Cariappa': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'Manekshaw': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'Thimayya': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Vaidya': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default: return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-24 animate-fade-in">
      
      {/* Top Banner Header */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 mb-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              council === 'junior' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {council === 'junior' ? 'Junior Council Ballot' : 'Senior Council Ballot'}
            </span>
            <span className="text-xs text-slate-400 font-mono">voter: {voterName}</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Army Public School Official Voting Ballot
          </h2>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex-1 md:flex-initial flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Voting Progress</div>
              <div className="text-sm font-bold text-amber-400 font-mono">
                {selectedCount} of {positionKeys.length} Selected
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center relative font-bold text-xs text-white">
              {Math.round((selectedCount / positionKeys.length) * 100)}%
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="24" cy="24" r="20"
                  fill="none" stroke="#eab308" strokeWidth="3"
                  strokeDasharray={125}
                  strokeDashoffset={125 - (125 * (selectedCount / positionKeys.length))}
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>

          <button
            onClick={() => setShowReviewModal(true)}
            disabled={selectedCount === 0}
            className={`py-3 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition ${
              isComplete
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:scale-[1.02] shadow-amber-500/20'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900'
            } disabled:opacity-40 disabled:pointer-events-none`}
          >
            <Send className="w-4 h-4" />
            <span>Review & Submit ({selectedCount}/{positionKeys.length})</span>
          </button>
        </div>
      </div>

      {/* Main Ballot Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Position Selector Sidebar */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 h-fit">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 px-2 flex items-center justify-between">
            <span>Positions ({positionKeys.length})</span>
            <span className="text-[10px] text-amber-400">Click to Select</span>
          </div>

          <div className="space-y-1.5">
            {positionKeys.map((posKey, idx) => {
              const posInfo = POSITION_LABELS[posKey];
              const isSelected = !!selections[posKey];
              const isActive = activePosIndex === idx;

              return (
                <button
                  key={posKey}
                  onClick={() => setActivePosIndex(idx)}
                  className={`w-full p-3 rounded-xl text-left transition flex items-center justify-between border ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold shadow-md'
                      : isSelected
                      ? 'bg-emerald-950/40 border-emerald-600/30 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                      isSelected 
                        ? 'bg-emerald-500 text-slate-950' 
                        : isActive 
                        ? 'bg-amber-500 text-slate-950' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{posInfo.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {isSelected ? 'Candidate Chosen' : 'Select Candidate'}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 transition ${isActive ? 'text-amber-400 translate-x-1' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Candidate Selection Grid */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                Position #{activePosIndex + 1} of {positionKeys.length}
              </div>
              <h3 className="text-xl font-bold text-white mt-0.5">
                {currentPosInfo?.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={activePosIndex === 0}
                onClick={() => setActivePosIndex(prev => Math.max(0, prev - 1))}
                className="px-3 py-1.5 bg-slate-800 text-xs font-bold text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={activePosIndex === positionKeys.length - 1}
                onClick={() => setActivePosIndex(prev => Math.min(positionKeys.length - 1, prev + 1))}
                className="px-3 py-1.5 bg-amber-500 text-xs font-bold text-slate-950 rounded-lg hover:bg-amber-400 disabled:opacity-40"
              >
                Next Position
              </button>
            </div>
          </div>

          {currentCandidates.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-white">No candidates nominated for this position yet.</p>
              <p className="text-xs mt-1 text-slate-500">You can skip or move to the next position.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentCandidates.map(candidate => {
                const isChosen = selections[currentPosKey] === candidate.id;

                return (
                  <div
                    key={candidate.id}
                    onClick={() => handleSelectCandidate(candidate.id)}
                    className={`relative cursor-pointer rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                      isChosen
                        ? 'bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/50 shadow-xl shadow-emerald-900/20 scale-[1.01]'
                        : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isChosen && (
                      <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>VOTED</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <img
                          src={candidate.photoUrl}
                          alt={candidate.name}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500/40 shadow-md"
                        />
                        <div>
                          <h4 className="text-base font-bold text-white leading-tight">
                            {candidate.name}
                          </h4>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Class {candidate.class}-{candidate.section}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getHouseBadge(candidate.house)}`}>
                              {candidate.house} House
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl mb-3">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Candidate Manifesto</span>
                        </div>
                        <p className="text-xs text-slate-300 italic">"{candidate.motto}"</p>
                      </div>

                      {candidate.achievements.length > 0 && (
                        <div className="space-y-1 mb-4">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Achievements:</div>
                          <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc list-inside">
                            {candidate.achievements.map((ach, i) => (
                              <li key={i} className="truncate">{ach}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        isChosen
                          ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isChosen ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Selected for {currentPosInfo?.title}</span>
                        </>
                      ) : (
                        <span>Select Candidate</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-amber-400" />
                  Review Your Ballots Before Submission
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm your choices. Once submitted, your vote is final and cannot be altered.
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-2 my-2">
              {positionKeys.map(posKey => {
                const posInfo = POSITION_LABELS[posKey];
                const selectedCandId = selections[posKey];
                const cand = candidates.find(c => c.id === selectedCandId);

                return (
                  <div
                    key={posKey}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {posInfo.title}
                      </div>
                      {cand ? (
                        <div className="flex items-center gap-3 mt-1">
                          <img src={cand.photoUrl} alt={cand.name} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="text-sm font-bold text-white">{cand.name}</div>
                            <div className="text-[10px] text-slate-400">Class {cand.class}-{cand.section} • {cand.house} House</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-red-400 italic mt-1">No candidate selected for this position</div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowReviewModal(false);
                        const posIdx = positionKeys.indexOf(posKey);
                        if (posIdx !== -1) setActivePosIndex(posIdx);
                      }}
                      className="text-xs text-amber-400 hover:underline font-semibold shrink-0"
                    >
                      Change
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Back to Edit
              </button>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  onSubmitVote(selections);
                }}
                disabled={isSubmitting}
                className="py-3.5 px-7 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 hover:scale-[1.02] transition"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>CONFIRM & SUBMIT FINAL BALLOT</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
