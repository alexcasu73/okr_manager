import React, { useState } from 'react';
import { Button } from './UIComponents';
import { ICONS } from '../constants';

interface CreateOKRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const CreateOKRModal: React.FC<CreateOKRModalProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    level: 'team',
    period: 'Q1 2026',
    keyResults: [{ description: '', target: '' }]
  });

  if (!isOpen) return null;

  const handleAddKR = () => {
    setFormData({
      ...formData,
      keyResults: [...formData.keyResults, { description: '', target: '' }]
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Create New Objective</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            {ICONS.Error} {/* Using as Close icon */}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objective Title</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                  placeholder="e.g., Increase brand awareness"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                   <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                   >
                     <option value="company">Company</option>
                     <option value="department">Department</option>
                     <option value="team">Team</option>
                     <option value="individual">Individual</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                   <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
                      value={formData.period}
                      onChange={e => setFormData({...formData, period: e.target.value})}
                   >
                     <option value="Q1 2026">Q1 2026</option>
                     <option value="Q2 2026">Q2 2026</option>
                     <option value="Annual 2026">Annual 2026</option>
                   </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm font-bold text-gray-900">Key Results</h3>
                 <button type="button" onClick={handleAddKR} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                   {ICONS.Plus} Add Result
                 </button>
              </div>
              
              {formData.keyResults.map((kr, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-2xl space-y-3 relative group">
                   <div>
                      <input 
                        type="text"
                        placeholder="Measureable outcome (e.g. 50 new leads)"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-black outline-none"
                        value={kr.description}
                        onChange={(e) => {
                          const newKRs = [...formData.keyResults];
                          newKRs[idx].description = e.target.value;
                          setFormData({...formData, keyResults: newKRs});
                        }}
                      />
                   </div>
                   <div className="flex gap-3">
                      <input 
                        type="text"
                        placeholder="Target Value"
                        className="w-1/3 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-black outline-none"
                      />
                       <select className="w-1/3 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                         <option>Number</option>
                         <option>%</option>
                         <option>$</option>
                       </select>
                   </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
             {step === 2 && (
               <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
             )}
             {step === 1 ? (
               <Button type="button" onClick={() => setStep(2)}>Next Step</Button>
             ) : (
               <Button type="submit">Create OKR</Button>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOKRModal;
