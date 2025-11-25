import React, { useState, useEffect } from 'react';
import { XIcon, CameraIcon } from './Icons';
import { Driver, DriverStatus, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingDriver?: Driver | null;
  lang: Language;
}

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSubmit, editingDriver, lang }) => {
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [telegram, setTelegram] = useState('');
  const [status, setStatus] = useState<DriverStatus>(DriverStatus.IDLE);
  
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (isOpen && editingDriver) {
      setName(editingDriver.name);
      setLicensePlate(editingDriver.licensePlate);
      setCarModel(editingDriver.carModel);
      setPhone(editingDriver.phone);
      setAvatar(editingDriver.avatar);
      setTelegram(editingDriver.telegram || '');
      setStatus(editingDriver.status);
    } else if (isOpen) {
      // Reset for new driver
      setName('');
      setLicensePlate('');
      setCarModel('');
      setPhone('');
      setAvatar(`https://picsum.photos/100/100?random=${Date.now()}`);
      setTelegram('');
      setStatus(DriverStatus.IDLE);
    }
  }, [isOpen, editingDriver]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: editingDriver?.id, // Pass ID if editing
      name,
      licensePlate,
      carModel,
      phone,
      avatar,
      telegram,
      status
    });
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900/50 px-6 py-5 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">
            {editingDriver ? t.editDriver : t.addDriver}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
               <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">{t.image}</label>
               <div className="relative group w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 cursor-pointer hover:border-blue-500 transition-colors shadow-lg">
                  <img src={avatar || 'https://via.placeholder.com/100'} alt="Preview" className="w-full h-full object-cover" />
                  
                  {/* Image Upload Overlay */}
                  <label htmlFor="driver-avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                    <CameraIcon className="w-8 h-8 text-white mb-1" />
                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">Upload</span>
                  </label>
                  <input 
                    id="driver-avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
               </div>
            </div>
            <div className="flex-1 space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.status}</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DriverStatus)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                  >
                    {Object.values(DriverStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
               </div>
               <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.imageUrl}</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white text-xs text-ellipsis text-slate-500"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.name}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-600"
                  placeholder="Ism Familiya"
                />
             </div>
             <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.telegram}</label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-600"
                  placeholder="@username"
                />
             </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.phone}</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-600"
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.model}</label>
              <input
                type="text"
                required
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-600"
                placeholder="Chevrolet Cobalt"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.plate}</label>
              <input
                type="text"
                required
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-600 uppercase"
                placeholder="01 A 777 AA"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-300 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
            >
              {editingDriver ? t.save : t.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverModal;