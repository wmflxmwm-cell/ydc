import React, { useState, useEffect } from 'react';
import { Settings, Building2, Package, Plus, Trash2, Save, Cog } from 'lucide-react';
import { settingsService, Customer, Material, PostProcessing } from '../src/api/services/settingsService';
import { getTranslations } from '../src/utils/translations';

const SettingsManagement: React.FC = () => {
    const t = getTranslations();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // 고객사 추가 폼
    const [newCustomerName, setNewCustomerName] = useState('');
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    
    // 재질 추가 폼
    const [newMaterialName, setNewMaterialName] = useState('');
    const [newMaterialCode, setNewMaterialCode] = useState('');
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);
    
    // 후공정 추가 폼
    const [newPostProcessingName, setNewPostProcessingName] = useState('');
    const [newPostProcessingDesc, setNewPostProcessingDesc] = useState('');
    const [isAddingPostProcessing, setIsAddingPostProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [customersData, materialsData, postProcessingsData] = await Promise.all([
                settingsService.getCustomers(),
                settingsService.getMaterials(),
                settingsService.getPostProcessings()
            ]);
            setCustomers(customersData);
            setMaterials(materialsData);
            setPostProcessings(postProcessingsData);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            alert('설정 데이터를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName.trim()) {
            alert('고객사명을 입력하세요.');
            return;
        }

        setIsAddingCustomer(true);
        try {
            const newCustomer = await settingsService.addCustomer(newCustomerName.trim());
            setCustomers([...customers, newCustomer]);
            setNewCustomerName('');
            setIsAddingCustomer(false);
        } catch (error: any) {
            alert(error.response?.data?.message || '고객사 추가에 실패했습니다.');
            setIsAddingCustomer(false);
        }
    };

    const handleDeleteCustomer = async (id: string) => {
        if (!confirm('이 고객사를 삭제하시겠습니까?')) return;

        try {
            await settingsService.deleteCustomer(id);
            setCustomers(customers.filter(c => c.id !== id));
        } catch (error) {
            alert('고객사 삭제에 실패했습니다.');
        }
    };

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMaterialName.trim() || !newMaterialCode.trim()) {
            alert('재질명과 코드를 모두 입력하세요.');
            return;
        }

        setIsAddingMaterial(true);
        try {
            const newMaterial = await settingsService.addMaterial(
                newMaterialName.trim(),
                newMaterialCode.trim().toUpperCase()
            );
            setMaterials([...materials, newMaterial]);
            setNewMaterialName('');
            setNewMaterialCode('');
            setIsAddingMaterial(false);
        } catch (error: any) {
            alert(error.response?.data?.message || '재질 추가에 실패했습니다.');
            setIsAddingMaterial(false);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm('이 재질을 삭제하시겠습니까?')) return;

        try {
            await settingsService.deleteMaterial(id);
            setMaterials(materials.filter(m => m.id !== id));
        } catch (error) {
            alert('재질 삭제에 실패했습니다.');
        }
    };

    const handleAddPostProcessing = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostProcessingName.trim()) {
            alert('후공정명을 입력하세요.');
            return;
        }

        setIsAddingPostProcessing(true);
        try {
            const newPostProcessing = await settingsService.addPostProcessing(
                newPostProcessingName.trim(),
                newPostProcessingDesc.trim() || undefined
            );
            setPostProcessings([...postProcessings, newPostProcessing]);
            setNewPostProcessingName('');
            setNewPostProcessingDesc('');
            setIsAddingPostProcessing(false);
        } catch (error: any) {
            alert(error.response?.data?.message || '후공정 추가에 실패했습니다.');
            setIsAddingPostProcessing(false);
        }
    };

    const handleDeletePostProcessing = async (id: string) => {
        if (!confirm('이 후공정을 삭제하시겠습니까?')) return;

        try {
            await settingsService.deletePostProcessing(id);
            setPostProcessings(postProcessings.filter(p => p.id !== id));
        } catch (error) {
            alert('후공정 삭제에 실패했습니다.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 p-3 rounded-xl">
                    <Settings className="text-indigo-600" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900">{t.settingsManagement.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t.settingsManagement.subtitle}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 고객사 관리 */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-900 px-6 py-4 flex items-center gap-3 text-white">
                        <Building2 size={20} />
                        <h3 className="text-lg font-bold">{t.settingsManagement.customers}</h3>
                    </div>
                    
                    <div className="p-6">
                        {/* 고객사 추가 폼 */}
                        <form onSubmit={handleAddCustomer} className="mb-6 pb-6 border-b border-slate-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    placeholder={t.settingsManagement.addCustomer}
                                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    disabled={isAddingCustomer}
                                />
                                <button
                                    type="submit"
                                    disabled={isAddingCustomer || !newCustomerName.trim()}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isAddingCustomer ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            {t.settingsManagement.adding}
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            {t.settingsManagement.add}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* 고객사 목록 */}
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <p>{t.settingsManagement.loading}</p>
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-sm">{t.settingsManagement.noCustomers}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {customers.map((customer) => (
                                    <div
                                        key={customer.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                                    >
                                        <span className="font-bold text-slate-900">{customer.name}</span>
                                        <button
                                            onClick={() => handleDeleteCustomer(customer.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 재질 관리 */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-900 px-6 py-4 flex items-center gap-3 text-white">
                        <Package size={20} />
                        <h3 className="text-lg font-bold">{t.settingsManagement.materials}</h3>
                    </div>
                    
                    <div className="p-6">
                        {/* 재질 추가 폼 */}
                        <form onSubmit={handleAddMaterial} className="mb-6 pb-6 border-b border-slate-200 space-y-2">
                            <input
                                type="text"
                                value={newMaterialName}
                                onChange={(e) => setNewMaterialName(e.target.value)}
                                placeholder={t.settingsManagement.materialName}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                disabled={isAddingMaterial}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMaterialCode}
                                    onChange={(e) => setNewMaterialCode(e.target.value)}
                                    placeholder={t.settingsManagement.materialCode}
                                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm uppercase"
                                    disabled={isAddingMaterial}
                                />
                                <button
                                    type="submit"
                                    disabled={isAddingMaterial || !newMaterialName.trim() || !newMaterialCode.trim()}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isAddingMaterial ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            {t.settingsManagement.adding}
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            {t.settingsManagement.add}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* 재질 목록 */}
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <p>{t.settingsManagement.loading}</p>
                            </div>
                        ) : materials.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-sm">{t.settingsManagement.noMaterials}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {materials.map((material) => (
                                    <div
                                        key={material.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">{material.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{material.code}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMaterial(material.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 후공정 관리 */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-900 px-6 py-4 flex items-center gap-3 text-white">
                        <Cog size={20} />
                        <h3 className="text-lg font-bold">{t.settingsManagement.postProcessings}</h3>
                    </div>
                    
                    <div className="p-6">
                        {/* 후공정 추가 폼 */}
                        <form onSubmit={handleAddPostProcessing} className="mb-6 pb-6 border-b border-slate-200 space-y-2">
                            <input
                                type="text"
                                value={newPostProcessingName}
                                onChange={(e) => setNewPostProcessingName(e.target.value)}
                                placeholder={t.settingsManagement.postProcessingName}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                disabled={isAddingPostProcessing}
                            />
                            <input
                                type="text"
                                value={newPostProcessingDesc}
                                onChange={(e) => setNewPostProcessingDesc(e.target.value)}
                                placeholder={t.settingsManagement.postProcessingDescription}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                disabled={isAddingPostProcessing}
                            />
                            <button
                                type="submit"
                                disabled={isAddingPostProcessing || !newPostProcessingName.trim()}
                                className="w-full px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAddingPostProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {t.settingsManagement.adding}
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        {t.settingsManagement.add}
                                    </>
                                )}
                            </button>
                        </form>

                        {/* 후공정 목록 */}
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <p>{t.settingsManagement.loading}</p>
                            </div>
                        ) : postProcessings.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-sm">{t.settingsManagement.noPostProcessings}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {postProcessings.map((postProcessing) => (
                                    <div
                                        key={postProcessing.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900">{postProcessing.name}</p>
                                            {postProcessing.description && (
                                                <p className="text-xs text-slate-500 truncate">{postProcessing.description}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeletePostProcessing(postProcessing.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ml-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsManagement;

