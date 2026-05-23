import re

with open('src/features/drivers/DriverProfilePage.tsx', 'r') as f:
    content = f.read()

start_str = "return (\n        <div className=\"max-w-3xl mx-auto"
end_str = "};\n"

start_idx = content.find(start_str)
end_idx = content.rfind(end_str)

new_return_block = """return (
        <div className="max-w-4xl mx-auto space-y-4 pb-16 px-4 sm:px-6 mt-6">
            
            {/* Minimal Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                <div className="flex items-center gap-4">
                    <DriverAvatar src={driver.avatar} name={driver.name} size={64} theme={theme} rounded="full" className="shadow-sm border" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className={`text-xl font-semibold tracking-tight ${txt}`}>{driver.name}</h1>
                            {isWorkingNow ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{t('active', 'Faol')}</span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">{t('inactive', 'Nofaol')}</span>
                            )}
                        </div>
                        <p className={`text-[14px] mt-0.5 ${muted}`}>
                            {driver.phone} {driver.telegram && `• ✈ ${driver.telegram}`}
                        </p>
                    </div>
                </div>

                {/* Admin Actions */}
                {userRole === 'admin' && (
                    <div className="flex items-center gap-2">
                        {!isWorkingNow && onRehireDriver && (
                            <button onClick={() => onRehireDriver(driver)} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                {t('rehireDriverAction', 'Qayta ishga olish')}
                            </button>
                        )}
                        <button onClick={() => onEditDriver?.(driver)} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-50 text-slate-600 border hover:bg-slate-100'}`}>
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (window.confirm(t('confirmDeleteDriver', "Rostdan ham bu haydovchini o'chirmoqchimisiz?"))) { onDeleteDriver?.(driver.id); navigate('/drivers'); } }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'}`}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Standard Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {profileMoneyCards.map((card, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                        <p className={`text-[12px] font-medium ${muted}`}>{card.label}</p>
                        <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${
                            'isDebt' in card && card.isDebt ? 'text-red-500' : 
                            'isExcess' in card && card.isExcess ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 
                            txt
                        }`}>
                            {card.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left Column: Activity & Car */}
                <div className="space-y-4">
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                        <div className={`px-4 py-3 border-b text-[13px] font-medium ${isDark ? 'border-white/10' : 'border-slate-100'} ${muted}`}>
                            {t('activityAndCar', 'Faoliyat va Avtomobil')}
                        </div>
                        
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                    <CarIcon className="w-5 h-5 opacity-60" />
                                </div>
                                <div>
                                    {isWorkingNow && car ? (
                                        <>
                                            <p className={`text-[14px] font-medium ${txt}`}>{car.name}</p>
                                            <p className={`text-[12px] mt-0.5 ${muted}`}>{car.licensePlate}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className={`text-[14px] font-medium ${txt}`}>{t('carNotAssigned', 'Avtomobil yo‘q')}</p>
                                            <p className={`text-[12px] mt-0.5 ${muted}`}>{t('noCarSubtitle', 'Biriktirilmagan')}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isWorkingNow && userRole === 'admin' && onQuickAssign && (
                                <button onClick={() => setAssignOpen(true)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                    {car ? t('quickAssignChange', 'Almashtirish') : t('assignCar', 'Biriktirish')}
                                </button>
                            )}
                        </div>
                        
                        <div className={`h-px mx-4 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`} />

                        <div className="p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                <span className="text-lg opacity-80">📅</span>
                            </div>
                            <div>
                                <p className={`text-[14px] font-medium ${txt}`}>
                                    {driver.startDate || driver.createdAt ? new Date(driver.startDate || driver.createdAt).toLocaleDateString('ru-RU') : t('unknown', "Noma'lum")}
                                    {driver.quitDate ? ` - ${new Date(driver.quitDate).toLocaleDateString('ru-RU')}` : ` - ${t('nowWorking', 'Hozir')}`}
                                </p>
                                <p className={`text-[12px] mt-0.5 ${muted}`}>
                                    {(() => {
                                        const start = driver.startDate || driver.createdAt || Date.now();
                                        const end = driver.quitDate || Date.now();
                                        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                                        if (diffDays <= 0) return `0 ${t('daysCount', 'kun')}`;
                                        const years = Math.floor(diffDays / 365);
                                        const months = Math.floor((diffDays % 365) / 30);
                                        return years > 0 ? `${years} yil ${months} oy` : `${months} oy ${diffDays % 30} kun`;
                                    })()}
                                </p>
                            </div>
                        </div>

                        <div className={`px-4 py-3 bg-opacity-50 border-t flex gap-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-100 bg-slate-50'}`}>
                            {dt === 'deposit' && userRole !== 'viewer' && onOpenDepositTopup && (
                                <button onClick={() => onOpenDepositTopup(driver.id)} className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white border text-slate-700 shadow-sm hover:bg-slate-50'}`}>
                                    + {t('topupDepositBtn', "Depozit to'ldirish")}
                                </button>
                            )}
                            <button onClick={() => setShowHistory(true)} className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${isDark ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                                {t('financialHistory', 'Moliya tarixi')} &rarr;
                            </button>
                        </div>
                    </div>

                    {(driver as any).notes && (
                        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                            <div className={`px-4 py-3 border-b text-[13px] font-medium ${isDark ? 'border-white/10' : 'border-slate-100'} ${muted}`}>
                                {t('notes', 'Izohlar')}
                            </div>
                            <div className="p-4">
                                <p className={`text-[14px] leading-relaxed whitespace-pre-wrap ${txt}`}>{(driver as any).notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Documents */}
                <div className="space-y-4">
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                        <div className={`px-4 py-3 border-b text-[13px] font-medium ${isDark ? 'border-white/10' : 'border-slate-100'} ${muted}`}>
                            {t('documents', 'Hujjatlar')}
                        </div>

                        {/* License Reminder Row */}
                        <div className={`p-4 flex items-center justify-between transition-all ${userRole === 'admin' ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`} onClick={openLicenseModal}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${driverLicenseStatus === 'missing' ? (isDark ? 'bg-white/5' : 'bg-slate-100') : (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}`}>
                                    <span className="text-lg opacity-80">🪪</span>
                                </div>
                                <div>
                                    <p className={`text-[14px] font-medium ${txt}`}>{t('driverLicenseCardTitle', 'Ishonchnoma')}</p>
                                    <p className={`text-[12px] mt-0.5 ${driverLicenseStatus === 'missing' ? muted : (isDark ? 'text-emerald-400/80' : 'text-emerald-600')}`}>
                                        {driverLicenseStatus === 'missing' ? t('driverLicenseReminderMissing', 'Eslatma yo‘q') : formatDriverDocDate(driverLicenseReminderAt)}
                                    </p>
                                </div>
                            </div>
                            {userRole === 'admin' && <ChevronLeftIcon className={`w-4 h-4 rotate-180 opacity-40 ${txt}`} />}
                        </div>

                        {groupedDocs.length > 0 && <div className={`h-px mx-4 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`} />}

                        {/* Other Documents */}
                        {groupedDocs.map((group, idx) => (
                            <React.Fragment key={group.key}>
                                {idx > 0 && <div className={`h-px mx-4 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`} />}
                                <div className={`p-4 flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                            <span className="text-lg opacity-80">📁</span>
                                        </div>
                                        <div>
                                            <p className={`text-[14px] font-medium ${txt}`}>{group.title}</p>
                                            <p className={`text-[12px] mt-0.5 ${muted}`}>{group.docs.length} {t('driverModalFileCount', 'fayl')}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        const doc = group.docs[0];
                                        if (doc.type?.startsWith('image/')) setViewingDoc({ name: doc.name, data: doc.data });
                                        else window.open(doc.data, '_blank');
                                    }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </React.Fragment>
                        ))}

                        {!docsLoading && groupedDocs.length === 0 && (
                            <div className={`p-4 text-center border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                                <p className={`text-[12px] ${muted}`}>{t('noDocuments', 'Boshqa hujjatlar yo‘q')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals remain structurally the same */}
            {viewingDoc && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={() => setViewingDoc(null)}>
                    <div className={`relative w-full max-w-[760px] max-h-[calc(100dvh-32px)] sm:max-h-[calc(100dvh-48px)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col ${isDark ? 'bg-[#151a23] border border-white/10' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-between gap-3 p-5 ${isDark ? 'bg-[#151a23]' : 'bg-white'}`}>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-[16px] leading-tight ${txt}`}>{t('viewDocument', "Hujjatni ko'rish")}</h3>
                                <p className={`text-[12px] truncate ${muted}`}>{viewingDoc.name || t('file', 'Fayl')}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => forceDownload(viewingDoc.data, viewingDoc.name)} className={`w-10 h-10 flex items-center justify-center rounded-[16px] border transition-colors ${isDark ? 'border-white/10 text-white/70 hover:bg-white/20' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}><DownloadIcon className="w-4 h-4" /></button>
                                <button onClick={() => setViewingDoc(null)} className={`w-10 h-10 flex items-center justify-center rounded-[16px] border transition-colors ${isDark ? 'border-white/10 text-white/70 hover:bg-white/20' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}><XIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className={`flex-1 min-h-0 p-6 overflow-auto flex items-center justify-center ${isDark ? 'bg-black/40' : 'bg-slate-50'}`}>
                            <img src={viewingDoc.data} alt={viewingDoc.name} className="w-full max-w-[620px] rounded-2xl shadow-sm object-contain max-h-[calc(100dvh-200px)]" />
                        </div>
                    </div>
                </div>, document.body
            )}

            {showHistory && <DriverHistoryPage driver={driver} car={car} cars={cars} transactions={transactions} theme={theme} onClose={() => setShowHistory(false)} />}
            {onQuickAssign && <QuickAssignmentModal isOpen={assignOpen} mode="driver" driver={driver} car={car} drivers={drivers} cars={cars} theme={theme} onClose={() => setAssignOpen(false)} onSave={onQuickAssign} />}
            {licenseModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[330] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" onMouseDown={() => setLicenseModalOpen(false)}>
                    <div className={`w-full max-w-md rounded-[32px] border shadow-2xl overflow-hidden ${isDark ? 'bg-[#151f32] border-white/10' : 'bg-white border-slate-200'}`} onMouseDown={e => e.stopPropagation()}>
                        <div className={`px-6 py-5 border-b ${isDark ? 'border-white/5' : 'border-slate-100'} flex items-start justify-between gap-4`}>
                            <div>
                                <h2 className={`text-[20px] font-black ${txt}`}>{t('driverLicenseReminderTitle', 'Ishonchnoma eslatmasi')}</h2>
                                <p className={`mt-1 text-[13px] ${muted}`}>{t('driverLicenseReminderSubtitle', 'Eslatma kunini tanlang.')}</p>
                            </div>
                            <button onClick={() => setLicenseModalOpen(false)} className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5 text-white/70 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <DatePicker label={t('driverLicenseReminderDate', 'Eslatma kuni')} value={licenseReminderDateDraft} onChange={(d: Date | null) => setLicenseReminderDateDraft(d)} placeholder={t('driverLicenseReminderDatePlaceholder', 'Kunni tanlang')} isClearable theme={theme} />
                            {licenseError && <p className="text-sm font-bold text-red-500">{licenseError}</p>}
                        </div>
                        <div className={`px-6 py-5 border-t ${isDark ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50'} flex justify-between gap-3`}>
                            <button onClick={() => setLicenseReminderDateDraft(null)} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold ${isDark ? 'text-white/70 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'}`}>{t('clear', 'Tozalash')}</button>
                            <div className="flex gap-3">
                                <button onClick={() => setLicenseModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold ${isDark ? 'text-white/70 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'}`}>{t('cancel', 'Bekor qilish')}</button>
                                <button disabled={licenseSaving} onClick={saveIshonchnomaReminder} className="px-6 py-2.5 rounded-xl text-[13px] font-black bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{licenseSaving ? t('saving', 'Saqlanmoqda...') : t('save', 'Saqlash')}</button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );\n"""

content = content[:start_idx] + new_return_block + "\n};\n"

with open('src/features/drivers/DriverProfilePage.tsx', 'w') as f:
    f.write(content)

print("Rewrite successful")
